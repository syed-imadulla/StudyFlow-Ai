import logging
from fastapi import FastAPI, HTTPException, Request, Depends, BackgroundTasks, UploadFile, File
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
    agent_type: Optional[str] = None

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
    
    # If agent_type is idealab, we bypass the supervisor entirely by setting the initial route.
    route = "goal_architect" if req_body.agent_type == "idealab" else "supervisor"
    
    from langchain_core.messages import HumanMessage
    initial_state = {
        "jwt_token": token,
        "messages": [HumanMessage(content=prompt)],
        "route": route,
        "final_insight": "",
        "error": ""
    }
    
    config_dict = {"configurable": {"thread_id": thread_id, "jwt_token": token}, "recursion_limit": 15}
    
    try:
        final_state = graph.invoke(initial_state, config=config_dict)
        
        state_snapshot = graph.get_state(config_dict)
        if state_snapshot.next:
            pending_action = final_state.get("pending_action")
            
            raw_goal_state = final_state.get("goal_state") or {}
            safe_goal_state = {
                k: raw_goal_state.get(k)
                for k in ["goal", "why", "deadline", "brain_dump", "time", "resources", "obstacles"]
            }
            
            insight = final_state.get("final_insight", "Approval required for action.")
            
            import re
            center_question = ""
            match = re.search(r'<center>(.*?)</center>', insight, flags=re.DOTALL | re.IGNORECASE)
            if match:
                center_question = match.group(1).strip()
                insight = re.sub(r'<center>.*?</center>', '', insight, flags=re.DOTALL | re.IGNORECASE).strip()
                
            return {
                "success": True, 
                "message": insight, 
                "center_question": center_question,
                "pending_action": pending_action,
                "goal_state": safe_goal_state
            }
            
        insight = final_state.get("final_insight", "StudyFlow AI is currently offline.")
        
        # Phase 3: Extract <center> question
        import re
        center_question = ""
        match = re.search(r'<center>(.*?)</center>', insight, flags=re.DOTALL | re.IGNORECASE)
        if match:
            center_question = match.group(1).strip()
            insight = re.sub(r'<center>.*?</center>', '', insight, flags=re.DOTALL | re.IGNORECASE).strip()

        # Phase 2: return structured goal_state so frontend can sync the step tracker.
        # Only expose the 7 user-facing fields — not raw LangGraph internals.
        raw_goal_state = final_state.get("goal_state") or {}
        safe_goal_state = {
            k: raw_goal_state.get(k)
            for k in ["goal", "why", "deadline", "brain_dump", "time", "resources", "obstacles"]
        }
        return {"success": True, "message": insight, "center_question": center_question, "goal_state": safe_goal_state}
    except Exception as e:
        if "recursion" in str(e).lower() or type(e).__name__ == "GraphRecursionError":
            logger.error(f"Graph recursion limit reached: {e}")
            return {"success": False, "message": "I'm having trouble analyzing this right now (too many steps). Please try simplifying your request."}
            
        logger.error(f"Graph execution failed: {e}")
        return {"success": False, "message": "StudyFlow AI is currently unavailable. Your study data is safe."}

class ActionResumeRequest(BaseModel):
    thread_id: str
    approved: bool

@app.post("/api/v1/agent/action/resume")
async def resume_action(request: Request, body: ActionResumeRequest):
    """
    Resumes a paused LangGraph thread based on user approval.
    """
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    config_dict = {"configurable": {"thread_id": body.thread_id, "jwt_token": token}, "recursion_limit": 15}
    
    try:
        state_snapshot = graph.get_state(config_dict)
        
        # Check if actually paused at action_tools
        if "action_tools" not in state_snapshot.next:
            return {"success": False, "message": "No pending action found for this thread."}
            
        pending = state_snapshot.values.get("pending_action")
        if not pending:
            return {"success": False, "message": "No pending action data found."}
            
        if not body.approved:
            from langchain_core.messages import ToolMessage
            # If rejected, inject a tool error message and simulate that action_tools executed
            tool_call_id = pending.get("tool_call_id")
            action_name = pending.get("action")
            rejection_msg = ToolMessage(tool_call_id=tool_call_id, name=action_name, content='{"error": "User rejected this action."}')
            
            # Update state as if action_tools executed, clear pending_action
            graph.update_state(config_dict, {"messages": [rejection_msg], "pending_action": None}, as_node="action_tools")
            
        # Resume graph execution (either it will actually run action_tools, or it skips it because we updated state as_node)
        final_state = graph.invoke(None, config=config_dict)
        
        # Check if it paused again (unlikely unless multiple actions)
        state_snapshot_after = graph.get_state(config_dict)
        if state_snapshot_after.next:
            pending_action = final_state.get("pending_action")
            return {
                "success": True, 
                "message": "Approval required for action.", 
                "pending_action": pending_action
            }
            
        insight = final_state.get("final_insight", "StudyFlow AI is currently offline.")
        return {"success": True, "message": insight}
        
    except Exception as e:
        if "recursion" in str(e).lower() or type(e).__name__ == "GraphRecursionError":
            logger.error(f"Graph recursion limit reached in resume: {e}")
            return {"success": False, "message": "I'm having trouble analyzing this right now (too many steps). Please try simplifying your request."}
            
        logger.error(f"Graph resume failed: {e}")
        return {"success": False, "message": "Failed to resume action."}

@app.post("/api/v1/agent/rag/upload")
async def upload_document(request: Request, file: UploadFile = File(...)):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    
    token = auth_header.split(" ")[1]
    
    try:
        import jwt
        from app.config import config
        decoded = jwt.decode(token, config.JWT_SECRET, algorithms=["HS256"])
        user_id = decoded.get("id")
        
        import tempfile
        import os
        from app.rag.pipeline import process_and_upload_document
        
        # Save temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as temp_file:
            content = await file.read()
            temp_file.write(content)
            temp_path = temp_file.name
            
        result = process_and_upload_document(temp_path, user_id, file.filename)
        os.remove(temp_path)
        
        if result["success"]:
            return {"success": True, "message": f"Successfully processed {result['chunks_added']} chunks from {file.filename}"}
        else:
            raise HTTPException(status_code=500, detail=result.get("error", "Failed to process document"))
            
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=config.PORT)
