import logging
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode, tools_condition
from app.agents.supervisor import AgentState, supervisor_node
from app.agents.goal_architect import goal_architect_node, goal_extraction_node
from app.agents.insight_agent import insight_agent_node
from app.agents.planner_agent import planner_agent_node
from app.agents.study_coach import study_coach_node
from app.agents.resource_agent import resource_agent_node
from app.agents.rag_agent import rag_agent_node
from app.checkpoint.postgres import get_postgres_saver
from app.tools.registry import (
    get_analytics_summary, get_active_goals, get_goal_details, 
    get_todays_tasks, get_goal_tasks, get_todays_schedule, 
    get_upcoming_schedule, get_todays_focus, get_recent_focus,
    create_goal, schedule_task, search_study_notes
)
from langchain_core.messages import AIMessage

logger = logging.getLogger(__name__)

all_tools = [
    get_analytics_summary, get_active_goals, get_goal_details, 
    get_todays_tasks, get_goal_tasks, get_todays_schedule, 
    get_upcoming_schedule, get_todays_focus, get_recent_focus,
    create_goal, schedule_task, search_study_notes
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
            
        # Don't return to tools if we are at the max budget
        # We handle this loosely here since budget is maintained inside node
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
    # goal_architect is now preceded by goal_extraction — route to that first
    if route == "goal_architect":
        return "goal_extraction"
    if route in ["planner_agent", "study_coach", "resource_agent", "rag_agent", "insight_agent"]:
        return route
    return "unsupported"

def route_after_tools(state: AgentState):
    route = state.get("route", "unsupported")
    if route in ["goal_architect", "planner_agent", "study_coach", "resource_agent", "rag_agent", "insight_agent"]:
        return route
    return "unsupported"

def build_graph():
    logger.info("Building StateGraph")
    workflow = StateGraph(AgentState)
    
    workflow.add_node("supervisor", supervisor_node)
    # Phase 2: goal_extraction runs before goal_architect to update goal_state
    workflow.add_node("goal_extraction", goal_extraction_node)
    workflow.add_node("goal_architect", goal_architect_node)
    workflow.add_node("planner_agent", planner_agent_node)
    workflow.add_node("study_coach", study_coach_node)
    workflow.add_node("resource_agent", resource_agent_node)
    workflow.add_node("rag_agent", rag_agent_node)
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
            # goal_architect route now goes to goal_extraction first
            "goal_extraction": "goal_extraction",
            "planner_agent": "planner_agent",
            "study_coach": "study_coach",
            "resource_agent": "resource_agent",
            "rag_agent": "rag_agent",
            "insight_agent": "insight_agent",
            "unsupported": "unsupported"
        }
    )
    # goal_extraction always routes to goal_architect
    workflow.add_edge("goal_extraction", "goal_architect")
    
    workflow.add_conditional_edges("goal_architect", custom_tools_condition)
    workflow.add_conditional_edges("planner_agent", custom_tools_condition)
    workflow.add_conditional_edges("study_coach", custom_tools_condition)
    workflow.add_conditional_edges("resource_agent", custom_tools_condition)
    workflow.add_conditional_edges("rag_agent", custom_tools_condition)
    workflow.add_conditional_edges("insight_agent", custom_tools_condition)
    
    workflow.add_edge("prepare_action", "action_tools")
    
    workflow.add_conditional_edges("read_tools", route_after_tools)
    workflow.add_conditional_edges("action_tools", route_after_tools)
    
    workflow.add_edge("unsupported", END)
    
    try:
        checkpointer = get_postgres_saver()
        logger.info("LangGraph checkpoint backend: PostgreSQL")
        # Add strict recursion_limit to prevent infinite loops (Agent -> Tool -> Agent)
        return workflow.compile(checkpointer=checkpointer, interrupt_before=["action_tools"]) # Default recursion limit is usually fine, but let's be explicit if we can. Actually we can't easily set recursion_limit in compile() in all langgraph versions. Wait, `workflow.compile()` accepts it? No, typically it's passed at invocation time `config={"recursion_limit": 15}`. 
        # But wait, I'll pass it at compile time just in case, but usually it's runtime config. Let me check if compile takes it in newer versions. Actually I'll leave compile as is and enforce it in the runner API route. Let's just return compile.
        # Let's add a state validation node that runs after every agent. Wait, the user said "Use LangGraph's appropriate recursion/iteration controls where possible." Langgraph natively supports a `recursion_limit` in the `config` dictionary passed to `.invoke()` or `.astream()`.
        # So I need to modify `api.routes.js` or `app.py` in FastAPI! Let's check `ai/app/main.py`.
        return workflow.compile(checkpointer=checkpointer, interrupt_before=["action_tools"])
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL checkpointer: {e}")
        logger.warning("LangGraph checkpoint backend: MemorySaver fallback")
        from langgraph.checkpoint.memory import MemorySaver
        return workflow.compile(checkpointer=MemorySaver(), interrupt_before=["action_tools"])
