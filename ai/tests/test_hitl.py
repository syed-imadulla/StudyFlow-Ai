import pytest
import os
import uuid
from langchain_core.messages import HumanMessage, ToolMessage
from app.graph.builder import build_graph
from langgraph.checkpoint.memory import MemorySaver

@pytest.fixture
def hitl_graph():
    os.environ["MOCK_LLM"] = "true"
    # Fallback to MemorySaver for deterministic tests
    return build_graph()

def test_hitl_action_proposal(hitl_graph):
    # Send a prompt that generates an action
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id, "jwt_token": "fake_token"}}
    
    initial_state = {
        "jwt_token": "fake_token",
        "messages": [HumanMessage(content="simulate action tool goal")],
        "final_insight": "",
        "error": ""
    }
    
    # 1. Graph should pause before action_tools
    final_state = hitl_graph.invoke(initial_state, config=config)
    
    state_snapshot = hitl_graph.get_state(config)
    assert "action_tools" in state_snapshot.next
    
    pending = final_state.get("pending_action")
    assert pending is not None
    assert pending["action"] == "create_goal"
    assert pending["payload"]["title"] == "Test Goal"
    assert pending["status"] == "pending"
    
    # 2. Simulate User Rejection
    rejection_msg = ToolMessage(tool_call_id=pending["tool_call_id"], name=pending["action"], content='{"error": "User rejected this action."}')
    hitl_graph.update_state(config, {"messages": [rejection_msg], "pending_action": None}, as_node="action_tools")
    
    state_snapshot2 = hitl_graph.get_state(config)
    assert state_snapshot2.next == ('route_after_tools',) or state_snapshot2.next == ('goal_architect',)
    
    # Resume graph
    final_state2 = hitl_graph.invoke(None, config=config)
    
    # Verify rejection was handled gracefully
    assert final_state2["final_insight"] == "Tool executed successfully."
    assert "User rejected this action" in final_state2["messages"][-2].content

def test_hitl_action_approval(hitl_graph):
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id, "jwt_token": "fake_token"}}
    
    initial_state = {
        "jwt_token": "fake_token",
        "messages": [HumanMessage(content="simulate action tool goal")],
        "final_insight": "",
        "error": ""
    }
    
    hitl_graph.invoke(initial_state, config=config)
    state_snapshot = hitl_graph.get_state(config)
    assert "action_tools" in state_snapshot.next
    
    # Simulate User Approval
    # We just invoke None to resume the graph and execute the action tool
    # However, since MOCK_LLM doesn't actually intercept the tool execution itself (the ToolNode does it natively),
    # the request will be made. We can't let it make a real request to Node.js without a backend running.
    # The ToolNode will execute create_goal, which calls requests.post, which will fail gracefully with "Service is currently unavailable."
    final_state2 = hitl_graph.invoke(None, config=config)
    
    assert final_state2["final_insight"] == "Tool executed successfully."
    assert "Authentication expired or invalid" in final_state2["messages"][-2].content or "Service is currently unavailable" in final_state2["messages"][-2].content
