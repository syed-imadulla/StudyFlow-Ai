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
            max_tokens=2048,
            timeout=60.0,    # Increased timeout for real LLM reasoning through OmniRoute
            max_retries=1
        )
    except Exception as e:
        logger.error(f"Failed to initialize OmniRoute LLM: {e}")
        return None

def handle_llm_error(e: Exception) -> str:
    err_msg = str(e).lower()
    if "timeout" in err_msg or "timed out" in err_msg:
        return "StudyFlow AI is taking a little longer than expected."
    elif "429" in err_msg or "rate limit" in err_msg or "too many requests" in err_msg:
        return "Your request was rate-limited. Please try again."
    elif "404" in err_msg or "not found" in err_msg:
        return "The requested AI model is currently unavailable."
    else:
        return "StudyFlow AI is temporarily unavailable."
