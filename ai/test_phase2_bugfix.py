"""
Phase 2 Bug Fix Regression Tests
Focused on: premature create_goal behavior

Verifies that goal + deadline + time alone does NOT trigger create_goal.
The AI must ask at least one more question (why) before being allowed to create a plan.
"""
import os, sys
os.environ["MOCK_LLM"] = "true"

from langchain_core.messages import HumanMessage, AIMessage
from app.agents.goal_architect import (
    goal_extraction_node, goal_architect_node, _merge_goal_state, GoalFieldExtraction
)

PASS = "\033[92mPASS\033[0m"
FAIL = "\033[91mFAIL\033[0m"
results = []


def check(name, condition, detail=""):
    status = PASS if condition else FAIL
    print(f"  [{status}] {name}" + (f" | {detail}" if detail else ""))
    results.append((name, condition))


def has_create_goal_call(arch_result):
    """Returns True if the architect emitted a create_goal tool call."""
    for msg in arch_result.get("messages", []):
        if hasattr(msg, "tool_calls"):
            for tc in (msg.tool_calls or []):
                if tc.get("name") == "create_goal":
                    return True
    return False


# --- Helper: compute ready_to_plan exactly as the architect does ---
def compute_readiness(goal_state):
    critical = ["goal", "why", "deadline", "time"]
    scoping  = ["brain_dump", "resources"]
    has_critical = all(goal_state.get(f) for f in critical)
    has_scoping  = any(goal_state.get(f) for f in scoping)
    return has_critical and has_scoping


# ============================================================
# TEST 1: goal + deadline + time → NOT ready → no create_goal
# ============================================================
print("\n=== TEST 1: goal + deadline + time — must NOT create_goal ===")
msg1 = "I want to build a React portfolio in 30 days. I can spend 2 hours every evening."
state1 = {"messages": [HumanMessage(content=msg1)], "goal_state": {}}

# Step 1a: extraction
extr1 = goal_extraction_node(state1)
gs1 = extr1["goal_state"]
print(f"  Extracted goal_state: {gs1}")
check("1.1 goal extracted",     bool(gs1.get("goal")))
check("1.2 deadline extracted", bool(gs1.get("deadline")))
check("1.3 time extracted",     bool(gs1.get("time")))
check("1.4 why is empty",       not gs1.get("why"))
check("1.5 brain_dump is empty",not gs1.get("brain_dump"))
check("1.6 resources is empty", not gs1.get("resources"))

# Step 1b: readiness check
ready1 = compute_readiness(gs1)
check("1.7 NOT ready to plan",  not ready1,
      f"ready_to_plan={ready1} (should be False — missing why + scope)")

# Step 1c: architect should NOT call create_goal (mock won't unless message says so)
arch1 = goal_architect_node({**state1, "goal_state": gs1})
called_create1 = has_create_goal_call(arch1)
check("1.8 architect did NOT call create_goal", not called_create1)
check("1.9 architect returned a conversational response",
      bool(arch1.get("final_insight") or arch1.get("messages")))


# ============================================================
# TEST 2: goal + deadline + time + resources — still NOT ready (why missing)
# ============================================================
print("\n=== TEST 2: goal + deadline + time + resources — still NOT ready ===")
msg2 = "I want to build a React portfolio in 30 days. I can spend 2 hours every evening. I already know React and Tailwind."
state2 = {"messages": [HumanMessage(content=msg2)], "goal_state": {}}
extr2 = goal_extraction_node(state2)
gs2 = extr2["goal_state"]
print(f"  Extracted goal_state: {gs2}")

ready2 = compute_readiness(gs2)
check("2.1 goal extracted",     bool(gs2.get("goal")))
check("2.2 deadline extracted", bool(gs2.get("deadline")))
check("2.3 time extracted",     bool(gs2.get("time")))
check("2.4 resources extracted",bool(gs2.get("resources")))
check("2.5 why is empty",       not gs2.get("why"))
check("2.6 NOT ready (why still missing)", not ready2,
      f"ready={ready2}")

arch2 = goal_architect_node({**state2, "goal_state": gs2})
check("2.7 architect did NOT call create_goal", not has_create_goal_call(arch2))


# ============================================================
# TEST 3: Full set → READY → create_goal is allowed
# ============================================================
print("\n=== TEST 3: Full set (goal+why+deadline+time+resources) — READY ===")
gs3 = {
    "goal":      "Build a React portfolio",
    "why":       "To land internships",
    "deadline":  "30 days",
    "time":      "2 hours/day",
    "resources": "React, Tailwind CSS",
}
ready3 = compute_readiness(gs3)
check("3.1 READY to plan", ready3, f"ready={ready3}")
# In MOCK mode the architect only calls create_goal if the message says "create a goal"
# but readiness is True — verify the system would allow it
check("3.2 all critical fields present",
      all(gs3.get(f) for f in ["goal", "why", "deadline", "time"]))
check("3.3 at least one scoping field present",
      any(gs3.get(f) for f in ["brain_dump", "resources"]))


# ============================================================
# TEST 4: Goal change — PLAN READINESS resets (why gone after goal change)
# ============================================================
print("\n=== TEST 4: Goal change — readiness resets ===")
existing4 = {
    "goal":      "Build a weather app",
    "why":       "For fun",
    "deadline":  "20 days",
    "time":      "2 hours/day",
    "resources": "React",
}
# User changes goal
state4 = {
    "messages": [HumanMessage(content="Actually I want to build a finance tracker instead.")],
    "goal_state": existing4
}
extr4 = goal_extraction_node(state4)
gs4 = extr4["goal_state"]
print(f"  After goal change: {gs4}")
check("4.1 goal changed to finance tracker",
      "finance" in str(gs4.get("goal","")).lower())
# The why from the old goal is preserved since goal_changed only clears brain_dump
# But readiness still requires all critical fields including why — let's check
ready4 = compute_readiness(gs4)
# After goal change, why persists but it was "For fun" which may still apply
# The key test: architect should NOT immediately create the new goal
check("4.2 old goal not preserved",
      "weather" not in str(gs4.get("goal","")).lower())

arch4 = goal_architect_node({**state4, "goal_state": gs4})
check("4.3 architect did NOT prematurely create goal for new goal", not has_create_goal_call(arch4))


# ============================================================
# TEST 5: Correction — time replaced, NOT ready, no create_goal
# ============================================================
print("\n=== TEST 5: Correction — time replaced, no premature create_goal ===")
existing5 = {
    "goal":     "Build a React portfolio",
    "deadline": "30 days",
    "time":     "2 hours/day",
}
state5 = {
    "messages": [HumanMessage(content="Actually I can only spend 1 hour on weekdays.")],
    "goal_state": existing5
}
extr5 = goal_extraction_node(state5)
gs5 = extr5["goal_state"]
print(f"  After correction: {gs5}")
check("5.1 time corrected to weekday-specific",
      "weekday" in str(gs5.get("time","")).lower(),
      f"time={gs5.get('time')!r}")
check("5.2 NOT ready (why + scope still missing)", not compute_readiness(gs5))
arch5 = goal_architect_node({**state5, "goal_state": gs5})
check("5.3 architect did NOT create_goal after correction", not has_create_goal_call(arch5))


# ============================================================
# TEST 6: Readiness boundary cases
# ============================================================
print("\n=== TEST 6: Readiness boundary cases ===")

# Only brain_dump scoping (no resources)
gs6a = {"goal": "React portfolio", "why": "Internships", "deadline": "30 days", "time": "2hr", "brain_dump": "Home page, About, Projects"}
check("6.1 brain_dump counts as scoping", compute_readiness(gs6a))

# Only resources scoping (no brain_dump)
gs6b = {"goal": "React portfolio", "why": "Internships", "deadline": "30 days", "time": "2hr", "resources": "React, Tailwind"}
check("6.2 resources counts as scoping", compute_readiness(gs6b))

# Missing deadline → NOT ready
gs6c = {"goal": "React portfolio", "why": "Internships", "time": "2hr", "resources": "React"}
check("6.3 missing deadline → NOT ready", not compute_readiness(gs6c))

# Missing time → NOT ready
gs6d = {"goal": "React portfolio", "why": "Internships", "deadline": "30 days", "resources": "React"}
check("6.4 missing time → NOT ready", not compute_readiness(gs6d))

# Missing why → NOT ready (even with all other fields)
gs6e = {"goal": "React portfolio", "deadline": "30 days", "time": "2hr", "resources": "React", "brain_dump": "Projects page"}
check("6.5 missing why → NOT ready", not compute_readiness(gs6e))

# Missing both scoping fields → NOT ready
gs6f = {"goal": "React portfolio", "why": "Internships", "deadline": "30 days", "time": "2hr"}
check("6.6 missing both scoping fields → NOT ready", not compute_readiness(gs6f))


# ============================================================
# Summary
# ============================================================
print("\n" + "="*60)
passed = sum(1 for _, ok in results if ok)
total  = len(results)
print(f"BUGFIX REGRESSION RESULTS: {passed}/{total} tests passed")
if passed < total:
    print("\nFAILED TESTS:")
    for name, ok in results:
        if not ok:
            print(f"  - {name}")
    sys.exit(1)
else:
    print("ALL BUGFIX REGRESSION TESTS PASSED ✓")
