import logging
from langchain_openai import ChatOpenAI
from app.config import config

logger = logging.getLogger(__name__)

def get_llm():
    if not config.OMNIROUTE_API_KEY:
        logger.error("OMNIROUTE_API_KEY is not set.")
        return None
        
    try:
        # Initialize ChatOpenAI pointing to OmniRoute's base URL
        return ChatOpenAI(
            model=config.OMNIROUTE_MODEL,
            api_key=config.OMNIROUTE_API_KEY,
            base_url=config.OMNIROUTE_BASE_URL,
            temperature=0.2, # Low temperature for more deterministic insights
            max_tokens=150,
            timeout=10.0,    # 10s timeout to avoid hanging the FastAPI server
            max_retries=1
        )
    except Exception as e:
        logger.error(f"Failed to initialize OmniRoute LLM: {e}")
        return None
