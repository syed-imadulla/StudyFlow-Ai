import logging
import json
import os
from typing import Dict, Any
from app.llm.gemini import get_llm
from app.tools.goal_tool import fetch_goals
from app.tools.task_tool import fetch_tasks
from langchain_core.messages import SystemMessage, HumanMessage

logger = logging.getLogger(__name__)

def goal_architect_node(state: Dict[str, Any]):
    logger.info("Executing goal_architect_node")
    token = state.get("jwt_token")
    prompt = state.get("prompt", "")
    
    if not token:
        return {"error": "Missing authentication token"}
        
    goals_data = fetch_goals(token)
    tasks_data = fetch_tasks(token)
    
    if os.getenv("MOCK_LLM") == "true":
        return {
            "goals_data": goals_data,
            "tasks_data": tasks_data,
            "final_insight": f"Mock Goal Architect response for: {prompt}"
        }
        
    llm = get_llm()
    if not llm:
        return {"final_insight": "StudyFlow AI is currently offline."}
        
    system_prompt = f"""You are the Goal Architect, a READ-ONLY assistant.
You can inspect the user's Goals and Tasks below and provide reasoning and recommendations.
You cannot create, update, or delete any items.

Goals Data:
{goals_data}

Tasks Data:
{tasks_data}

Provide a helpful, concise response to the user's prompt based on their data.
"""
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=prompt)
    ]
    
    try:
        response = llm.invoke(messages)
        return {
            "goals_data": goals_data,
            "tasks_data": tasks_data,
            "final_insight": response.content.strip()
        }
    except Exception as e:
        logger.error(f"Goal Architect LLM Error: {e}")
        return {"final_insight": "StudyFlow AI is currently offline."}
