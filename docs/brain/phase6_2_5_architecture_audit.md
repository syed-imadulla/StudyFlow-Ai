# Phase 6.2.5 Architecture Audit

## 1. Official Phase 6.2.5 Scope
**STATUS: AMBIGUOUS / UNDEFINED**
After a comprehensive audit of the project documentation (including `ROADMAP.md`, `PROJECT_OVERVIEW.md`, `CURRENT_STATUS.md`, and all `docs/brain/` audits and completion reports), there is **no explicit definition** of what Phase 6.2.5 is supposed to contain. 

The original `phase6_2_architecture_audit.md` broadly defined the multi-agent architecture and suggested an iterative migration strategy ("Start with the Supervisor, then add one specialist at a time... then implement the HITL state persistence, then introduce the Action APIs"). Phases 6.2.1 through 6.2.4 have executed this strategy up through the initial action tools, but the specific subdivision "Phase 6.2.5" is an undocumented designation.

## 2. Why it comes after Phase 6.2.4
Phase 6.2.4 successfully completed the hardest infrastructure challenge: the secure, exact-once, Human-in-the-Loop (HITL) mutation pipeline using LangGraph interrupts and PostgreSQL checkpoints. 

Because the runtime (6.2.1), routing (6.2.2), read tools (6.2.3), and action tools infrastructure (6.2.4) are now proven and stable, the system is ready to either:
1. Expand the roster of Specialist Agents (e.g., Study Planner, Focus Coach) mapped out in the Phase 6.2 audit.
2. Build the actual Frontend Chat UI to allow users to interact with this AI brain and its HITL approval prompts.

## 3. Current Architecture Relevant to this Phase
- **AI Brain**: Python LangGraph service with `supervisor.py`, `goal_architect.py`, and `insight_agent.py`. 
- **Tool Registry**: Both Read (`get_active_goals`, `get_todays_tasks`, etc.) and Action (`create_goal`, `schedule_task`) tools are implemented.
- **Node.js Gateway**: Acts as the sole authenticator and executor of database mutations.
- **State**: LangGraph state is check-pointed flawlessly into PostgreSQL, supporting cross-process persistence and thread isolation.

## 4. Existing Capabilities from Phases 6.2.1–6.2.4
- **LangGraph Checkpointing**: Perfected process-restart persistence.
- **Supervisor Routing**: LLM-based structured routing (Goal Architect vs. Insight Agent).
- **Tool Execution Limits**: Budgeted to 5 tool invocations per user request.
- **HITL Mutational Pause**: Execution pauses at `prepare_action`, returning a `pending_action` payload, waiting for `/api/v1/agent/action/resume`.

## 5. Exact Files/Modules Likely to be Affected
*(Dependent on the selected objective)*
- If Frontend UI: `frontend/src/js/ai/*`, `frontend/index.html`, `backend/src/controllers/ai.controller.js`.
- If Missing Agents: `ai/app/agents/study_planner.py`, `ai/app/agents/focus_coach.py`, `ai/app/graph/builder.py`, `backend/src/controllers/tool.controller.js`.

## 6. Dependencies and Integration Points
- **Node.js ↔ Python**: The HTTP bridge is fully functional. Any new tools must follow the `_make_post_request` or `_make_get_request` patterns.
- **Frontend ↔ Node.js**: The frontend needs a mechanism to poll or receive stream updates of the AI's state (especially for `pending_action` detection) and a UI to send `/resume`.

## 7. Security Implications
- Any new Action tools MUST pass through the exact same HITL Node.js proxy flow established in 6.2.4.
- No direct MongoDB writes from Python.
- JWT ownership must be strictly validated in the backend controller for every new tool.

## 8. State/Checkpoint Implications
- The current checkpointer handles state perfectly. Any new agents must respect the `AgentState` TypedDict. If new agents require new memory fields (e.g., `planner_data`), `AgentState` must be updated.

## 9. Failure/Recovery Scenarios
- If adding new agents, we must ensure LLM halucinations on tool parameters are caught gracefully.
- The Supervisor must cleanly fallback to `unsupported` if a new agent errors out.

## 10. Testing Strategy
- **Python Unit/Integration**: Extend `test_hitl.py` or create `test_planner_agent.py`.
- **Node.js**: Add new suites in `tools.integration.test.js`.
- **Frontend**: Manual QA of the chat interface and HITL prompt.

## 11. Regression Risks
- Modifying `builder.py` to add new agents risks breaking the working `interrupt_before` boundary if edges are wired incorrectly.
- Modifying `AgentState` risks breaking existing PostgreSQL checkpoints if backwards compatibility isn't respected (though for dev, dropping the checkpointer tables is acceptable).

## 12. Frozen Systems/Files that must NOT be modified
- `ai/app/checkpoint/postgres.py` (Proven stable)
- `backend/src/models/*` (No schema changes allowed)
- `backend/src/services/*` (Core business logic is frozen)

## 13. Explicit Implementation Boundaries
- Do NOT introduce n8n or RAG.
- Do NOT introduce arbitrary MongoDB writes.
- Do NOT bypass the HITL pause for any mutation.

## 14. Decisions Requiring Approval
Because Phase 6.2.5 is undocumented, you must explicitly approve the goal of this phase.

---

# Recommendations for Phase 6.2.5

Since the foundational intelligence (Supervisor, Checkpointer, Tools) is complete, the AI is currently headless—it can only be tested via API. 

### Recommended Phase 6.2.5 Objective:
**Implement the Frontend AI Chat Interface & HITL Interaction Loop.**
We need to connect the user to the brain. This involves building the chat UI sidebar/modal, handling standard text interactions, and most importantly, rendering the "Pending Action Approval" UI when the backend returns a `pending_action`.

### Alternative Objective:
**Implement the Study Planner & Focus Coach Agents.**
If you prefer to finish all backend AI capabilities before touching the frontend, we should implement the missing agents defined in the Phase 6.2 Architecture Audit and bind them to the existing Planner/Focus tools.

### Proposed Implementation Sequence (If Frontend is chosen):
1. Create `backend/src/controllers/ai.controller.js` to act as the pass-through proxy for chat messages.
2. Build the `frontend/src/js/ai/chatUI.js` component.
3. Implement the `pending_action` rendering and the "Approve / Reject" button logic.
4. Connect the UI to the `POST /api/v1/agent/action/resume` Node.js endpoint.

### Required Approval Decisions:
1. **Scope Selection**: Do we build the Frontend UI or the missing Backend Agents?
2. **Streaming vs Polling**: For the chat interface, should Node.js proxy a streaming connection (SSE/WebSockets) from LangGraph, or should we stick to simple synchronous HTTP polling for Phase 6.2.5?
