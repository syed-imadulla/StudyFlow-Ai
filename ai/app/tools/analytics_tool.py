import requests
import logging
from app.config import config

logger = logging.getLogger(__name__)

def fetch_analytics_summary(jwt_token: str) -> str:
    """
    Fetches the analytics summary from the Node.js Tool API.
    Returns the JSON string or an error message.
    """
    try:
        headers = {"Authorization": f"Bearer {jwt_token}"}
        # Assuming the Node.js API is available at config.NODE_API_URL
        url = f"{config.NODE_API_URL}/api/v1/tools/analytics/summary"
        
        response = requests.get(url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            return response.text # Return raw JSON text for the agent to read
        else:
            logger.error(f"Node.js API returned {response.status_code}: {response.text}")
            return '{"error": "Could not retrieve analytics data."}'
            
    except requests.exceptions.RequestException as e:
        logger.error(f"Request to Node.js failed: {e}")
        return '{"error": "Analytics service is currently unavailable."}'
