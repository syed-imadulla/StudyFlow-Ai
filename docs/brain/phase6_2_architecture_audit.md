# Phase 6.2 Architecture Audit

## 1. Current Architecture
StudyFlow currently relies on a standard Node.js Express monolith backed by MongoDB.
- **Frontend**: Vanilla HTML/JS, state managed via a custom store pattern (`frontend/src/js/store.js`).
- **Backend (Node.js)**: Service/Controller pattern.
- **Database (MongoDB)**: `User`, `Goal`, `Task`, `Planner`, `FocusSession` schemas.
- **Missing Elements**: IdeaLab, Document Uploads (RAG), Notifications, and background task automation (n8n) do not exist yet.

## 2. Current AI Architecture
As of Phase 6.1, we have a functional but highly constrained pipeline:
- A single read-only `GET /api/v1/tools/analytics/summary` Node.js API.
- A standalone Python FastAPI/LangGraph service (`ai/app/`).
- A hardcoded, sequential graph (`Fetch -> Generate`).
- No dynamic tool selection, no mutations, no memory, and no Supervisor.

## 3. Proposed Multi-Agent Architecture
The Phase 6.2+ system will evolve the Python microservice into a stateful **StudyFlow AI Brain** orchestrated by a LangGraph Supervisor.
- Node.js acts as the strict authorization layer and data gateway via dedicated Tool APIs.
- The LangGraph Supervisor interprets the user's intent, delegates to specialized agents, and ensures Human-in-the-Loop checkpoints before triggering Node.js mutation APIs.

## 4. Supervisor Design
The Supervisor is the graph's entry point.
- **Graph Type**: Star topology (Supervisor at center, specialists as nodes).
- **Behavior**: It classifies the prompt, selects the correct specialist, routes the state, and compiles the final answer.
- **Features**: Supports agent handoff, LLM fallback/retry mechanisms, and human approval interrupts (pausing the graph state).

## 5. Agent Responsibility Matrix
1. **Supervisor Agent**: Understands intent, delegates, manages state handoff.
2. **Goal Architect**: Analyzes goals, creates milestones, and breaks down tasks. Uses Goal/Task APIs.
3. **Study Planner**: Reads calendar conflicts, suggests time blocks. Uses Planner APIs.
4. **Focus Coach**: Encourages user based on actual FocusSession streaks. Uses Focus APIs.
5. **Analytics/Insight Agent**: Translates aggregate KPIs into weekly summaries. Uses Analytics APIs.
6. **Task Agent**: Suggests which task is most urgent.
7. *(Future) Resource/RAG Agent*: Handles academic Q&A.
8. *(Future) Notification Agent*: Prepares WhatsApp/Push payloads.

## 6. Tool API Matrix
| Category | API Endpoint | Access | Agent |
| :--- | :--- | :--- | :--- |
| **READ** | `GET /tools/goals` | SAFE | Goal Architect, Task Agent |
| **READ** | `GET /tools/planner` | SAFE | Study Planner |
| **READ** | `GET /tools/focus` | SAFE | Focus Coach |
| **ACTION** | `POST /tools/planner` | CONFIRM | Study Planner |
| **ACTION** | `POST /tools/goals` | CONFIRM | Goal Architect |
| **ACTION** | `POST /tools/tasks` | CONFIRM | Task Agent |

## 7. HITL (Human-in-the-Loop) Design
The product rule is: `READ → SUGGEST → ASK CONFIRMATION → EXECUTE`.
- **Implementation**: When an agent decides to call an Action Tool (e.g., `create_planner_block`), LangGraph triggers an `interrupt`.
- **Pause**: The Python service pauses graph execution, persisting the state (checkpointer).
- **Approval**: The Node.js backend pushes the proposed tool payload to the Frontend.
- **Resume**: The User clicks "Approve", Node.js signals Python to resume the graph, and the actual DB mutation is executed securely.

## 8. Memory Architecture
- **LangGraph Checkpointer (SQLite/Postgres)**: Stores active conversation threads and HITL paused states.
- **MongoDB `UserPreferences`**: Long-term explicit memory (e.g., "Prefers 25 min pomodoros").
- **Vector DB**: Future document embeddings.

## 9. RAG Architecture (Future)
- **Pipeline**: n8n Webhook -> OCR/Clean -> Semantic Chunk -> Embed (Gemini/OpenAI) -> MongoDB Atlas Vector Search.
- **Reasoning**: Atlas Vector Search is more than sufficient for StudyFlow to keep infrastructure unified within Mongo.

## 10. n8n Boundary
- **Node.js**: Synchronous CRUD, auth, deterministic logic.
- **LangGraph**: Cognitive reasoning, multi-agent conversational states, HITL.
- **n8n**: Asynchronous triggers, scheduled jobs (cron), webhook receivers (Stripe, GitHub), and RAG ingestion pipelines.

## 11. Notification Strategy
- **Web Push (PWA)**: Primary, free, high browser support.
- **WhatsApp**: Excellent for student engagement, but incurs Twilio/Meta API costs.
- **Recommendation**: Build Web Push first.

## 12. LLM Strategy
- **Primary**: `gemini-1.5-flash` or `gemini-2.0-flash` (Cost-effective, highly capable).
- **Abstraction**: `get_llm()` factory pattern in LangChain allows swapping to OpenAI trivially.
- **Handling**: Exponential backoff for 429s, hard fallback strings for 500s.

## 13. Security Model
- **User Isolation**: Passed via JWT token headers; Node.js implicitly filters all DB queries by `req.user._id`.
- **Prompt Injection**: System prompts restrict tool usage. RAG chunks are isolated.
- **Action Bounds**: AI cannot access endpoints for password change, account deletion, or modifying core settings.

## 14. Observability
- Minimal logging via `logger.info` tracing Agent routing and Tool execution times.
- Token counts extracted from LangChain `AIMessage` metadata.

## 15. Migration Strategy
Build iteratively. Start with the Supervisor, then add one specialist at a time (e.g., Goal Architect), then implement the HITL state persistence, then introduce the Action APIs.

## 16. Risks
- **Latency**: Multi-agent routing increases response times (expect 3-8 seconds).
- **Context Size**: Passing too much historical data blows up token limits.

## 17. Open Decisions
1. **LangGraph Persistence**: Which database should LangGraph use for its `checkpointer` (SQLite, Postgres, or MongoDB)?
2. **First Specialist**: Which specialist agent should be implemented first in Phase 6.2?

## 18. Recommended Implementation Order
*Detailed in implementation_plan_phase_6_2.md*
