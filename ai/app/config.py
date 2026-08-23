import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:5000")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    PORT = int(os.getenv("PORT", "8000"))
    OMNIROUTE_API_KEY = os.getenv("OMNIROUTE_API_KEY")
    OMNIROUTE_BASE_URL = os.getenv("OMNIROUTE_BASE_URL", "https://api.omniroute.ai/v1")
    OMNIROUTE_MODEL = os.getenv("OMNIROUTE_MODEL", "meta-llama/llama-3-70b-instruct")

config = Config()
