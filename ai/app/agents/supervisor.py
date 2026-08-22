import logging
import json
import os
from typing import TypedDict, Optional, Annotated, Literal
from langchain_core.messages import BaseMessage, SystemMessage, HumanMessage
from langgraph.graph.message import add_messages
from app.llm.gemini import get_llm
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

class RouteDecision(BaseModel):
    """Select the appropriate agent to route the request to."""
    route: Literal["goal_architect", "insight_agent", "unsupported"] = Field(description="One of: goal_architect, insight_agent, unsupported")

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
            # Deliberately inject a route not in the Literal/Enum to test post-validation defensive fallback
            route = "some_garbage_route"
            if route not in ["goal_architect", "insight_agent", "unsupported"]:
                route = "unsupported"
            return {"route": route}
        elif "goal" in last_msg.lower():
            return {"route": "goal_architect"}
        elif "insight" in last_msg.lower() or "analytics" in last_msg.lower():
            return {"route": "insight_agent"}
        else:
            return {"route": "unsupported"}
            
    llm = get_llm()
    if not llm:
        return {"error": "StudyFlow AI is currently offline.", "route": "unsupported"}
        
    system_prompt = """You are a routing supervisor.
Based on the conversation history, classify the user's latest intent into exactly one of the following routes:
- "goal_architect": The user is asking about their goals, tasks, planning, or recommendations.
- "insight_agent": The user is asking for an analytics insight, focus summary, or study patterns.
- "unsupported": The user is asking for something unrelated to goals, tasks, or study analytics.

Respond using the structured tool output.
"""
    
    structured_llm = llm.with_structured_output(RouteDecision)
    
    # Keep sliding window of last 20 messages (approx 10 turns)
    window = messages[-20:]
    input_messages = [SystemMessage(content=system_prompt)] + window
    
    try:
        response = structured_llm.invoke(input_messages)
        route = response.route.lower()
        if route not in ["goal_architect", "insight_agent", "unsupported"]:
            route = "unsupported"
        return {"route": route}
    except Exception as e:
        logger.error(f"Supervisor LLM Error: {e}")
        return {"error": "StudyFlow AI is currently offline.", "route": "unsupported"}
