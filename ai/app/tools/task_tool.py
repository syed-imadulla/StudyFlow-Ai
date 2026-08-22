import requests
import logging
from app.config import config

logger = logging.getLogger(__name__)

def fetch_tasks(jwt_token: str) -> str:
    """
    Fetches the user's tasks from the Node.js Tool API.
    Returns the JSON string or an error message.
    """
    try:
        headers = {"Authorization": f"Bearer {jwt_token}"}
        url = f"{config.NODE_API_URL}/api/v1/tools/tasks"
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return response.text
        else:
            logger.error(f"Node.js API returned {response.status_code}: {response.text}")
            return '{"error": "Could not retrieve tasks data."}'
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to Node.js failed: {e}")
        return '{"error": "Task service is currently unavailable."}'
