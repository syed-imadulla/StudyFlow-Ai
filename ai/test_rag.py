import urllib.request
import urllib.error
import json
import time

API_URL = "http://localhost:8000/api/v1/agent/insight"
THREAD_ID = "rag-test-thread-" + str(int(time.time()))
TOKEN = "dummy-jwt-token"

def chat(prompt):
    print(f"\nUser: {prompt}")
    data = json.dumps({"prompt": prompt, "thread_id": THREAD_ID}).encode("utf-8")
    req = urllib.request.Request(API_URL, data=data, headers={
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json"
    }, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=30) as res:
            res_data = json.loads(res.read().decode("utf-8"))
            print(f"AI: {res_data.get('message', '')}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    print("Testing RAG Flow...")
    chat("What does my DBMS PDF say about normalization?")
    chat("And what about Dijkstra's algorithm from my algorithms notes?")
