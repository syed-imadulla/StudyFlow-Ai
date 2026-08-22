# Phase 6.2.2 Architecture Audit & Execution Plan

This document outlines the current state of the StudyFlow AI architecture following Phase 6.2.1, explicitly detailing the structural limitations discovered and defining the strict execution boundaries for Phase 6.2.2.

---

## A. Current Architecture
StudyFlow consists of a Node.js/Express monolith backed by MongoDB, which securely manages all authentication and business logic (Goals, Tasks, Focus, Analytics). The AI Brain is an isolated Python FastAPI microservice running LangGraph. The Python service has no direct database access; it interacts with user data strictly by passing JWT tokens to dedicated read-only Node.js Tool APIs (`/api/v1/tools/*`).

## B. What Phase 6.2.1 Actually Established
1. **LangGraph Foundation**: A basic Supervisor graph that routes requests to either `goal_architect`, `insight_agent`, or `unsupported`.
2. **Infrastructure Persistence**: A PostgreSQL checkpointer (`PostgresSaver`) that physically saves and isolates graph state per `thread_id` across process restarts.
3. **Secure Auth Passthrough**: Python successfully proxies JWTs to Node.js, ensuring that Node.js controls the `userId` boundary.
4. **Tool Isolation**: Python agents fetch data securely via `/api/v1/tools/goals`, `tasks`, and `analytics/summary`.

## C. What Phase 6.2.2 is Supposed to Add
Phase 6.2.2 must bridge the gap between infrastructure persistence and **conversational memory**. Currently, the graph forgets previous turns. Phase 6.2.2 will introduce a formal message reducer to the LangGraph state, refactor agents to process chat history, and lay the architectural foundation for multi-turn interactions.

## D. Existing Agent/Tool Responsibilities
- **Supervisor**: Evaluates the raw prompt and outputs a strict routing string (`goal_architect`, `insight_agent`, `unsupported`).
- **Goal Architect**: Reads goals/tasks and outputs stateless advice.
- **Insight Agent**: Reads analytics and outputs stateless encouragement.
- **Node.js Tool APIs**: Validates the JWT, extracts `req.user._id`, and serves isolated read-only data.

## E. Supervisor Routing Limitations
- The Supervisor relies on evaluating a single `prompt` string in a vacuum. 
- It forces the LLM to output exact routing strings via rigid system prompts.
- It cannot interpret follow-up questions (e.g., "What did you mean by that?") because it lacks conversation history, forcing out-of-context requests into the `unsupported` bucket.

## F. LangGraph State Limitations
- `AgentState` in `supervisor.py` is defined as a standard `TypedDict` without any reducers (e.g., `operator.add`).
- Every request to `main.py` explicitly overwrites the `prompt` and `final_insight` keys in the state.
- The LLM nodes manually construct a new `[SystemMessage, HumanMessage]` array every time, actively ignoring any potential history.

## G. Checkpointer/Thread Model
The PostgreSQL checkpointer is functioning perfectly at the infrastructure level. It isolates `thread_id` records and retrieves them on subsequent requests. The failure of "memory" is entirely a LangGraph state schema issue, not a database issue.

## H. Authentication and User-Isolation Boundaries
User identity is implicitly trusted to the JWT. Python never touches MongoDB or dictates the `userId`. Node.js middleware extracts the ID from the token. This boundary is robust and must remain untouched.

## I. Read-Only vs Mutation Capabilities
The system is currently 100% read-only. Agents have zero capability to execute state-changing actions (no `POST/PUT/DELETE` access to Node.js). 

## J. Proposed Phase 6.2.2 Execution Boundary
Phase 6.2.2 will strictly focus on upgrading `AgentState` to support `messages` history using `Annotated[list, add]` and refactoring the Python components to utilize this history. **No mutation tools or HITL interrupts will be added in this phase**; we must master read-only conversational memory first.

## K. Risks and Failure Modes
1. **Context Window Exhaustion**: Endlessly appending messages to the state will eventually exceed the LLM's token limit and crash the graph.
2. **LLM Routing Drift**: Providing history to the Supervisor might confuse its rigid routing logic if the user changes topics mid-thread.

## L. Tests That Must Exist Before Completion
1. **Memory Recall Test**: Send prompt A, then send prompt B referencing A, and verify the LLM remembers prompt A.
2. **Context Preservation Test**: Verify that the PostgreSQL checkpoint blobs successfully serialize and deserialize the LangChain `BaseMessage` arrays across Python restarts.

---

## 1. Recommended Phase 6.2.2 Scope
Strictly implement conversational memory. 
- Redefine `AgentState` to track a `messages` array using `Annotated`.
- Update `main.py` to append the incoming user prompt to the `messages` array rather than overwriting a static string.
- Refactor the `supervisor`, `goal_architect`, and `insight_agent` to utilize `state["messages"]` instead of manually injecting a single `HumanMessage(content=prompt)`.
- Do NOT implement HITL, Action Tools, or external APIs yet.

## 2. Explicit List of Proposed Files to Change
- `ai/app/agents/supervisor.py` (Update `AgentState` with `Annotated[list, add]` and refactor routing logic to read `messages`).
- `ai/app/agents/goal_architect.py` (Refactor to read `messages`).
- `ai/app/agents/insight_agent.py` (Refactor to read `messages`).
- `ai/app/main.py` (Refactor to append user input to `messages`).
- `ai/tests/` (Add memory integration tests).

## 3. Explicit List of Files That Must Remain Frozen
- `ai/app/checkpoint/postgres.py` (Checkpointer is verified and perfect).
- `ai/app/tools/*.py` (No new tools).
- All files in `backend/` (Node.js monolith remains frozen).
- All files in `frontend/` (React/Vanilla JS remains frozen).

## 4. Test Plan
1. **Memory Verification (Unit)**: Send "My favorite subject is Math" -> "What is my favorite subject?", assert the AI answers "Math".
2. **Restart Verification (Integration)**: Perform Step 1, kill Python, restart Python, send "Do you still remember my favorite subject?", assert the AI answers "Math".
3. **Regression**: Run `npm run test:integration` to ensure Node.js was completely unaffected.

## 5. Open Decisions Requiring Approval
1. **Message Truncation**: Should we implement a sliding window or summarization strategy in Phase 6.2.2 to prevent token exhaustion, or defer token management to a later phase and accept the risk of crashes on very long threads?
2. **Supervisor Routing Paradigm**: Should the Supervisor remain a deterministic LLM prompt returning a single string, or should we upgrade it to use LangChain `bind_tools()` for more reliable routing? (Tool-binding is the official LangGraph standard for Supervisors).
3. **MOCK_LLM Compatibility**: How should `MOCK_LLM=true` handle multi-turn message arrays for deterministic testing?

**AWAITING APPROVAL TO PROCEED.**
