# Architecture

## Core Principle: Persist Facts. Derive Intelligence. Render Only.

The entire system is built on a three-layer separation:

```
Layer 1 — Database (MongoDB)
  Pure facts only: deadline, completedAt, status, createdAt
  NEVER stores: presentation strings, computed labels, UI colors

Layer 2 — Intelligence Layer (Backend Services)
  Derives everything dynamically on every request:
  lifecycle, deadlineInfo, progress, goalHealth, recommendation

Layer 3 — Presentation Layer (Frontend)
  Renders what the backend provides.
  NEVER calculates: dates, urgency, progress, lifecycle, recommendations
```

---

## Backend Architecture

### REST API
- Node.js + Express
- MongoDB + Mongoose
- Authentication via JWT (all goal endpoints require `authenticate` middleware)

### Intelligence Services
Each request to `GET /api/goals` or `GET /api/goals/recommended` passes through a pipeline:

```
MongoDB Query
      ↓
goal.service.js (attachDynamicProgress)
      ↓
goalLifecycle.service.js  →  lifecycle status
deadlineIntelligence.service.js  →  deadlineInfo (badge, color, sortPriority, urgencyLevel)
goalProgress.service.js  →  progress (%, health score, remaining milestones)
milestoneLifecycle.service.js  →  per-milestone lifecycle
      ↓
Complete Goal DTO (returned to frontend)
```

### Key Backend Files

| File | Purpose |
|------|---------|
| `backend/src/services/goal.service.js` | Core CRUD, subtask toggling, completion auto-detection |
| `backend/src/services/goalLifecycle.service.js` | Lifecycle state machine |
| `backend/src/services/deadlineIntelligence.service.js` | Deadline badge/color/urgency derivation |
| `backend/src/services/goalProgress.service.js` | Progress % and health score |
| `backend/src/services/goalRecommendation.service.js` | Single-pass recommendation algorithm |
| `backend/src/services/milestoneLifecycle.service.js` | Milestone-level lifecycle |
| `backend/src/services/planner.service.js` | Planner block orchestration |
| `backend/src/services/goalSync.service.js` | Cross-domain sync between Goals ↔ Planner |
| `backend/src/services/shared/lifecycle.engine.js` | Shared constants and transition logic |
| `backend/src/routes/goal.routes.js` | Goal API routes |
| `backend/src/routes/planner.routes.js` | Planner API routes |

### Goal API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/goals` | All goals with full intelligence DTOs |
| POST | `/api/goals` | Create a new goal |
| GET | `/api/goals/recommended` | Single recommended goal (highest priority) |
| GET | `/api/goals/:id` | Single goal DTO |
| PUT | `/api/goals/:id` | Update goal (triggers completion detection) |
| DELETE | `/api/goals/:id` | Delete a goal |
| PATCH | `/api/goals/:goalId/subtasks/:subtaskId/toggle` | Toggle subtask completion |

---

## Frontend Architecture

### Store Architecture (`window.SF_STORE`)

The store is the **single source of frontend state** and the **orchestration layer** for all side effects.

**Slices**: `goals`, `planner`, `recommended`, `dashboard`, `idealab`, `user`

**Key store actions:**

| Action | Effect |
|--------|--------|
| `goals/LOAD` | Fetches all goals, patches store |
| `goals/UPDATE` | Updates one goal; detects completion transition |
| `goals/TOGGLE_SUBTASK` | Toggles subtask; detects completion transition |
| `goals/DELETE` | Removes one goal from store |
| `goals/LOAD_RECOMMENDED` | Fetches recommendation, patches `recommended` slice |
| `planner/LOAD` | Loads daily/weekly planner data |
| `planner/SELECT_DATE` | Sets selected date |

**Completion Detection (added Phase 2.3.0.8):**
Inside `goals/UPDATE` and `goals/TOGGLE_SUBTASK`, the store checks:
```js
if (!oldGoal.completed && updatedGoal.completed) {
  window.CompletionEvents.emitGoalCompleted(updatedGoal);
}
```
This is the only place in the entire frontend that detects a completion transition.

### Frontend Module Map

```
frontend/src/js/
├── store.js                   ← Global state + orchestration
├── components.js              ← Shared UI components (goal cards, badges, menus)
├── config.js                  ← API base URL and configuration
├── http.js                    ← Authenticated HTTP wrapper
├── services/
│   ├── goalsService.js        ← HTTP layer for Goals API
│   ├── plannerService.js      ← HTTP layer for Planner API
│   └── userService.js         ← HTTP layer for User API
├── workspace/
│   ├── workspaceActions.js    ← User action handlers (create, edit, delete, toggle)
│   ├── workspaceMapper.js     ← Raw DTO → ViewModel transformer
│   ├── workspaceRenderer.js   ← Renders workspace view from ViewModels
│   └── workspaceState.js      ← Workspace-local UI state (sort, filter)
├── dashboard/
│   └── dashboardRenderer.js   ← Renders Dashboard (KPIs, Hero Card, Task List)
└── completion/
    ├── completionEvents.js    ← Event helper (emitGoalCompleted / onGoalCompleted)
    ├── completionModal.js     ← Modal controller + auto-refresh orchestration
    └── completionRenderer.js  ← HTML generator for completion modal UI
```

### Frontend Pages

| Page | Script Dependencies |
|------|-------------------|
| `workspace.html` | store.js, components.js, completion/*, workspace/* |
| `dashboard.html` | store.js, components.js, completion/*, dashboard/* |
| `planner.html` | store.js, components.js, completion/* |
| `idealab.html` | store.js, components.js, completion/* |
| `settings.html` | store.js only (no completion) |
| `analytics.html` | store.js only (no completion) |
| `focus.html` | store.js only (no completion) |
| `404.html` | store.js only (no completion) |

---

## Goal Completion Event Flow

```
User toggles last subtask / updates goal
      ↓
goalsService.toggleSubtask() or goalsService.updateGoal()
      ↓
Backend: auto-marks goal completed, sets completedAt
      ↓
Store receives updated DTO (goals/TOGGLE_SUBTASK or goals/UPDATE)
      ↓
Store detects: !oldGoal.completed && updatedGoal.completed
      ↓
window.CompletionEvents.emitGoalCompleted(updatedGoal)
      ↓
CompletionModal.onGoalCompleted listener fires
      ↓
Idempotency guard: if (lastCompletedGoalId === goal.id) return
      ↓
SF_STORE.dispatch('goals/LOAD_RECOMMENDED')  ← refresh recommendation
SF_STORE.dispatch('planner/LOAD')            ← refresh planner
      ↓
CompletionModal.open(completedGoal, recommendedGoal)
      ↓
CompletionRenderer generates modal HTML
      ↓
User reads summary, dismisses modal
      ↓
CompletionModal.close() → body overflow restored
```

---

## Store → Subscriber Flow (Goal Updated)

```
goals/TOGGLE_SUBTASK or goals/UPDATE dispatched
      ↓
_patch('goals', { items: updatedItems })
      ↓
Store subscribers notified
      ↓
WorkspaceRenderer re-renders goal list
DashboardRenderer re-renders KPIs + hero card
      ↓
If completed → CompletionEvents → Modal shown
```

---

## Domain Ownership (Frozen Rules)

| Domain | Owner | Never Allowed |
|--------|-------|--------------|
| Lifecycle computation | Backend | Frontend must not compute |
| Deadline intelligence | Backend | Frontend must not compute |
| Progress calculation | Backend | Frontend must not compute |
| Recommendation ranking | Backend | Frontend must not rank |
| Scheduling | Planner Service | Goals must not schedule |
| Goal state mutation | Goal Service | Planner must not mutate goal fields directly |
| Cross-domain sync | GoalSyncService | Direct domain-to-domain mutation |
| State orchestration | SF_STORE | Components must not manage their own API state |
| UI rendering | Renderers | Renderers must not contain business logic |

---

## Planner Architecture (Frozen — Do Not Refactor)

The Planner is a three-view scheduling engine (Daily / Weekly / Monthly). Its internals are stable and locked. Do not modify core planner behaviors unless resolving a verified bug.

**Critical rules:**
- All date resolution MUST use `window.getPlannerBlockDate(block)` — never parse dates inline
- Planner state lives in `SF_STORE.planner` slice
- Mutations are: API request → await → store patch → UI repaint
- Planner Awareness (Phase 2.3.0.7) integrated backend intelligence into planner views without modifying the planner's core architecture

---

## ViewModels and Mapper Pattern

Raw backend DTOs are never directly passed to rendering functions. Instead:

1. `WorkspaceMapper.toCardModel(goal)` transforms the raw DTO into a flat ViewModel
2. The ViewModel exposes only what the renderer needs (no raw dates, no nested objects)
3. Renderers operate in O(1) — they receive a ViewModel and return an HTML string

This pattern ensures:
- Frontend is decoupled from backend schema changes
- Rendering remains pure and side-effect free
- The ViewModel is the single adapter between intelligence and UI

---

## Goal ↔ Planner Synchronization

### Domain Ownership
- `PlannerService` orchestrates scheduling but **never** mutates Goal state directly
- `GoalSyncService` is the sole boundary responsible for mutating Goal state when reacting to Planner events
- **Planner** is the scheduling source of truth; **Goals** are the progress source of truth

### State Transition Matrix

| Initial Status | Action | Expected Status |
|----------------|--------|-----------------|
| TODO | Schedule | SCHEDULED |
| SCHEDULED | Complete | COMPLETED |
| SCHEDULED | Delete Planner Block | TODO |
| SCHEDULED | Reschedule | SCHEDULED |
| COMPLETED | Reschedule | COMPLETED |

### Rollback Strategy
All cross-domain actions are atomic. If GoalSyncService fails, PlannerService calls the appropriate rollback method and propagates the error.

---

## Intelligence Layer ViewModel (Phase 2.3 Standard)

Every goal DTO returned from the API includes:

```json
{
  "id": "...",
  "title": "...",
  "deadline": "2026-09-01T00:00:00.000Z",
  "completed": false,
  "completedAt": null,
  "createdAt": "2026-07-01T...",
  "lifecycle": {
    "status": "ACTIVE",
    "label": "Active",
    "color": "#22C55E"
  },
  "deadlineInfo": {
    "type": "UPCOMING",
    "sortPriority": 3,
    "urgencyLevel": "medium",
    "badge": "Upcoming",
    "color": "#A855F7",
    "shortLabel": "Sep 1"
  },
  "progress": {
    "completionPercentage": 40,
    "goalHealth": { "score": 72, "label": "Good" },
    "completedMilestones": 2,
    "totalMilestones": 5
  },
  "milestones": [...],
  "subtasks": [...]
}
```

The frontend renders this DTO as-is — no transformations, no calculations.
