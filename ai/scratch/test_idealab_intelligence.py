import sys
import json
import logging
from pprint import pprint

sys.path.append("/home/syed-imadulla/Desktop/StudyFlow Ai/ai")

from app.graph.builder import build_graph
from langchain_core.messages import HumanMessage, AIMessage

logging.basicConfig(level=logging.ERROR)  # Suppress info logs to make output clean
graph = build_graph()

import uuid

def run_test(test_name, input_message_texts, expected_assertions, config_id=None):
    if config_id is None:
        config_id = f"test_{uuid.uuid4().hex[:8]}"
    else:
        config_id = f"{config_id}_{uuid.uuid4().hex[:8]}"
        
    print(f"\n{'='*50}\n{test_name.upper()} (thread: {config_id})\n{'='*50}")
    
    messages = []
    for msg in input_message_texts:
        if isinstance(msg, dict):
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            else:
                messages.append(AIMessage(content=msg["content"]))
        else:
            messages.append(HumanMessage(content=msg))
            
    print(f"INPUT:")
    for m in messages:
        prefix = "User: " if isinstance(m, HumanMessage) else "AI: "
        print(f"  {prefix}{m.content}")
        
    state = {
        "messages": messages,
        "route": "goal_architect"
    }
    
    try:
        res = graph.invoke(state, config={"configurable": {"thread_id": config_id}, "recursion_limit": 15})
        
        goal_state = res.get("goal_state", {})
        is_ready = res.get("is_goal_ready", False)
        final_msgs = res.get("messages", [])
        
        # Last AI response/tools
        ai_msg = final_msgs[-1] if final_msgs else None
        
        print("\nEXTRACTED STATE:")
        print(json.dumps(goal_state, indent=2))
        print(f"\nIS_GOAL_READY: {is_ready}")
        print("\nAI RESPONSE:")
        if ai_msg:
            print(f"  content: {ai_msg.content}")
            print(f"  tool_calls: {getattr(ai_msg, 'tool_calls', [])}")
        else:
            print("  None")
            
        print("\nASSERTIONS:")
        all_passed = True
        for assert_name, assert_fn in expected_assertions.items():
            try:
                passed = assert_fn(res)
                status = "PASS" if passed else "FAIL"
                if not passed: all_passed = False
                print(f"  [{status}] {assert_name}")
            except Exception as e:
                print(f"  [FAIL] {assert_name} (Error: {e})")
                all_passed = False
                
        return all_passed
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False

tests = []

# TEST 1: MULTIPLE VALUES IN ONE MESSAGE
tests.append(lambda: run_test(
    "Test 1: Multiple values in one message",
    ["I want to build a React portfolio in 30 days and can spend 2 hours daily."],
    {
        "Extracts goal": lambda res: "portfolio" in str(res.get("goal_state", {}).get("goal", "")).lower(),
        "Extracts deadline": lambda res: "30 days" in str(res.get("goal_state", {}).get("deadline", "")).lower(),
        "Extracts time": lambda res: "2 hours" in str(res.get("goal_state", {}).get("time", "")).lower(),
        "is_goal_ready is False": lambda res: res.get("is_goal_ready") is False,
        "AI asks exactly one contextual question": lambda res: len(res.get("messages", [])[-1].content.split("?")) == 2 and "why" not in res.get("messages", [])[-1].content.lower() and not getattr(res.get("messages", [])[-1], "tool_calls", [])
    },
    "test_1"
))

# TEST 2: OUT-OF-ORDER INFORMATION
tests.append(lambda: run_test(
    "Test 2: Out-of-order information",
    ["I can spend 2 hours daily and need it finished in 3 weeks."],
    {
        "Extracts time": lambda res: "2 hours" in str(res.get("goal_state", {}).get("time", "")).lower(),
        "Extracts deadline": lambda res: "3 weeks" in str(res.get("goal_state", {}).get("deadline", "")).lower(),
        "Goal remains null": lambda res: res.get("goal_state", {}).get("goal") is None,
        "is_goal_ready is False": lambda res: res.get("is_goal_ready") is False,
        "AI asks contextual question": lambda res: "?" in res.get("messages", [])[-1].content and not getattr(res.get("messages", [])[-1], "tool_calls", [])
    },
    "test_2"
))

# TEST 3: CORRECTION
tests.append(lambda: run_test(
    "Test 3: Correction",
    [
        {"role": "user", "content": "I can spend 2 hours daily and need it finished in 3 weeks."},
        {"role": "ai", "content": "Got it. What are you building?"},
        {"role": "user", "content": "Actually, I can only spend 1 hour on weekdays and need it done in 4 weeks."}
    ],
    {
        "Replaces time": lambda res: "1 hour" in str(res.get("goal_state", {}).get("time", "")).lower() and "2 hours" not in str(res.get("goal_state", {}).get("time", "")).lower(),
        "Replaces deadline": lambda res: "4 weeks" in str(res.get("goal_state", {}).get("deadline", "")).lower() and "3 weeks" not in str(res.get("goal_state", {}).get("deadline", "")).lower()
    },
    "test_3"
))

# TEST 4: GOAL CHANGE
tests.append(lambda: run_test(
    "Test 4: Goal change",
    [
        {"role": "user", "content": "I want to build a React portfolio in 30 days."},
        {"role": "ai", "content": "What projects will you showcase?"},
        {"role": "user", "content": "I have a weather app and a todo app to show."},
        {"role": "ai", "content": "Great. What resources do you have?"},
        {"role": "user", "content": "Actually, forget the portfolio. I want to build a personal finance tracker instead."}
    ],
    {
        "Updates goal": lambda res: "finance tracker" in str(res.get("goal_state", {}).get("goal", "")).lower(),
        "Discards old irrelevant context (brain dump)": lambda res: res.get("goal_state", {}).get("brain_dump") is None or "weather" not in str(res.get("goal_state", {}).get("brain_dump", "")).lower()
    },
    "test_4"
))

# TEST 5: VAGUE GOAL
tests.append(lambda: run_test(
    "Test 5: Vague Goal",
    ["I want to prepare for GATE CS 2027."],
    {
        "Extracts goal": lambda res: "gate" in str(res.get("goal_state", {}).get("goal", "")).lower(),
        "is_goal_ready is False": lambda res: res.get("is_goal_ready") is False,
        "AI asks ONE contextual question": lambda res: "?" in res.get("messages", [])[-1].content and not getattr(res.get("messages", [])[-1], "tool_calls", [])
    },
    "test_5"
))

# TEST 6: ENOUGH INFORMATION UPFRONT
tests.append(lambda: run_test(
    "Test 6: Enough information upfront",
    ["I want to build a React portfolio with 3 projects in 30 days. I already know React and can spend 2 hours every day."],
    {
        "is_goal_ready is True": lambda res: res.get("is_goal_ready") is True,
        "Goal/Scope is extracted": lambda res: "portfolio" in str(res.get("goal_state", {})).lower() and "3 projects" in str(res.get("goal_state", {})).lower(),
        "AI creates goal immediately": lambda res: getattr(res.get("messages", [])[-1], "tool_calls", []) and res.get("messages", [])[-1].tool_calls[0]["name"] == "create_goal"
    },
    "test_6"
))

if __name__ == "__main__":
    import time
    success = True
    for i, t in enumerate(tests):
        if i > 0:
            print("\nSleeping for 3s to prevent LLM rate limits...\n")
            time.sleep(3)
        if not t():
            success = False
            
    if success:
        print("\n\nALL 6 INTELLIGENCE TESTS PASSED! 🚀")
        sys.exit(0)
    else:
        print("\n\nSOME TESTS FAILED! ❌")
        sys.exit(1)
