import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    NODE_API_URL = os.getenv("NODE_API_URL", "http://localhost:5000")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    PORT = int(os.getenv("PORT", "8000"))

config = Config()
