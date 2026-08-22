# Phase 6.1 Architecture Trace

## 1. Current AI Flow (Hardcoded)
1. **Frontend Request**: The `focus/INIT` action in `frontend/src/js/store.js` calls `window.focusService.getAISuggestion()`.
2. **Frontend Service**: `frontend/src/js/services/focusService.js` makes an HTTP request to `GET /api/v1/focus/ai-suggestion` using `window.SF_HTTP.request`.
3. **API Routing**: `backend/src/routes/focus.routes.js` maps `/ai-suggestion` to `FocusController.getAISuggestion`.
4. **Controller**: `FocusController.getAISuggestion` invokes `FocusService.getAISuggestion(req.user._id)`.
5. **Business Logic**: `backend/src/services/focus.service.js` (lines ~300-312) fetches the last 20 `COMPLETED` sessions from MongoDB, calculates `count` and `avgMin`.
6. **Hardcoded Generation**: Returns a hardcoded string: `You have completed ${count} focus sessions averaging ${avgMin || 25}m. Your cognitive velocity peaks during steady uninterrupted blocks.`.
7. **Frontend Display**: `frontend/focus.html` receives this string via the store and renders it inside `<div class="ai-suggestion-text">`.

## 2. Authentication Context
* **Current Frontend**: Uses a Bearer Token (JWT) injected into `window.SF_HTTP`.
* **Current Backend**: The `protect` middleware ensures `req.user` is populated. `FocusService` expects a `userId` argument.

## 3. New Architecture Mapping (Phase 6.1)
The goal is to replace the hardcoded string generator in `FocusService` with a real call to the new Python LangGraph AI microservice, which will then use a Node.js Tool API to read authentic analytics metrics.

**New Path:**
1. **Frontend (Untouched)**: Continues to call `GET /api/v1/focus/ai-suggestion` with standard JWT auth.
2. **Node.js Gateway (Modified)**: `FocusController/Service` strips the hardcoded logic. It acts as an API gateway. It makes a secure HTTP POST request to the Python LangGraph service (e.g., `http://localhost:8000/api/v1/agent/insight`).
3. **Service-to-Service Auth**: Node.js passes the user's explicit JWT token (or a dedicated internal service token embedding the `userId`) to the Python service in the `Authorization` header.
4. **LangGraph Runtime (New)**: The Python service receives the request, spins up the Insight Agent.
5. **Tool Call**: The Insight Agent decides it needs data and calls the `get_analytics_summary` tool.
6. **Node.js Tool API (New)**: The Python service makes a secure HTTP GET to `http://localhost:5000/api/v1/tools/analytics/summary` passing the same JWT.
7. **Node.js DB Access (New)**: The Node.js Tool API authenticates the request, fetches data from `AnalyticsService.getSummary(req.user._id)`, and returns JSON to Python.
8. **LLM Generation**: The Insight Agent feeds the JSON to Gemini, which generates a genuine, data-backed insight string.
9. **Return Path**: Python returns the string to Node.js → Node.js returns to Frontend.

## 4. What Must Remain Untouched
*   `frontend/focus.html` UI structure.
*   `FocusTimer` behavior.
*   `AnalyticsService.getSummary` (used as the deterministic data source for the tool).
*   All Goal, Task, and Planner CRUD.
*   Database schemas.

## 5. Components to Create/Modify
1. **New Node.js Tool API**: `backend/src/routes/tool.routes.js`, `backend/src/controllers/tool.controller.js`.
2. **Modified Focus Service**: `backend/src/services/focus.service.js` (`getAISuggestion` must dispatch to Python).
3. **New Python Service**: `ai/app/` containing FastAPI, LangGraph, and LangChain Google GenAI integration.
