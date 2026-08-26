import os
import requests

os.environ["MOCK_LLM"] = "false"

def test_tracker_logic():
    base_url = "http://127.0.0.1:8000/api/v1/agent/insight"
    headers = {"Authorization": "Bearer MOCK_TOKEN"}
    thread_id = "tracker_test_004"
    
    # Message 1
    resp1 = requests.post(
        base_url, 
        json={"prompt": "I want to build a React portfolio in 30 days and can spend 2 hours daily.", "thread_id": thread_id},
        headers=headers
    ).json()
    gs1 = resp1.get("goal_state", {})
    print(f"Turn 1 goal_state: {gs1}")
    assert gs1.get("goal") is not None
    assert gs1.get("why") in (None, "", "null", "None")
    
    # Message 2
    resp2 = requests.post(
        base_url, 
        json={"prompt": "I want to showcase 3 projects and use a modern dark design.", "thread_id": thread_id},
        headers=headers
    ).json()
    gs2 = resp2.get("goal_state", {})
    print(f"Turn 2 goal_state: {gs2}")
    assert gs2.get("goal") is not None
    assert gs2.get("brain_dump") is not None
    
    # Message 3
    resp3 = requests.post(
        base_url, 
        json={"prompt": "Actually, I can only spend 1 hour daily and need it finished in 3 weeks.", "thread_id": thread_id},
        headers=headers
    ).json()
    gs3 = resp3.get("goal_state", {})
    print(f"Turn 3 goal_state: {gs3}")
    assert "1 hour" in gs3.get("time", "")
    assert "3 weeks" in gs3.get("deadline", "")
    
    # Message 4
    resp4 = requests.post(
        base_url, 
        json={"prompt": "Actually, forget the portfolio. I want to build a personal finance tracker.", "thread_id": thread_id},
        headers=headers
    ).json()
    gs4 = resp4.get("goal_state", {})
    print(f"Turn 4 goal_state: {gs4}")
    assert "finance" in gs4.get("goal", "").lower()
    assert "portfolio" not in gs4.get("goal", "").lower()
    
    print("ALL API TRACKER TESTS PASSED!")

if __name__ == "__main__":
    test_tracker_logic()
