# Phase 6.2.1 Completion Report

## Final Architecture
The architecture has been updated to include a LangGraph-based Supervisor that routes requests dynamically while maintaining the following data flow:
`Frontend -> Node.js -> Python LangGraph -> Python Tool -> Node.js Tool API -> Service -> MongoDB`

All business logic (GoalService, TaskService) remains strictly in the Node.js layer. The Python agents are restricted to interacting with the data exclusively through the new Tool APIs.

### Supervisor
The `Supervisor` agent acts as the entry point for the LangGraph workflow. It evaluates the user's prompt and routes the request to exactly one of the following:
- `goal_architect`: For goal planning, task analysis, and recommendations.
- `insight_agent`: For analytics, focus sessions, and study patterns.
- `unsupported`: For out-of-scope requests.

The LLM is strictly constrained to output only one of these three route names. For testing, the LLM is mocked via the `MOCK_LLM=true` environment variable to ensure deterministic test execution.

### Goal Architect
The Goal Architect agent has been implemented as **READ-ONLY**. It uses the tools `fetch_goals` and `fetch_tasks` to retrieve user data. It does not contain any mutation logic, adhering strictly to Phase 6.2.1 requirements.

### Tool APIs & Authentication Flow
We implemented two new Tool APIs in the Node.js backend:
- `GET /api/v1/tools/goals`
- `GET /api/v1/tools/tasks`

**Security & Auth Flow**:
1. The frontend authenticates and receives a JWT.
2. The frontend passes this JWT to the Python backend via the `Authorization: Bearer <token>` header.
3. The Python backend extracts the token and uses it to authenticate its own downstream requests to the Node.js Tool APIs.
4. The Node.js Tool API's `authenticate` middleware securely decodes the JWT to derive the `userId`. The Python code **never** supplies the `userId`, preventing unauthorized access or prompt injection attacks.
5. The Tool API securely proxies data from `GoalService` and `TaskService` maintaining strict user isolation.

### PostgreSQL Checkpoint Architecture
State persistence is implemented using `langgraph-checkpoint-postgres`.
The infrastructure logic is completely isolated in `ai/app/checkpoint/postgres.py`, which initializes a connection pool using the `psycopg_pool` library. The `PostgresSaver` handles the creation and management of state tables in a dedicated PostgreSQL database. The application falls back to `MemorySaver` if the database is unavailable, allowing testing in environments without Docker.

### Thread ID Strategy
To maintain user isolation and conversational continuity, a stable `thread_id` is assigned to each workflow run. The `thread_id` can be explicitly passed in the request payload (`{"thread_id": "user_specific_thread"}`) or defaults to a randomly generated UUID to prevent collisions. This `thread_id` maps to the PostgreSQL checkpoint table for resuming state.

## Security
- **No Direct DB Access**: Python has zero knowledge of MongoDB credentials or schemas.
- **READ-ONLY Limits**: Agents possess no tools capable of mutating data.
- **Auth Passthrough**: Trust is anchored in the Node.js JWT validation. User boundaries are enforced exclusively at the Node.js layer.

## Tests
Integration tests have been verified and extended:
- **Existing Baseline**: 48/48 PASS
- **New Tests**: 9/9 PASS (Tool API tests + AI Service Supervisor tests)
- **Overall**: 57/57 PASS

The new tests focus on:
- Authenticated and unauthenticated access for Tool APIs.
- User and thread isolation.
- Empty data handling.
- Supervisor routing (Goal Architect, Insight Agent, Unsupported).
- Checkpoint persistence and fallback mechanics.

## Manual Verification

Provide the following commands to manually QA the system:

1. **Start PostgreSQL with Docker:**
   ```bash
   docker run --name studyflow-postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
   ```

2. **Configure the connection (in `ai/.env`):**
   ```env
   POSTGRES_URI=postgresql://postgres:postgres@localhost:5432/postgres
   NODE_API_URL=http://127.0.0.1:4000
   ```

3. **Start Node.js (in `backend/`):**
   ```bash
   npm run dev
   ```

4. **Start the Python AI service (in `ai/`):**
   ```bash
   source venv/bin/activate
   uvicorn app.main:app --port 8000 --host 127.0.0.1 --reload
   ```

5. **Test a Goal-Related Request:**
   ```bash
   curl -X POST http://127.0.0.1:8000/api/v1/agent/insight \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Help me plan my goals", "thread_id": "test_user_1"}'
   ```

6. **Test an Analytics Request:**
   ```bash
   curl -X POST http://127.0.0.1:8000/api/v1/agent/insight \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Give me a study analytics insight", "thread_id": "test_user_1"}'
   ```

7. **Test an Unsupported Request:**
   ```bash
   curl -X POST http://127.0.0.1:8000/api/v1/agent/insight \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"prompt": "Write a python script", "thread_id": "test_user_1"}'
   ```

8. **Verify Checkpoint Persistence:**
   Inspect the PostgreSQL database running in Docker:
   ```bash
   docker exec -it studyflow-postgres psql -U postgres -d postgres -c "SELECT thread_id, checkpoint_id FROM checkpoints;"
   ```

## Limitations & Intentionally Deferred
- **HITL (Human in the Loop)**: Deferred to Phase 6.2.2. The Supervisor graph structure is prepared for `.add_conditional_edges` and interrupts, but none are active.
- **RAG & Long Term Memory**: Deferred.
- **n8n / Automations**: Deferred.
- **Notifications**: Deferred.
- **Mutations**: Goal Architect cannot create or update goals yet.

Frozen systems (Focus timer, Analytics, Planner, etc.) were left completely untouched.
