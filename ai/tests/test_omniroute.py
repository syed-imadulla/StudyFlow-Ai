import pytest
import os
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_omniroute_real_llm():
    if not os.getenv("OMNIROUTE_API_KEY"):
        pytest.skip("OMNIROUTE_API_KEY is not set. Skipping real LLM integration test.")
        
    # We must explicitly disable the mock behavior just for this test,
    # but normally the runner might have MOCK_LLM=true in the env.
    original_mock = os.getenv("MOCK_LLM")
    os.environ["MOCK_LLM"] = "false"
    
    try:
        # Note: In real life, the Node.js proxy provides the token payload
        # through X-User-Id or similar. But since we are directly hitting the
        # Python endpoint (which assumes the gateway has authenticated), we just pass
        # valid required fields. 
        # But wait, our API expects a JWT token? The python backend gets 
        # Authorization header and passes it to the graph state.
        
        headers = {
            "Authorization": "Bearer mock-token" 
        }
        
        payload = {
            "prompt": "Explain what StudyFlow AI does in one sentence.",
            "thread_id": "test_real_llm_001"
        }
        
        response = client.post("/api/v1/agent/insight", json=payload, headers=headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "success" in data
        assert data["success"] is True
        
        # We expect a natural language response in "message", or potentially a pending action 
        # (though for this prompt, it shouldn't trigger an action).
        assert "message" in data or "pending_action" in data
        
    finally:
        # Restore original state
        if original_mock is not None:
            os.environ["MOCK_LLM"] = original_mock
        else:
            del os.environ["MOCK_LLM"]
