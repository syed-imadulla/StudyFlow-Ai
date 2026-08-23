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
def create_goal(title: str, description: str, targetHours: int, config: RunnableConfig) -> str:
    """Creates a new study goal for the user. Requires explicit user approval."""
    payload = {"title": title, "description": description, "targetHours": targetHours}
    return _make_post_request("/api/v1/tools/goals", config, payload)

@tool
def schedule_task(title: str, goalId: str, estimatedMinutes: int, dueDate: str, config: RunnableConfig) -> str:
    """Schedules a new task for a specific goal. Requires explicit user approval."""
    payload = {"title": title, "goalId": goalId, "estimatedMinutes": estimatedMinutes, "dueDate": dueDate}
    return _make_post_request("/api/v1/tools/tasks", config, payload)
