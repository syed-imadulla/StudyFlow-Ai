import os
import requests
import logging
from typing import Optional
from langchain_core.tools import tool
from langchain_core.runnables.config import RunnableConfig
from app.config import config as app_config

logger = logging.getLogger(__name__)

def _get_auth_headers(config: RunnableConfig) -> dict:
    jwt_token = config.get("configurable", {}).get("jwt_token")
    if not jwt_token:
        raise ValueError("Missing JWT token in configurable state.")
    return {"Authorization": f"Bearer {jwt_token}"}

def _make_request(endpoint: str, config: RunnableConfig, params: dict = None) -> str:
    try:
        headers = _get_auth_headers(config)
        url = f"{app_config.NODE_API_URL}{endpoint}"
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code == 200:
            return response.text
        elif response.status_code == 401:
            return '{"error": "Authentication expired or invalid."}'
        else:
            logger.error(f"Node API returned {response.status_code}: {response.text}")
            return '{"error": "Failed to retrieve data from service."}'
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to Node.js failed: {e}")
        return '{"error": "Service is currently unavailable."}'
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return '{"error": "An unexpected error occurred."}'

def _make_post_request(endpoint: str, config: RunnableConfig, payload: dict) -> str:
    try:
        headers = _get_auth_headers(config)
        url = f"{app_config.NODE_API_URL}{endpoint}"
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        
        if response.status_code in [200, 201]:
            return response.text
        elif response.status_code == 401:
            return '{"error": "Authentication expired or invalid."}'
        else:
            logger.error(f"Node API returned {response.status_code}: {response.text}")
            return f'{{"error": "Failed to create/update: {response.text}"}}'
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to Node.js failed: {e}")
        return '{"error": "Service is currently unavailable."}'
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return '{"error": "An unexpected error occurred."}'

@tool
def get_user_preferences(config: RunnableConfig) -> str:
    """Gets the user's long-term saved AI preferences and memory."""
    return _make_request("/api/v1/tools/preferences", config)

@tool
def save_user_preference(ai_preferences: str, config: RunnableConfig) -> str:
    """Updates the user's long-term saved AI preferences. Use this to remember important details across sessions."""
    payload = {"ai_preferences": ai_preferences}
    return _make_post_request("/api/v1/tools/preferences", config, payload)

@tool
def get_analytics_summary(config: RunnableConfig, period: str = "last7") -> str:
    """Gets the user's focus and task analytics summary. Period can be 'last7', 'last30', etc."""
    return _make_request("/api/v1/tools/analytics/summary", config, params={"period": period})

@tool
def get_active_goals(config: RunnableConfig) -> str:
    """Gets the user's currently active study goals (max 10)."""
    return _make_request("/api/v1/tools/goals/active", config)

@tool
def get_goal_details(goal_id: str, config: RunnableConfig) -> str:
    """Gets details and subtasks for a specific goal ID."""
    return _make_request(f"/api/v1/tools/goals/{goal_id}", config)

@tool
def get_todays_tasks(config: RunnableConfig) -> str:
    """Gets the user's tasks due today (max 10)."""
    return _make_request("/api/v1/tools/tasks/today", config)

@tool
def get_goal_tasks(goal_id: str, config: RunnableConfig) -> str:
    """Gets tasks associated with a specific goal ID (max 10)."""
    return _make_request(f"/api/v1/tools/tasks/goal/{goal_id}", config)

@tool
def get_todays_schedule(config: RunnableConfig) -> str:
    """Gets the user's planner/schedule events for today (max 10)."""
    return _make_request("/api/v1/tools/planner/today", config)

@tool
def get_upcoming_schedule(config: RunnableConfig) -> str:
    """Gets the user's upcoming planner/schedule events for the next 7 days (max 10)."""
    return _make_request("/api/v1/tools/planner/upcoming", config)

@tool
def get_todays_focus(config: RunnableConfig) -> str:
    """Gets the user's focus statistics for today."""
    return _make_request("/api/v1/tools/focus/today", config)

@tool
def get_recent_focus(config: RunnableConfig) -> str:
    """Gets the user's most recent focus sessions (max 10)."""
    return _make_request("/api/v1/tools/focus/recent", config)

@tool
def create_goal(title: str, description: str, targetHours: int, rawDump: str, ai_summary: str, deadline_mode: str, subtasks: list = None, deadline_date: str = None, deadline_value: int = None, deadline_unit: str = None, config: RunnableConfig = None) -> str:
    """Creates a new study goal for the user. Requires explicit user approval."""
    payload = {
        "title": title, 
        "description": description, 
        "targetHours": targetHours,
        "rawDump": rawDump,
        "ai_summary": ai_summary,
        "subtasks": subtasks,
        "deadline": {
            "mode": deadline_mode,
            "date": deadline_date,
            "value": deadline_value,
            "unit": deadline_unit
        }
    }
    return _make_post_request("/api/v1/tools/goals", config, payload)

@tool
def schedule_task(title: str, goalId: str, estimatedMinutes: int, dueDate: str, config: RunnableConfig) -> str:
    """Schedules a new task for a specific goal. Requires explicit user approval."""
    payload = {"title": title, "goalId": goalId, "estimatedMinutes": estimatedMinutes, "dueDate": dueDate}
    return _make_post_request("/api/v1/tools/tasks", config, payload)

@tool
def search_study_notes(query: str, config: RunnableConfig) -> str:
    """Searches the user's uploaded study notes and PDF documents for answers."""
    try:
        token = config.get("configurable", {}).get("jwt_token", "")
        import jwt
        from app.config import config as app_config
        decoded = jwt.decode(token, app_config.JWT_SECRET, algorithms=["HS256"])
        user_id = decoded.get("id")
        
        from app.rag.pipeline import search_user_documents
        results = search_user_documents(query, user_id, k=3)
        
        if not results:
            return "No matching information found in your uploaded documents."
            
        formatted = "Found the following excerpts:\n\n"
        for i, r in enumerate(results):
            formatted += f"--- Excerpt {i+1} (from {r['metadata'].get('document_name', 'unknown')}) ---\n"
            formatted += f"{r['content']}\n\n"
            
        return formatted
    except Exception as e:
        logger.error(f"Error in search_study_notes: {e}")
        return '{"error": "Failed to search documents."}'
@tool
def search_web_resources(query: str, config: RunnableConfig) -> str:
    """Searches the web (Wikipedia) for educational resources and reference materials."""
    import urllib.parse
    import json
    
    url = f"https://en.wikipedia.org/w/api.php?action=opensearch&search={urllib.parse.quote(query)}&limit=3&namespace=0&format=json"
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if len(data) >= 4 and data[1]:
                titles = data[1]
                urls = data[3]
                results = []
                for i in range(len(titles)):
                    results.append(f"Resource: {titles[i]}\nURL: {urls[i]}")
                return "Found the following resources:\n" + "\n\n".join(results)
            return "No relevant resources found."
        return "Failed to search for resources at this time."
    except Exception as e:
        logger.error(f"Search API error: {e}")
        return "Search service is temporarily unavailable."
