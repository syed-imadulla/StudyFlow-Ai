import logging
import json
import os
from typing import Dict, Any
from app.llm.gemini import get_llm
from app.tools.analytics_tool import fetch_analytics_summary
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

def insight_agent_node(state: Dict[str, Any]):
    logger.info("Executing insight_agent_node")
    token = state.get("jwt_token")
    
    if not token:
        return {"error": "Missing authentication token"}
        
    analytics_data = fetch_analytics_summary(token)
    
    if os.getenv("MOCK_LLM") == "true":
        return {
            "analytics_data": analytics_data,
            "final_insight": "Mock Insight Agent response."
        }
    
    try:
        parsed_data = json.loads(analytics_data)
        if "error" in parsed_data:
            return {"final_insight": "StudyFlow AI is currently unavailable. Your study data is still safe."}
            
        summary = parsed_data.get("data", {})
        total_sessions = summary.get("totalCompletedSessions", 0)
        total_duration = summary.get("totalFocusDuration", 0)
        
        if total_sessions == 0 or total_duration == 0:
            return {"final_insight": "Not enough data yet to identify a reliable pattern. Complete some focus sessions first!"}
            
    except json.JSONDecodeError:
        return {"final_insight": "StudyFlow AI is currently unavailable (data parse error)."}
        
    llm = get_llm()
    if not llm:
        return {"final_insight": "StudyFlow AI is currently offline. Your study data is still safe."}

    system_prompt = f"""You are the StudyFlow AI coach. Analyze the user's weekly study data below.
Provide a concise, encouraging paragraph (max 2 sentences) highlighting what went well and what needs attention.
Do not invent metrics, focus durations, task completions, or trends.
If data is insufficient, say "Not enough data yet to identify a reliable pattern."

Analytics Data:
{analytics_data}
"""
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=state.get("prompt", "Analyze my study data."))
    ]
    
    try:
        response = llm.invoke(messages)
        return {
            "analytics_data": analytics_data,
            "final_insight": response.content.strip()
        }
    except Exception as e:
        logger.error(f"Insight Agent LLM Error: {e}")
        return {"final_insight": "StudyFlow AI is currently offline. Your study data is still safe."}
