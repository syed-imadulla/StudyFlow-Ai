from langchain_google_genai import ChatGoogleGenerativeAI
from app.config import config
import logging

logger = logging.getLogger(__name__)

def get_llm():
    if not config.GEMINI_API_KEY:
        logger.error("GEMINI_API_KEY is not set.")
        return None
    try:
        # Using gemini-1.5-flash as the fast/free model for Phase 6.1
        return ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=config.GEMINI_API_KEY,
            temperature=0.2, # Low temperature for more deterministic insights
            max_output_tokens=150
        )
    except Exception as e:
        logger.error(f"Failed to initialize Gemini: {e}")
        return None
