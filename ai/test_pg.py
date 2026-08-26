import requests
import time
import uuid
import json

url = "http://127.0.0.1:8000/api/v1/agent/insight"
headers = {"Authorization": "Bearer test_token"}
tid = str(uuid.uuid4())

print("Sending Msg 1...")
res1 = requests.post(url, headers=headers, json={"prompt": "I want to build a React portfolio in 30 days and can spend 2 hours daily.", "thread_id": tid})
print("Status:", res1.status_code)
d1 = res1.json()
print(json.dumps(d1, indent=2))
print(f"Goal State 1: {d1.get('extracted_state')}")

print("\nSending Msg 2...")
t0 = time.time()
res2 = requests.post(url, headers=headers, json={"prompt": "Job hunting.", "thread_id": tid})
print("Status:", res2.status_code)
d2 = res2.json()
print(json.dumps(d2, indent=2))
print(f"Goal State 2: {d2.get('extracted_state')}")
print(f"Time for Msg 2: {time.time()-t0:.2f}s")
