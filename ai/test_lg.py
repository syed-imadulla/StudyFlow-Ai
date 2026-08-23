import asyncio
from typing import Annotated, TypedDict, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import AIMessage, ToolCall, ToolMessage

class State(TypedDict):
    messages: list
    pending_action: Optional[dict]
    
def dummy_node(state):
    return {"messages": [AIMessage(content="", tool_calls=[ToolCall(name="create_goal", args={"foo": "bar"}, id="123")])]}

def prepare_action(state):
    last_msg = state["messages"][-1]
    tc = last_msg.tool_calls[0]
    return {"pending_action": {"action": tc["name"], "payload": tc["args"], "tool_call_id": tc["id"]}}

def action_tools(state):
    # This shouldn't run if rejected
    print("ACTION TOOLS EXECUTING!")
    last_msg = state["messages"][-1]
    tc = last_msg.tool_calls[0]
    return {"messages": [ToolMessage(tool_call_id=tc["id"], name=tc["name"], content="Success!")], "pending_action": None}

workflow = StateGraph(State)
workflow.add_node("dummy", dummy_node)
workflow.add_node("prepare_action", prepare_action)
workflow.add_node("action_tools", action_tools)
workflow.add_edge(START, "dummy")
workflow.add_edge("dummy", "prepare_action")
workflow.add_edge("prepare_action", "action_tools")
workflow.add_edge("action_tools", END)

checkpointer = MemorySaver()
app = workflow.compile(checkpointer=checkpointer, interrupt_before=["action_tools"])

config = {"configurable": {"thread_id": "1"}}
state = app.invoke({"messages": []}, config)
print("After first invoke, next node:", app.get_state(config).next)
print("Pending action:", app.get_state(config).values.get("pending_action"))

# Simulate reject:
pending = app.get_state(config).values.get("pending_action")
if pending:
    rejection_msg = ToolMessage(tool_call_id=pending["tool_call_id"], name=pending["action"], content='{"error": "User rejected this action."}')
    # Update state as if action_tools executed
    app.update_state(config, {"messages": [rejection_msg], "pending_action": None}, as_node="action_tools")

    print("After update state, next node:", app.get_state(config).next)
    
    # Resume
    state2 = app.invoke(None, config)
    print("After resume invoke:", state2)
