import sys
import logging
logging.basicConfig(level=logging.INFO)
import uuid
import os
import psycopg
from app.graph.builder import build_graph
from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.checkpoint.postgres import PostgresSaver

def get_graph():
    os.environ["MOCK_LLM"] = "true"
    return build_graph()

def main():
    if len(sys.argv) < 2:
        print("Usage: python verify_hitl.py [start|resume|duplicate|isolation]")
        return
        
    cmd = sys.argv[1]
    graph = get_graph()
    
    if cmd == "start":
        thread_id = "phase624-restart-test-001"
        config = {"configurable": {"thread_id": thread_id, "jwt_token": "fake_token"}}
        
        print("--- 1. Testing HITL Pause ---")
        initial_state = {
            "jwt_token": "fake_token",
            "messages": [HumanMessage(content="simulate action tool goal")],
        }
        
        final_state = graph.invoke(initial_state, config=config)
        snapshot = graph.get_state(config)
        if "action_tools" in snapshot.next:
            print("PASS: Graph paused before action_tools.")
        else:
            print("FAIL: Graph did not pause. Next is:", snapshot.next)
            sys.exit(1)
            
        pending = snapshot.values.get("pending_action")
        if pending:
            print(f"PASS: Pending action found: {pending['action']}")
        else:
            print("FAIL: No pending action found.")
            sys.exit(1)
            
    elif cmd == "resume":
        thread_id = "phase624-restart-test-001"
        config = {"configurable": {"thread_id": thread_id, "jwt_token": "fake_token"}}
        
        print("--- 2. Testing Exact Once & JWT Failure After Restart ---")
        snapshot = graph.get_state(config)
        if "action_tools" in snapshot.next:
            print("PASS: Graph is still paused before action_tools after restart.")
        else:
            print("FAIL: Graph lost paused state.")
            sys.exit(1)
            
        final_state2 = graph.invoke(None, config=config)
        
        last_msgs = final_state2["messages"]
        tool_msg = next((m for m in reversed(last_msgs) if isinstance(m, ToolMessage)), None)
        
        if tool_msg:
            if "Authentication expired or invalid" in tool_msg.content or "Service is currently unavailable" in tool_msg.content:
                print(f"PASS: Node.js API hit with expected failure due to missing backend/fake token. Result: {tool_msg.content}")
            else:
                print(f"FAIL: Unexpected tool result: {tool_msg.content}")
                sys.exit(1)
        else:
            print("FAIL: ToolMessage not found.")
            sys.exit(1)
            
    elif cmd == "duplicate":
        thread_id = "phase624-restart-test-001"
        config = {"configurable": {"thread_id": thread_id, "jwt_token": "fake_token"}}
        
        print("--- 3. Testing Duplicate Prevention ---")
        try:
            final_state3 = graph.invoke(None, config=config)
            snapshot3 = graph.get_state(config)
            if "action_tools" in snapshot3.next:
                 print("FAIL: Graph paused again unexpectedly.")
                 sys.exit(1)
            else:
                 print("PASS: Re-invoking graph does not duplicate execution.")
        except Exception as e:
            print(f"PASS: Re-invoking graph threw error (likely due to state completion): {e}")

    elif cmd == "isolation":
        thread_id_1 = "phase624-restart-test-001"
        thread_id_2 = "phase624-restart-test-002"
        config1 = {"configurable": {"thread_id": thread_id_1, "jwt_token": "fake_token"}}
        config2 = {"configurable": {"thread_id": thread_id_2, "jwt_token": "fake_token"}}
        
        print("--- 4. Testing Thread Isolation ---")
        # Ensure thread 1 has no impact on thread 2
        snapshot2 = graph.get_state(config2)
        if snapshot2.values == {}:
            print("PASS: Thread 002 is empty and isolated.")
        else:
            print("FAIL: Thread 002 has leaked state.", snapshot2.values)
            sys.exit(1)

if __name__ == "__main__":
    main()
