import logging
from typing import TypedDict, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from app.llm.gemini import get_llm
from langgraph.graph import StateGraph, END
import json
import os

logger = logging.getLogger(__name__)

class AgentState(TypedDict):
    jwt_token: str
    prompt: str
    route: Optional[str]
    analytics_data: Optional[str]
    goals_data: Optional[str]
    tasks_data: Optional[str]
    final_insight: Optional[str]
    error: Optional[str]

def supervisor_node(state: AgentState):
    logger.info("Executing supervisor_node")
    prompt = state.get("prompt", "")
    
    # Check if we should mock the LLM for tests
    if os.getenv("MOCK_LLM") == "true":
        if "goal" in prompt.lower():
            return {"route": "goal_architect"}
        elif "insight" in prompt.lower() or "analytics" in prompt.lower():
            return {"route": "insight_agent"}
        else:
            return {"route": "unsupported"}
            
    llm = get_llm()
    if not llm:
        return {"error": "StudyFlow AI is currently offline.", "route": "unsupported"}
        
    system_prompt = """You are a routing supervisor.
Based on the user's prompt, you must classify their intent into exactly one of the following routes:
- "goal_architect": The user is asking about their goals, tasks, planning, or recommendations.
- "insight_agent": The user is asking for an analytics insight, focus summary, or study patterns.
- "unsupported": The user is asking for something unrelated to goals, tasks, or study analytics.

Respond with ONLY the route name. Do not include any other text.
"""
    
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        route = response.content.strip().lower()
        if route not in ["goal_architect", "insight_agent", "unsupported"]:
            route = "unsupported"
        return {"route": route}
    except Exception as e:
        logger.error(f"Supervisor LLM Error: {e}")
        return {"error": "StudyFlow AI is currently offline.", "route": "unsupported"}
