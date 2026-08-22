import logging
from langgraph.graph import StateGraph, END
from app.agents.supervisor import AgentState, supervisor_node
from app.agents.goal_architect import goal_architect_node
from app.agents.insight_agent import insight_agent_node
from app.checkpoint.postgres import get_postgres_saver

logger = logging.getLogger(__name__)

def unsupported_node(state: AgentState):
    logger.info("Executing unsupported_node")
    from langchain_core.messages import AIMessage
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

def build_graph():
    logger.info("Building StateGraph")
    workflow = StateGraph(AgentState)
    
    workflow.add_node("supervisor", supervisor_node)
    workflow.add_node("goal_architect", goal_architect_node)
    workflow.add_node("insight_agent", insight_agent_node)
    workflow.add_node("unsupported", unsupported_node)
    
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
    
    workflow.add_edge("goal_architect", END)
    workflow.add_edge("insight_agent", END)
    workflow.add_edge("unsupported", END)
    
    try:
        checkpointer = get_postgres_saver()
        logger.info("LangGraph checkpoint backend: PostgreSQL")
        return workflow.compile(checkpointer=checkpointer)
    except Exception as e:
        logger.error(f"Failed to initialize PostgreSQL checkpointer: {e}")
        logger.warning("LangGraph checkpoint backend: MemorySaver fallback")
        from langgraph.checkpoint.memory import MemorySaver
        return workflow.compile(checkpointer=MemorySaver())
