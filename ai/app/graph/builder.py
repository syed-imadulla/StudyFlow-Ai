import logging
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from app.agents.supervisor import AgentState, supervisor_node
from app.agents.goal_architect import goal_architect_node
from app.agents.insight_agent import insight_agent_node
from app.checkpoint.postgres import get_postgres_saver
from app.tools.registry import (
    get_analytics_summary, get_active_goals, get_goal_details, 
    get_todays_tasks, get_goal_tasks, get_todays_schedule, 
    get_upcoming_schedule, get_todays_focus, get_recent_focus,
    create_goal, schedule_task
)
from langchain_core.messages import AIMessage

logger = logging.getLogger(__name__)

all_tools = [
    get_analytics_summary, get_active_goals, get_goal_details, 
    get_todays_tasks, get_goal_tasks, get_todays_schedule, 
    get_upcoming_schedule, get_todays_focus, get_recent_focus,
    create_goal, schedule_task
]
tool_node = ToolNode(all_tools)

ACTION_TOOL_NAMES = {"create_goal", "schedule_task"}

def custom_tools_condition(state: AgentState):
    messages = state.get("messages", [])
    if not messages:
        return END
    last_message = messages[-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        has_action = any(tc["name"] in ACTION_TOOL_NAMES for tc in last_message.tool_calls)
        if has_action:
            return "prepare_action"
        return "read_tools"
    return END

def prepare_action(state: AgentState):
    logger.info("Executing prepare_action")
    messages = state.get("messages", [])
    last_message = messages[-1]
    
    # Find the first action tool call
    action_tc = None
    for tc in last_message.tool_calls:
        if tc["name"] in ACTION_TOOL_NAMES:
            action_tc = tc
            break
            
    if action_tc:
        pending = {
            "action": action_tc["name"],
            "description": f"Proposed action: {action_tc['name']}",
            "payload": action_tc["args"],
            "tool_call_id": action_tc["id"],
            "status": "pending"
        }
        return {"pending_action": pending}
    return {"pending_action": None}

def unsupported_node(state: AgentState):
    logger.info("Executing unsupported_node")
    content = "I'm sorry, but I can only help with goal planning and study analytics."
    return {
        "final_insight": content,
        "messages": [AIMessage(content=content)]
    }

def route_request(state: AgentState):
    route = state.get("route", "unsupported")
    logger.info(f"Routing to: {route}")
    if route == "goal_architect":
        return "goal_architect"
    elif route == "insight_agent":
        return "insight_agent"
    else:
        return "unsupported"

def route_after_tools(state: AgentState):
    route = state.get("route", "unsupported")
    if route == "goal_architect":
        return "goal_architect"
    elif route == "insight_agent":
        return "insight_agent"
    return "unsupported"

def build_graph():
    logger.info("Building StateGraph")
    workflow = StateGraph(AgentState)
    
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("goal_architect", goal_architect_node)
    workflow.add_node("insight_agent", insight_agent_node)
    workflow.add_node("unsupported", unsupported_node)
    workflow.add_node("read_tools", tool_node)
    workflow.add_node("prepare_action", prepare_action)
    workflow.add_node("action_tools", tool_node)
    
    workflow.set_entry_point("supervisor")
    
    workflow.add_conditional_edges(
        "supervisor",
        route_request,
        {
            "goal_architect": "goal_architect",
            "insight_agent": "insight_agent",
            "unsupported": "unsupported"
        }
    )
    
    workflow.add_conditional_edges("goal_architect", custom_tools_condition)
    workflow.add_conditional_edges("insight_agent", custom_tools_condition)
    
    workflow.add_edge("prepare_action", "action_tools")
    
    workflow.add_conditional_edges("read_tools", route_after_tools)
    workflow.add_conditional_edges("action_tools", route_after_tools)
    
    workflow.add_edge("unsupported", END)
    
    try:
        checkpointer = get_postgres_saver()
        logger.info("LangGraph checkpoint backend: PostgreSQL")
        return workflow.compile(checkpointer=checkpointer, interrupt_before=["action_tools"])
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL checkpointer: {e}")
        logger.warning("LangGraph checkpoint backend: MemorySaver fallback")
        from langgraph.checkpoint.memory import MemorySaver
        return workflow.compile(checkpointer=MemorySaver(), interrupt_before=["action_tools"])
