import os
import uuid
import pytest
from app.graph.builder import build_graph
from langchain_core.messages import HumanMessage, AIMessage

# Ensure MOCK_LLM is set for testing
os.environ["MOCK_LLM"] = "true"

def test_memory_accumulation_and_recall():
    """
    Test 1, 2, 4, 5, 6, 9: Message accumulation, memory recall, sliding window, routing with history, MOCK_LLM behavior.
    """
    graph = build_graph()
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id, "jwt_token": "dummy"}}
    
    initial_state_1 = {
        "jwt_token": "dummy_token",
        "messages": [HumanMessage(content="My favorite subject is Math. Set a goal for it.")],
        "final_insight": "",
        "error": ""
    }
    
    res1 = graph.invoke(initial_state_1, config=config)
    assert "goal_architect" in res1["route"]
    
    messages = res1["messages"]
    assert len(messages) >= 2
    
    initial_state_2 = {
        "jwt_token": "dummy_token",
        "messages": [HumanMessage(content="What is my favorite subject? Still about my goal.")],
        "final_insight": "",
        "error": ""
    }
    
    res2 = graph.invoke(initial_state_2, config=config)
    assert "Math" in res2["final_insight"]
    
    del graph
    graph2 = build_graph()
    
    initial_state_3 = {
        "jwt_token": "dummy_token",
        "messages": [HumanMessage(content="Do you still remember my favorite subject? (goal)")],
        "final_insight": "",
        "error": ""
    }
    
    res3 = graph2.invoke(initial_state_3, config=config)
    
    if "postgres" in str(type(graph2.checkpointer)).lower():
        assert "Math" in res3["final_insight"]
    else:
        print("Skipping cross-restart memory test because PostgreSQL is offline and MemorySaver was used.")
    
def test_different_thread_isolation():
    graph = build_graph()
    thread_id_1 = str(uuid.uuid4())
    thread_id_2 = str(uuid.uuid4())
    
    graph.invoke({
        "jwt_token": "dummy",
        "messages": [HumanMessage(content="My favorite subject is History. (goal)")],
        "final_insight": "",
        "error": ""
    }, config={"configurable": {"thread_id": thread_id_1, "jwt_token": "dummy"}})
    
    res2 = graph.invoke({
        "jwt_token": "dummy",
        "messages": [HumanMessage(content="What is my favorite subject? (goal)")],
        "final_insight": "",
        "error": ""
    }, config={"configurable": {"thread_id": thread_id_2, "jwt_token": "dummy"}})
    
    messages_2 = res2["messages"]
    history_mentions = [m.content for m in messages_2 if "History" in m.content]
    assert len(history_mentions) == 0

def test_unsupported_routing():
    graph = build_graph()
    thread_id = str(uuid.uuid4())
    
    res = graph.invoke({
        "jwt_token": "dummy",
        "messages": [HumanMessage(content="Tell me a joke.")],
        "final_insight": "",
        "error": ""
    }, config={"configurable": {"thread_id": thread_id, "jwt_token": "dummy"}})
    
    assert res["route"] == "unsupported"
    assert "I'm sorry" in res["final_insight"]
    
def test_invalid_mock_route():
    graph = build_graph()
    thread_id = str(uuid.uuid4())
    
    res = graph.invoke({
        "jwt_token": "dummy",
        "messages": [HumanMessage(content="Trigger mock invalid route.")],
        "final_insight": "",
        "error": ""
    }, config={"configurable": {"thread_id": thread_id, "jwt_token": "dummy"}})
    
    assert res["route"] == "unsupported"

def test_tool_budget_limit():
    graph = build_graph()
    thread_id = str(uuid.uuid4())
    
    res1 = graph.invoke({
        "jwt_token": "dummy",
        "messages": [HumanMessage(content="simulate loop tool call (goal)")],
        "final_insight": "",
        "error": ""
    }, config={"configurable": {"thread_id": thread_id, "jwt_token": "dummy"}})
    
    assert "process too much information" in res1["final_insight"]
    assert res1["tool_call_count"] == 5

def test_duplicate_tool_call_prevention():
    graph = build_graph()
    thread_id = str(uuid.uuid4())
    
    # Run 1: Simulate a duplicate sequence (looping with exact same arguments)
    res1 = graph.invoke({
        "jwt_token": "dummy",
        "messages": [HumanMessage(content="simulate duplicate sequence (goal)")],
        "final_insight": "",
        "error": ""
    }, config={"configurable": {"thread_id": thread_id, "jwt_token": "dummy"}})
    
    # It should block the sequence after the first tool execution, before hitting the 5 budget
    assert "already checked that information" in res1["final_insight"]
    assert res1["tool_call_count"] == 1
