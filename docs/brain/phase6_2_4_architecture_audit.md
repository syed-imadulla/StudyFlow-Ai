# Phase 6.2.4 Architecture Audit

## 1. Current Architecture State
The system currently operates a Node.js API gateway passing JWTs to a Python LangGraph AI microservice. The LangGraph environment uses a PostgreSQL checkpointer for state isolation and thread persistence. The AI is fully capable of invoking **Read-Only** Tool APIs (Goals, Tasks, Planner, Focus, Analytics) from the Node.js backend. The Node.js backend securely filters all data via `req.user._id` and enforces a hard limit on data size (e.g., max 10 records). 

## 2. Completed Capabilities
- **Phase 6.2.1**: LangGraph runtime, Supervisor router, PostgreSQL checkpointer, JWT passthrough.
- **Phase 6.2.2**: Conversational memory (`add_messages` reducer), thread-based state, sliding window for context.
- **Phase 6.2.3**: Real read-only tool calling, LangGraph `ToolNode`, 5-tool budget limit, duplicate call prevention, parallel execution, generic dump routes removed.

## 3. Missing Capability
After establishing Supervisor routing, conversational memory, and read-only tools, the system lacks the ability to **take action**. The AI is strictly read-only and cannot mutate data on behalf of the user. To become a productive assistant, the AI needs safe, user-approved mutation tools (e.g., creating a goal, scheduling a task).

## 4. Original Phase 6.2.4 Intent
According to `phase6_2_architecture_audit.md` Section 15 (Migration Strategy), the original intent was:
*"Start with the Supervisor, then add one specialist at a time (e.g., Goal Architect), then implement the HITL state persistence, then introduce the Action APIs."*
Since the read-only tools and specialists are fully established, the next architectural requirement is explicitly **HITL (Human-in-the-Loop) state persistence and Action APIs**.

## 5. Recommended Scope
The recommended scope for Phase 6.2.4 is to introduce **Safe Mutation Proposals via Human-in-the-Loop (HITL)**. 
- Implement dedicated Action Tool APIs in Node.js (e.g., `POST /api/v1/tools/goals`).
- Adapt the LangGraph graph topology to support an `interrupt_before` mechanism for Action tools.
- Implement the pause/resume capability allowing a user to approve a tool payload before execution.

## 6. Proposed Graph Architecture
The graph must differentiate between Read tools (which can execute autonomously) and Action tools (which require user confirmation).
**Proposed Topology**:
- `Supervisor` routes to `goal_architect` or `insight_agent`.
- Specialist decides to call tools.
- Edges route to `read_tools` (normal `ToolNode`) OR `action_tools` (`ToolNode` with `interrupt_before=["action_tools"]`).
- If `action_tools` is triggered, execution suspends.
- On resumption (user approval), `action_tools` executes, and control returns to the Specialist.

## 7. Agent Responsibility Matrix
- **Supervisor**: Intent classification and routing only. (Unchanged)
- **Goal Architect**: Analyzes goals, reads tasks. NEW: Proposes Goal creation/updates and Task scheduling.
- **Insight Agent**: Analyzes productivity. (Remains read-only for now, or proposes Focus schedule).
*No new specialist agents are required.*

## 8. Tool Access Model
- **Read Tools**: Autonomously executable, parallelizable. 
- **Action Tools**: Require explicit Human-in-the-Loop approval. Limited strictly to safe, constructive actions (e.g., create, update, schedule).
- **Tool Domain Isolation**: Goal Architect retains Goal/Task/Planner Action tools; Insight Agent retains Focus/Planner tools. Agents cannot call tools outside their domain.

## 9. State & Memory Model
- **AgentState**: Retains the `messages` reducer. When an interrupt occurs, the PostgreSQL checkpointer physically persists the state.
- **Resumption**: The system requires a mechanism (API route) to receive user approval, update the state (e.g., injecting an "approved" flag or directly resuming the graph with `checkpointer.put`), and continue execution.

## 10. Security Model
- **Action Boundaries**: The AI continues to have ZERO direct access to MongoDB. All mutations MUST pass through Node.js Tool APIs.
- **Node.js JWT Authorization**: Node.js extracts `req.user._id` from the JWT and firmly enforces it on all POST/PATCH payloads, preventing the AI from creating/modifying data for another user.
- **Destructive Actions**: Deletion APIs (`DELETE`) are strictly **Out of Scope**. The AI cannot autonomously or semi-autonomously delete user data.

## 11. Failure Handling
- **User Rejection**: If the user denies an action, the graph must inject a `ToolMessage` containing `{"error": "User rejected this action."}` and resume, allowing the LLM to gracefully acknowledge the rejection.
- **Node.js Validation Failures**: If Node.js rejects a proposed payload (e.g., 400 Bad Request), the error is returned to the LLM to potentially self-correct or inform the user.

## 12. Testing Strategy
- **Graph Interrupts**: Test that the graph pauses exactly before `action_tools` and executes `read_tools` freely.
- **Resumption**: Test resuming a paused thread via `ThreadConfig`.
- **User Rejection**: Test injecting a rejected state and verifying the LLM handles it gracefully.
- **Security**: Verify prompt injections attempting to bypass HITL fail at the graph structure level.
- **Node.js Tool APIs**: Integration tests for all new `POST` Tool APIs, ensuring validation and isolation.
- **Regression**: Ensure 100% of Phase 6.2.3 and older tests pass.

## 13. Explicitly Out of Scope
- Arbitrary database writes (direct mongo access).
- Autonomous destructive actions (deletions of goals, tasks, planners).
- Unapproved autonomous mutations (bypassing HITL).
- n8n / Workflow automation.
- RAG / Vector Database.
- Proactive notifications (Push/WhatsApp).
- Cross-agent collaboration (handoffs between specialists).

## 14. Files Expected to Change
- `ai/app/graph/builder.py`: Split `ToolNode` into `read_tools` and `action_tools`, add `interrupt_before`.
- `ai/app/tools/registry.py`: Add Action tool functions.
- `ai/app/agents/*.py`: Bind new action tools to agents.
- `ai/app/main.py`: Add an endpoint to handle HITL resumption.
- `backend/src/routes/tool.routes.js`: Add `POST` routes.
- `backend/src/controllers/tool.controller.js`: Implement safe mutation handlers.

## 15. Open Architectural Decisions
1. **HITL Node.js Proxy**: Should the Node.js backend orchestrate the "resume" call to the Python AI, or should the frontend call Python directly to resume? (Recommendation: Node.js should proxy the resume command to maintain the API gateway pattern).
2. **Action Tool Granularity**: Which specific mutations should be enabled first? (Recommendation: `create_goal` and `schedule_task`).

## 16. Recommended Implementation Sequence
1. Implement the HITL pause/resume logic in `ai/app/graph/builder.py` and `ai/app/main.py` using a dummy Action tool.
2. Implement and test one safe Action API in Node.js (e.g. `POST /api/v1/tools/goals`).
3. Bind the real Action tool to `goal_architect.py` and verify the full READ -> PROPOSE -> APPROVE -> EXECUTE loop.

## 17. Approval Checklist
- [ ] Phase 6.2.4 Recommended Scope Approved
- [ ] Explicit Out of Scope rules acknowledged
- [ ] Architecture modifications approved
