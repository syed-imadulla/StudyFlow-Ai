import urllib.request
import json

import jwt

url = "http://127.0.0.1:8000/api/v1/agent/insight"
dummy_token = jwt.encode({"id": "test_user"}, "SF_SUPER_SECRET_JWT_KEY_2024", algorithm="HS256")
headers = {"Content-Type": "application/json", "Authorization": f"Bearer {dummy_token}"}

import uuid

thread_id = "idealab_test_" + str(uuid.uuid4())

payload1 = {
    "prompt": "I want to learn Python",
    "thread_id": thread_id
}

req1 = urllib.request.Request(url, data=json.dumps(payload1).encode('utf-8'), headers=headers)
try:
    response1 = urllib.request.urlopen(req1)
    print("User: I want to learn Python")
    res_body1 = json.loads(response1.read().decode('utf-8'))
    print("AI:", res_body1.get('message'))
    print("Pending Action:", res_body1.get('pending_action'))
    
    # Simulating the user answering adaptively
    payload2 = {
        "prompt": "I want to learn it to automate tasks at work. My deadline is 1 week.",
        "thread_id": thread_id
    }
    print("\nUser: I want to learn it to automate tasks at work. My deadline is 1 week.")
    req2 = urllib.request.Request(url, data=json.dumps(payload2).encode('utf-8'), headers=headers)
    response2 = urllib.request.urlopen(req2)
    res_body2 = json.loads(response2.read().decode('utf-8'))
    print("AI:", res_body2.get('message'))
    print("Pending Action:", res_body2.get('pending_action'))
except Exception as e:
    print("Error:", e)
