# Phase 6.2.3 Implementation Plan: Read-Only Tool API

Provide a brief description of the problem, any background context, and what the change accomplishes.
This phase upgrades the AI from a static "dump everything" architecture to a true Agentic Tool-Calling loop. The AI will dynamically request slices of user data (goals, tasks, planner, focus, analytics) using structured tool calls, respecting a 5-call global budget and preventing infinite loops.

## User Review Required

> [!WARNING]
> I will implement a custom ToolNode wrapper around the native LangChain `@tool` functions to strictly enforce the global 5-invocation budget and duplicate call prevention. The native `langgraph.prebuilt.ToolNode` doesn't easily track global state across multiple turns for a strict *total* budget (including parallel calls). Does this approach sound acceptable?

## Open Questions

> [!IMPORTANT]
> - Should the 5-invocation budget persist across the entire conversation history, or is it 5 tool calls *per user message*? (I will assume 5 calls *per user message* / single graph invocation).

## Proposed Changes

---

### Node.js Backend: Tool API

#### [MODIFY] `backend/src/routes/tool.routes.js`
- Remove the old `/goals` and `/tasks` generic dump routes.
- Add new specific read-only routes:
  - `GET /goals/active`
  - `GET /goals/:id`
  - `GET /tasks/today`
  - `GET /tasks/goal/:goalId`
  - `GET /planner/today`
  - `GET /planner/upcoming`
  - `GET /focus/recent`
  - `GET /focus/today`

#### [MODIFY] `backend/src/controllers/tool.controller.js`
- Implement controller methods for the new routes.
- Enforce `limit=10` on all collection queries.
- Ensure strict `req.user._id` scoping.
- Gracefully return empty arrays/standardized error structures for empty states.

---

### Python AI: LangGraph and Tools

#### [MODIFY] `ai/app/agents/supervisor.py`
- Add `tool_call_count: int` to `AgentState`.
- Keep the Supervisor strictly as a router.

#### [NEW] `ai/app/tools/registry.py`
- Replace `goal_tool.py`, `task_tool.py`, `analytics_tool.py` with a unified suite of LangChain `@tool` functions.
- Tools: `get_active_goals`, `get_goal_details`, `get_todays_tasks`, `get_goal_tasks`, `get_todays_schedule`, `get_upcoming_schedule`, `get_recent_focus`, `get_todays_focus`, `get_analytics_summary`.
- Tools will use `requests` and gracefully handle HTTP errors by returning JSON error strings.
- JWT token will be passed via `RunnableConfig` or closure to guarantee the LLM cannot inject user IDs.

#### [MODIFY] `ai/app/graph/builder.py`
- Introduce a routing edge from Specialists to `ToolNode` if `messages[-1].tool_calls` exists.
- Implement a custom `ToolNode` edge/node that tracks `tool_call_count` in `AgentState` and prevents exceeding the 5-call budget.
- Route back from `ToolNode` to the respective Specialist.

#### [MODIFY] `ai/app/agents/goal_architect.py` & `ai/app/agents/insight_agent.py`
- Bind appropriate tools using `llm.bind_tools(tools)`.
- Allow the LLM to inspect tool responses and decide if it needs to make further calls or return a final response.
- Update Mock LLM logic to simulate a `tool_calls` response and subsequent processing.

---

## Verification Plan

### Automated Tests
- Run `npm run test:integration`
- Expand `tests/integration/tool.integration.test.js` (or similar) to verify limits (max 10) and user isolation.
- Expand Python tests to verify the 5-call budget and duplicate call protection using `MOCK_LLM`.

### Manual Verification
- N/A, tests cover everything.
