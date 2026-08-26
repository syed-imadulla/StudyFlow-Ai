import logging
import json
import os
from typing import TypedDict, Optional, Annotated, Literal
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph.message import add_messages
from app.llm.provider import get_llm, handle_llm_error
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    jwt_token: str
    messages: Annotated[list[BaseMessage], add_messages]
    route: Optional[str]
    analytics_data: Optional[str]
    goals_data: Optional[str]
    tasks_data: Optional[str]
    final_insight: Optional[str]
    error: Optional[str]
    tool_call_count: int
    tool_calls_history: list[str]
    pending_action: Optional[dict]
    # Phase 2: Structured goal information extracted from the conversation.
    # Persisted across turns by the LangGraph checkpointer (PostgreSQL).
    # Keys: goal, why, deadline, brain_dump, time, resources, obstacles
    goal_state: Optional[dict]

class RouteDecision(BaseModel):
    """Select the appropriate agent to route the request to."""
    route: Literal["goal_architect", "planner_agent", "study_coach", "resource_agent", "rag_agent", "insight_agent", "unsupported"] = Field(description="One of: goal_architect, planner_agent, study_coach, resource_agent, rag_agent, insight_agent, unsupported")

def supervisor_node(state: AgentState):
    logger.info("Executing supervisor_node")
    messages = state.get("messages", [])
    
    # Get last user message
    last_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage):
            last_msg = m.content
            break
            
    # Check if we should mock the LLM for tests
    if os.getenv("MOCK_LLM") == "true":
        if "mock invalid route" in last_msg.lower():
            return {"route": "unsupported", "tool_call_count": 0, "tool_calls_history": []}
        elif "goal" in last_msg.lower() or "build a" in last_msg.lower() or "project" in last_msg.lower():
            return {"route": "goal_architect", "tool_call_count": 0, "tool_calls_history": []}
        elif "insight" in last_msg.lower() or "analytics" in last_msg.lower():
            return {"route": "insight_agent", "tool_call_count": 0, "tool_calls_history": []}
        elif "pdf" in last_msg.lower() or "note" in last_msg.lower() or "rag" in last_msg.lower():
            return {"route": "rag_agent", "tool_call_count": 0, "tool_calls_history": []}
        else:
            return {"route": "unsupported", "tool_call_count": 0, "tool_calls_history": []}
            
    llm = get_llm()
    if not llm:
        return {"error": "StudyFlow AI is temporarily unavailable (Provider config error).", "route": "unsupported"}
        
    system_prompt = """You are a routing supervisor for StudyFlow AI.
Based on the conversation history, classify the user's latest intent into exactly one of the following routes:
- "goal_architect": The user is asking about creating, brainstorming, or modifying a study/project goal, OR answering a follow-up question about an ongoing goal brainstorm (e.g., "Create a goal for learning DSA", "I want to build a React portfolio", or replying with deadlines/milestones to an active brainstorm).
- "planner_agent": The user is asking about scheduling, what to study today, moving tasks, or managing their workload (e.g., "What should I study today?", "Move this task to tomorrow").
- "study_coach": The user is asking for explanations, doubts, learning guidance, or study strategies (e.g., "Explain normalization", "I don't understand X").
- "resource_agent": The user is asking for external resources, tutorials, or study materials (e.g., "Find free resources for graphs").
- "rag_agent": The user explicitly asks about their uploaded documents, notes, or PDFs (e.g., "What does my DBMS PDF say?").
- "insight_agent": The user is asking for an analytics insight, focus summary, or study patterns.
- "unsupported": The user is asking for something completely unrelated to goals, projects, tasks, study analytics, or learning.
"""
    
    # Keep sliding window of last 20 messages (approx 10 turns)
    window = messages[-20:]
    input_messages = [SystemMessage(content=system_prompt)] + window
    
    try:
        structured_llm = llm.with_structured_output(RouteDecision)
        res = structured_llm.invoke(input_messages)
        route = res.route
        logger.info(f"Supervisor routed to: {route}")
        
        # For a new request, reset the tool budget
        return {"route": route, "tool_call_count": 0, "tool_calls_history": []}
    except Exception as e:
        logger.error(f"Supervisor LLM Error: {e}")
        
        # Map provider errors to specific error states instead of defaulting to "unsupported"
        from app.llm.provider import handle_llm_error
        err_msg = handle_llm_error(e)
        return {"error": err_msg, "route": None}
