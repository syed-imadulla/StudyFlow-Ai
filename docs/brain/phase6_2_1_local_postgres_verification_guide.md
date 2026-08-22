# Phase 6.2.1: Local PostgreSQL Verification Guide

This document outlines the exact manual steps required to verify the LangGraph PostgreSQL checkpointer on your local Ubuntu machine. Because Docker was unavailable in the AI environment, these tests were marked as **BLOCKED** in the QA report. You must perform them to officially close the verification gaps.

**Pre-requisites:**
- Do **NOT** install PostgreSQL directly on Ubuntu.
- You must use Docker.

---

## Step 1: Check Docker Availability

Ensure Docker is installed and running on your system.

```bash
docker --version
```
**Evidence:** The terminal should return your Docker version (e.g., `Docker version 24.0.5, build ced0996`).

---

## Step 2: Start PostgreSQL in Docker

Spin up an ephemeral PostgreSQL instance.

```bash
docker run --name studyflow-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -d postgres:15
```
**Evidence:** The command should return the container ID. Running `docker ps` should show `studyflow-postgres` actively running on port 5432.

---

## Step 3: Configure Environment

Set the required environment variable to bind to your new local database. Export it in the terminal where you will run the Python AI service.

```bash
export POSTGRES_URI=postgresql://postgres:postgres@127.0.0.1:5432/postgres
```

---

## Step 4 & 5: Start Python AI Service & Verify Backend Selection

Navigate to your `ai` directory, activate your environment, and start the service.

```bash
cd ai
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8001
```

**Evidence:** Inspect the startup logs. You must explicitly see:
> `INFO:app.graph.builder:LangGraph checkpoint backend: PostgreSQL`

*Do not accept a successful HTTP response as proof by itself. If you see "MemorySaver fallback", your connection string or Docker instance is failing.*

---

## Step 6 & 7: Test Thread Persistence (Write Checkpoint)

Send an AI request to the Python service via HTTP POST or through your Node.js backend using a specific thread ID:

```json
{
  "prompt": "Help me plan my goals.",
  "thread_id": "qa-thread-001"
}
```

**Evidence:** The request should succeed. Observe the `uvicorn` logs to ensure no SQL errors occurred during the state saving process.

---

## Step 8: Test Same-Thread Persistence (Read Checkpoint)

Send a follow-up request using the SAME `thread_id`:

```json
{
  "prompt": "What did I just ask you to do?",
  "thread_id": "qa-thread-001"
}
```

**Evidence:** The AI should correctly recall that you asked for help planning your goals. This proves the graph is actively reading the persisted state.

---

## Step 9, 10 & 11: Test Process Restart Persistence (MANDATORY)

This is the critical test to prove state is physically persisted in PostgreSQL rather than process-local memory.

1. **Stop the Python AI service** completely (CTRL+C).
2. **Start it again** (`uvicorn app.main:app --host 127.0.0.1 --port 8001`).
3. **Send another request** using `qa-thread-001`:

```json
{
  "prompt": "Can you summarize what we have discussed so far?",
  "thread_id": "qa-thread-001"
}
```

**Evidence:** The AI should successfully retrieve the conversation history created *before* the process was killed. If it claims there is no prior conversation, persistence failed.

---

## Step 12 & 13: Verify Thread Isolation

Create a new thread to ensure cross-thread data boundaries hold.

```json
{
  "prompt": "Can you summarize what we have discussed so far?",
  "thread_id": "qa-thread-002"
}
```

**Evidence:** The AI should respond that there is no previous conversation or context. No state from `qa-thread-001` should leak into `qa-thread-002`.

---

## Step 14, 15 & 16: Test MemorySaver Fallback

1. **Stop PostgreSQL:**
```bash
docker stop studyflow-postgres
```
2. **Restart the AI service.**
3. **Verify Startup Log:** Ensure it does not hang indefinitely (it should time out after ~5 seconds) and prints:
> `WARNING:app.graph.builder:LangGraph checkpoint backend: MemorySaver fallback`

**Evidence:** The log explicit state fallback.

---

## Step 17: Confirm Service Still Responds

With PostgreSQL down and MemorySaver active, send any valid request:

```json
{
  "prompt": "Help me plan my goals."
}
```

**Evidence:** The service responds successfully (status 200).

---

## Step 18 & 19: Final Regression

Ensure nothing was fundamentally broken by the DB state transitions. Run your backend integration tests:

```bash
cd backend
npm run test:integration
```

**Evidence:** The terminal should report exactly `61/61` passing tests.
