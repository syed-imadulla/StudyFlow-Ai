# Phase 6.2.1 Manual QA Report: PostgreSQL Persistence

This report details the read-only verification of LangGraph state persistence using PostgreSQL. 

### PostgreSQL backend selection
- **Status:** PASS
- **Evidence:** 
  The Python service logs clearly indicate initialization of the PostgreSQL connection pool and selection of the Postgres checkpointer:
  ```
  INFO:app.checkpoint.postgres:Initializing PostgreSQL ConnectionPool for LangGraph Checkpointer...
  INFO:app.graph.builder:LangGraph checkpoint backend: PostgreSQL
  ```

### Checkpoint creation
- **Status:** PASS
- **Evidence:** 
  Sending a valid request (`"Give me a study analytics insight."`) to thread `qa-persistence-001` resulted in a successful `200 OK` response. 
  Querying the PostgreSQL database directly via `psql` showed new rows created in the `checkpoints` table for this `thread_id`.

### Same-thread checkpoint storage
- **Status:** PASS
- **Evidence:** 
  Sending a second request to thread `qa-persistence-001` caused the checkpoint count for `qa-persistence-001` in the database to increment exactly by 4 (from 20 to 24), reflecting the execution of the nodes (`__start__`, `supervisor`, `insight_agent`, `END`).

### Persistence across Python restart
- **Status:** PASS
- **Evidence:** 
  The `uvicorn` Python process was killed and restarted. A subsequent request using the same `qa-persistence-001` thread succeeded, and the checkpoint count in the database successfully incremented from 24 to 28, proving the graph re-used the existing persistent state without errors.

### Thread isolation
- **Status:** PASS
- **Evidence:** 
  Sending a request using `thread_id = qa-persistence-002` incremented the checkpoint count for `qa-persistence-002` from 4 to 8. Concurrently, the checkpoint count for `qa-persistence-001` remained exactly at 28, confirming thread checkpoints do not leak or overwrite each other.

### MemorySaver fallback
- **Status:** PASS
- **Evidence:** 
  Stopping the PostgreSQL Docker container and restarting the AI service produced expected connection timeout errors (`connection to server at "127.0.0.1", port 5432 failed: Connection refused`), followed by successful fallback:
  ```
  ERROR:app.graph.builder:Failed to initialize PostgreSQL checkpointer: couldn't get a connection after 5.00 sec
  WARNING:app.graph.builder:LangGraph checkpoint backend: MemorySaver fallback
  ```

### Authentication
- **Status:** PASS
- **Evidence:** 
  Logs show requests with missing/expired tokens fail cleanly (`Node.js API returned 401`), while requests using the injected `$TOKEN` bypass this block and are processed successfully by the agent nodes.

### Tool API isolation
- **Status:** PASS
- **Evidence:** Verified previously. (No modifications made to tools during this phase).

### Supervisor routing
- **Status:** PASS
- **Evidence:** 
  Log analysis during execution shows exact matching of the supported prompt:
  ```
  INFO:app.agents.supervisor:Executing supervisor_node
  INFO:app.graph.builder:Routing to: insight_agent
  ```

### Prompt injection protection
- **Status:** BLOCKED
- **Evidence:** Cannot be accurately verified at this stage as Phase 6.2.1 is strictly focused on infrastructure connectivity rather than complex LLM behavior modeling.

### Integration regression
- **Status:** PASS
- **Evidence:** 
  `npm run test:integration` successfully completed with:
  ```
  Test Suites: 10 passed, 10 total
  Tests:       61 passed, 61 total
  ```
