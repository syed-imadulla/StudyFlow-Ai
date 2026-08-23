import requests
import uuid
import json
import os

url = "http://127.0.0.1:5000/api/v1/agent/chat"

# We must get a token first
login_data = {"email": "test@example.com", "password": "Password123!"}
res = requests.post("http://127.0.0.1:5000/api/v1/auth/login", json=login_data)
if res.status_code != 200:
    res = requests.post("http://127.0.0.1:5000/api/v1/auth/register", json={"name":"test","email":"test@example.com","password":"Password123!"})
token = res.json().get("token") or res.json().get("data", {}).get("accessToken")

headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
thread_id = str(uuid.uuid4())

print("--- Test 1: Minimal Context Routing ---")
data = {"prompt": "Build a personal portfolio website", "thread_id": thread_id}
print("User:", data["prompt"])
res = requests.post(url, json=data, headers=headers)
print("AI:", res.json().get("message", res.text))

print("\n--- Test 2: Provide details ---")
data = {"prompt": "I want to build it using React and TailwindCSS. I have about 2 hours daily and want to finish in 2 weeks. I'm afraid of styling issues.", "thread_id": thread_id}
print("User:", data["prompt"])
res = requests.post(url, json=data, headers=headers)
print("AI:", res.json().get("message", res.text))
if res.json().get("pending_action"):
    print("ACTION PENDING:", res.json().get("pending_action"))

