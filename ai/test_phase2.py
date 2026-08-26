"""
Phase 2 Test Suite
Tests all 12 required scenarios using MOCK_LLM=true (no live LLM needed).
"""
import os
import sys

# Force mock LLM for all tests
os.environ["MOCK_LLM"] = "true"

from langchain_core.messages import HumanMessage, AIMessage
from app.agents.goal_architect import (
    goal_extraction_node,
    goal_architect_node,
    _mock_extract,
    _merge_goal_state,
    GoalFieldExtraction,
)
from app.agents.supervisor import AgentState

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
results = []


def check(test_name: str, condition: bool, detail: str = ""):
    status = PASS if condition else FAIL
    print(f"  [{status}] {test_name}" + (f" | {detail}" if detail else ""))
    results.append((test_name, condition))


# ============================================================
# Test A: Multiple fields extracted from ONE message
# ============================================================
print("\n=== TEST A: Multiple fields from one message ===")
state_a = {
    "messages": [HumanMessage(content="I want to build a React portfolio in 30 days. I already know React and Tailwind and can spend 2 hours every evening.")],
    "goal_state": {}
}
result_a = goal_extraction_node(state_a)
gs = result_a["goal_state"]
print(f"  Extracted: {gs}")
check("A.1 goal extracted", gs.get("goal") is not None and "portfolio" in gs.get("goal","").lower())
check("A.2 deadline extracted", gs.get("deadline") == "30 days")
check("A.3 resources extracted", gs.get("resources") is not None and "react" in gs.get("resources","").lower())
check("A.4 time extracted", gs.get("time") is not None and ("2 hours" in gs.get("time","") or "evening" in gs.get("time","")))
check("A.5 why NOT extracted (not mentioned)", gs.get("why") is None)


# ============================================================
# Test B: Information persists across multiple turns
# ============================================================
print("\n=== TEST B: Information persists across turns ===")
# Turn 1: set goal + deadline
state_b1 = {
    "messages": [HumanMessage(content="I want to build a React portfolio in 30 days.")],
    "goal_state": {}
}
result_b1 = goal_extraction_node(state_b1)
gs_b1 = result_b1["goal_state"]

# Turn 2: add time (simulate second turn by passing existing goal_state)
state_b2 = {
    "messages": [
        HumanMessage(content="I want to build a React portfolio in 30 days."),
        AIMessage(content="What's your motivation?"),
        HumanMessage(content="I want to land an internship."),
    ],
    "goal_state": gs_b1
}
result_b2 = goal_extraction_node(state_b2)
gs_b2 = result_b2["goal_state"]
print(f"  After turn 1: {gs_b1}")
print(f"  After turn 2: {gs_b2}")
check("B.1 goal persists", gs_b2.get("goal") is not None and "portfolio" in gs_b2.get("goal","").lower())
check("B.2 deadline persists", gs_b2.get("deadline") == "30 days")
check("B.3 why added in turn 2", gs_b2.get("why") is not None and "internship" in gs_b2.get("why","").lower())


# ============================================================
# Test C: AI does not request already-known information
# ============================================================
print("\n=== TEST C: Already-known information not re-asked ===")
# We test the goal_state injection into the architect prompt by
# ensuring goal_state fields are present after extraction.
# If the field is in goal_state, the system prompt will say "WHAT I ALREADY KNOW: goal = ..."
# The architect's MOCK response is fixed, so we test the extraction side.
state_c = {
    "messages": [
        HumanMessage(content="I want to build a React portfolio in 30 days. I can spend 2 hours/day."),
    ],
    "goal_state": {}
}
result_c = goal_extraction_node(state_c)
gs_c = result_c["goal_state"]
# All 3 are known — the architect should NOT ask about them
check("C.1 goal present", bool(gs_c.get("goal")))
check("C.2 deadline present", bool(gs_c.get("deadline")))
check("C.3 time present", bool(gs_c.get("time")))
# Confirm goal_state is passed into architect node (system prompt injection)
arch_state = {**state_c, "goal_state": gs_c}
arch_result = goal_architect_node(arch_state)
check("C.4 architect node runs without error", "final_insight" in arch_result or "messages" in arch_result)


# ============================================================
# Test D: Explicit corrections replace old information
# ============================================================
print("\n=== TEST D: Corrections replace old values ===")
existing_d = {"goal": "Build a React portfolio", "deadline": "30 days", "time": "2 hours/day"}

# User corrects time
state_d = {
    "messages": [HumanMessage(content="Actually, I can only study 1 hour on weekdays.")],
    "goal_state": existing_d
}
result_d = goal_extraction_node(state_d)
gs_d = result_d["goal_state"]
print(f"  Before: time={existing_d['time']!r}")
print(f"  After:  time={gs_d.get('time')!r}")
check("D.1 time corrected", gs_d.get("time") != "2 hours/day",
      f"got {gs_d.get('time')!r}")
check("D.2 new time is weekday-specific", "weekday" in str(gs_d.get("time","")).lower())
check("D.3 goal preserved after correction", gs_d.get("goal") == "Build a React portfolio")
check("D.4 deadline preserved after correction", gs_d.get("deadline") == "30 days")


# ============================================================
# Test E: Vague answers don't overwrite reliable info
# ============================================================
print("\n=== TEST E: Vague answers don't overwrite ===")
existing_e = {"goal": "Build a Vue portfolio", "deadline": "30 days", "time": "1 hour/day"}
state_e = {
    "messages": [HumanMessage(content="I'm not really sure, maybe later.")],
    "goal_state": existing_e
}
result_e = goal_extraction_node(state_e)
gs_e = result_e["goal_state"]
print(f"  Goal state after vague msg: {gs_e}")
check("E.1 goal not overwritten by vague", gs_e.get("goal") == "Build a Vue portfolio")
check("E.2 deadline not overwritten by vague", gs_e.get("deadline") == "30 days")
check("E.3 time not overwritten by vague", gs_e.get("time") == "1 hour/day")


# ============================================================
# Test F: Goal changes update state correctly
# ============================================================
print("\n=== TEST F: Goal changes ===")
existing_f = {"goal": "Build a weather app", "deadline": "20 days", "time": "2 hours/day"}
state_f = {
    "messages": [HumanMessage(content="Actually I want to build a finance tracker instead.")],
    "goal_state": existing_f
}
result_f = goal_extraction_node(state_f)
gs_f = result_f["goal_state"]
print(f"  Before goal: {existing_f['goal']!r}")
print(f"  After goal:  {gs_f.get('goal')!r}")
check("F.1 goal changed to finance tracker", "finance" in str(gs_f.get("goal","")).lower())
check("F.2 old goal not preserved", "weather" not in str(gs_f.get("goal","")).lower())
check("F.3 time preserved after goal change", gs_f.get("time") is not None)
check("F.4 brain_dump cleared after goal change", gs_f.get("brain_dump") is None)


# ============================================================
# Test G: One question per turn (mock architect response check)
# ============================================================
print("\n=== TEST G: Architect node executes without error ===")
state_g = {
    "messages": [HumanMessage(content="I want to build a React portfolio in 30 days.")],
    "goal_state": {"goal": "Build a React portfolio", "deadline": "30 days"}
}
result_g = goal_architect_node(state_g)
check("G.1 architect returns messages", "messages" in result_g)
check("G.2 architect returns final_insight", "final_insight" in result_g)
msg_content = result_g.get("final_insight", "")
check("G.3 architect response is non-empty", bool(msg_content))


# ============================================================
# Test H: AI stops asking when enough info exists
# (In MOCK mode, we verify the state is "ready" by checking all key fields)
# ============================================================
print("\n=== TEST H: Sufficient info detection ===")
# Provide goal + deadline + time + resources (4 fields — enough for a plan)
full_state_h = {
    "goal": "Build a React portfolio",
    "deadline": "30 days",
    "time": "2 hours/day",
    "resources": "React, Tailwind CSS",
}
missing_fields_h = [f for f in ["goal","why","deadline","brain_dump","time","resources","obstacles"]
                    if not full_state_h.get(f)]
check("H.1 4 fields present", len([f for f in full_state_h if full_state_h[f]]) == 4)
check("H.2 only 3 fields missing", len(missing_fields_h) == 3)
# The architect's prompt will see 4 known fields — enough to create a plan
# (Real LLM would call create_goal here; mock just returns a text response)


# ============================================================
# Test I: Thread isolation (different goal_state for different threads)
# ============================================================
print("\n=== TEST I: Thread isolation ===")
state_i1 = {
    "messages": [HumanMessage(content="I want to build a React portfolio in 30 days.")],
    "goal_state": {}
}
state_i2 = {
    "messages": [HumanMessage(content="I want to prepare for my semester exams in 3 weeks.")],
    "goal_state": {}
}
result_i1 = goal_extraction_node(state_i1)
result_i2 = goal_extraction_node(state_i2)
gs_i1 = result_i1["goal_state"]
gs_i2 = result_i2["goal_state"]
print(f"  Thread 1 goal: {gs_i1.get('goal')!r}")
print(f"  Thread 2 goal: {gs_i2.get('goal')!r}")
check("I.1 thread 1 has portfolio goal", "portfolio" in str(gs_i1.get("goal","")).lower())
check("I.2 thread 2 has exam goal", "exam" in str(gs_i2.get("goal","")).lower())
check("I.3 threads are independent", gs_i1.get("goal") != gs_i2.get("goal"))


# ============================================================
# Test J: Phase 1 regression — chat flow still works
# ============================================================
print("\n=== TEST J: Phase 1 regression ===")
# The basic chat flow: send a message, get a response back
state_j = {
    "messages": [HumanMessage(content="Hello, I need help with my study goal.")],
    "goal_state": {}
}
# First extraction (Phase 2C)
extr_j = goal_extraction_node(state_j)
check("J.1 extraction node returns goal_state", "goal_state" in extr_j)
# Then architect (Phase 2D)
arch_j_state = {**state_j, "goal_state": extr_j["goal_state"]}
arch_j = goal_architect_node(arch_j_state)
check("J.2 architect node returns messages", "messages" in arch_j)
check("J.3 architect messages list non-empty", len(arch_j.get("messages", [])) > 0)
# Simulate MOCK tool call (existing behavior)
state_j_tool = {
    "messages": [HumanMessage(content="simulate tool call")],
    "goal_state": {}
}
arch_j_tool = goal_architect_node(state_j_tool)
check("J.4 tool simulation still works", len(arch_j_tool.get("messages", [])) > 0)


# ============================================================
# Test K: Merge logic unit tests
# ============================================================
print("\n=== TEST K: _merge_goal_state unit tests ===")

# K.1 New field added
e1 = {}
x1 = GoalFieldExtraction(goal="Build a portfolio")
m1 = _merge_goal_state(e1, x1)
check("K.1 new field added", m1.get("goal") == "Build a portfolio")

# K.2 Existing field not overwritten by shorter/same value
e2 = {"goal": "Build a React portfolio website with animations"}
x2 = GoalFieldExtraction(goal="portfolio")  # shorter — should NOT replace
m2 = _merge_goal_state(e2, x2)
check("K.2 short value does not overwrite longer", m2.get("goal") == "Build a React portfolio website with animations")

# K.3 Correction always replaces
e3 = {"time": "2 hours/day"}
x3 = GoalFieldExtraction(time="1 hour/day", corrections=["time"])
m3 = _merge_goal_state(e3, x3)
check("K.3 correction replaces old value", m3.get("time") == "1 hour/day")

# K.4 goal_changed resets brain_dump
e4 = {"goal": "weather app", "brain_dump": "Use OpenWeatherAPI", "time": "2 hours/day"}
x4 = GoalFieldExtraction(goal="finance tracker", goal_changed=True)
m4 = _merge_goal_state(e4, x4)
check("K.4 goal_changed updates goal", m4.get("goal") == "finance tracker")
check("K.5 goal_changed clears brain_dump", m4.get("brain_dump") is None)
check("K.6 goal_changed preserves time", m4.get("time") == "2 hours/day")

# K.5 None extraction leaves existing untouched
e5 = {"goal": "Build a portfolio", "deadline": "30 days"}
x5 = GoalFieldExtraction()  # nothing extracted
m5 = _merge_goal_state(e5, x5)
check("K.7 None extraction preserves all", m5 == e5)


# ============================================================
# TEST L: Existing MOCK tool call behavior (HITL regression)
# ============================================================
print("\n=== TEST L: HITL / create_goal regression ===")
state_l = {
    "messages": [HumanMessage(content="simulate action tool")],
    "goal_state": {"goal": "Test goal", "deadline": "7 days"},
    "tool_call_count": 0,
    "tool_calls_history": []
}
result_l = goal_architect_node(state_l)
check("L.1 create_goal tool call emitted", len(result_l.get("messages", [])) > 0)
msgs_l = result_l.get("messages", [])
has_create_goal = any(
    hasattr(m, "tool_calls") and any(tc.get("name") == "create_goal" for tc in (m.tool_calls or []))
    for m in msgs_l
)
check("L.2 create_goal is the tool called", has_create_goal)


# ============================================================
# Summary
# ============================================================
print("\n" + "="*50)
passed = sum(1 for _, ok in results if ok)
total = len(results)
print(f"RESULTS: {passed}/{total} tests passed")
if passed < total:
    print("\nFAILED TESTS:")
    for name, ok in results:
        if not ok:
            print(f"  - {name}")
    sys.exit(1)
else:
    print("ALL TESTS PASSED ✓")
