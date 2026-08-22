import logging
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.graph.builder import build_graph
from app.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="StudyFlow AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile graph once on startup
graph = build_graph()

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "StudyFlow AI"}

from pydantic import BaseModel
from typing import Optional
import uuid

class AgentRequest(BaseModel):
    prompt: Optional[str] = None
    thread_id: Optional[str] = None

@app.post("/api/v1/agent/insight")
async def generate_insight(request: Request):
    """
    Receives request from Node.js backend or frontend.
    Extracts JWT and executes the LangGraph graph.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    
    # Try to parse body for prompt and thread_id
    try:
        body_json = await request.json()
        req_body = AgentRequest(**body_json)
    except Exception:
        # If no body provided, use default (for backwards compatibility with Phase 6.1)
        req_body = AgentRequest(prompt="Give me a study analytics insight.", thread_id=str(uuid.uuid4()))
        
    prompt = req_body.prompt if req_body.prompt else "Give me a study analytics insight."
    # Use provided thread_id, else generate a random one to avoid collision if not specified
    thread_id = req_body.thread_id if req_body.thread_id else str(uuid.uuid4())
    
    from langchain_core.messages import HumanMessage
    initial_state = {
        "jwt_token": token,
        "messages": [HumanMessage(content=prompt)],
        "final_insight": "",
        "error": ""
    }
    
    config_dict = {"configurable": {"thread_id": thread_id, "jwt_token": token}}
    
    try:
        final_state = graph.invoke(initial_state, config=config_dict)
        insight = final_state.get("final_insight", "StudyFlow AI is currently offline.")
        return {"success": True, "message": insight}
    except Exception as e:
        logger.error(f"Graph execution failed: {e}")
        return {"success": False, "message": "StudyFlow AI is currently unavailable. Your study data is still safe."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
