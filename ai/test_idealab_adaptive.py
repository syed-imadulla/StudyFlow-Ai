import os
import sys
import json
import requests

API_URL = "http://127.0.0.1:8000/api/v1/agent/insight"
THREAD_ID = "idealab_test_adaptive_1"

def chat(prompt):
    print(f"\nUser: {prompt}")
    headers = {"Authorization": "Bearer test-jwt-token"}
    res = requests.post(API_URL, json={"prompt": prompt, "thread_id": THREAD_ID, "user_id": "test_user"}, headers=headers)
    data = res.json()
    if data.get("pending_action"):
        print(f"AI Tool Proposal: {json.dumps(data['pending_action'], indent=2)}")
    else:
        print(f"AI: {data.get('message')}")

print("Testing Adaptive IdeaLab Flow...")
chat("I want to build a portfolio website.")
chat("I want to show off my developer skills to get a job. I know React and Tailwind.")
chat("I need it in 2 weeks. I can spend 2 hours a day.")
