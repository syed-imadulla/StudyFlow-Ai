# Project Overview

## What is StudyFlow AI?

StudyFlow AI is an intelligent, AI-assisted study planning and goal tracking platform. It helps users manage academic and personal goals by breaking them into actionable milestones, scheduling them dynamically in a planner, tracking focus sessions, and providing data-driven analytics — all guided by an AI Study Coach.

The platform's defining characteristic is its **Intelligence Architecture**: all business logic, lifecycle computation, and derived intelligence lives exclusively in the backend. The frontend is a pure presentation layer that renders what the backend provides.

---

## Technology Stack

### Backend
- **Runtime**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **Architecture**: REST API with an Intelligence Layer

### Frontend
- **Core**: Vanilla HTML, CSS, JavaScript
- **Styling**: Tailwind CSS (utility classes via CDN/build)
- **State Management**: Custom global store (`window.SF_STORE`)
- **Pages**: Multi-page application (MPA) — `workspace.html`, `dashboard.html`, `planner.html`, `idealab.html`, etc.

---

## Core Modules

| Module | Responsibility |
|--------|---------------|
| **Goals** | High-level objectives with milestones and subtasks |
| **Milestones** | Actionable chunks of a goal; link to Planner Blocks |
| **Planner** | Scheduling engine with Daily/Weekly/Monthly views |
| **Focus** | Active study session timer and tracking *(future)* |
| **Analytics** | Insights and productivity metrics *(future)* |
| **AI Coach** | Context-aware guidance and recommendations |
| **Dashboard** | Intelligence summary — recommended goal, today's tasks, KPIs |

---

## High-Level Architecture

```
┌─────────────────────────────────────┐
│              BACKEND                │
│  GoalService                        │
│  GoalLifecycleService               │  ← Single source of truth
│  DeadlineIntelligenceService        │    for ALL business logic
│  GoalProgressService                │
│  GoalRecommendationService          │
│  MilestoneLifecycleService          │
│  PlannerService                     │
└──────────────┬──────────────────────┘
               │ REST API (JSON DTOs)
               ▼
┌─────────────────────────────────────┐
│           FRONTEND STORE            │
│  window.SF_STORE                    │  ← State orchestration
│  (goals, planner, recommended,      │    and event dispatch
│   dashboard, idealab slices)        │
└──────────┬──────────────────────────┘
           │ Store subscriptions / dispatch
           ▼
┌─────────────────────────────────────┐
│         PRESENTATION LAYER          │
│  WorkspaceRenderer  (workspace)     │
│  DashboardRenderer  (dashboard)     │
│  Planner HTML       (planner)       │
│  CompletionModal    (completion)    │  ← Pure renderers
│  SF_COMPONENTS      (shared cards)  │    zero calculations
└─────────────────────────────────────┘
```

---

## Backend Responsibilities

The backend is the **single source of truth** for all intelligence. It:

- Stores raw facts (deadlines, dates, statuses) in MongoDB
- Derives all intelligence dynamically on every API response:
  - `lifecycle` (ACTIVE, OVERDUE, COMPLETED, etc.)
  - `deadlineInfo` (sortPriority, urgencyLevel, badge, color, label)
  - `progress` (completionPercentage, goalHealth, remainingMilestones)
  - `recommended` (the single most urgent active goal for a user)
- Never stores computed/presentation values in the database

**Backend services:**

| Service | Responsibility |
|---------|---------------|
| `goal.service.js` | CRUD, subtask toggling, completion detection |
| `goalLifecycle.service.js` | Lifecycle status (ACTIVE, OVERDUE, COMPLETED, etc.) |
| `deadlineIntelligence.service.js` | Deadline badges, colors, urgency levels, sortPriority |
| `goalProgress.service.js` | Completion %, health score, remaining milestones |
| `goalRecommendation.service.js` | Single-pass algorithm; returns the most urgent active goal |
| `milestoneLifecycle.service.js` | Milestone-level lifecycle and progress |
| `planner.service.js` | Planner block CRUD, daily/weekly view orchestration |
| `shared/lifecycle.engine.js` | Core lifecycle constants and transition logic |

---

## Frontend Responsibilities

The frontend **never calculates** business logic. Its only jobs are:

1. **Fetch** data from the backend via `goalsService.js`, `plannerService.js`, etc.
2. **Store** the response in `window.SF_STORE` slices
3. **Map** raw DTOs to view models (via `WorkspaceMapper`)
4. **Render** view models into HTML (via renderers and `SF_COMPONENTS`)
5. **React** to store changes and re-render affected views

**Frontend modules:**

| Module | Responsibility |
|--------|---------------|
| `store.js` | Global state, action dispatching, slice management |
| `components.js` | Shared, reusable card/badge HTML generators |
| `workspace/` | Workspace view — filters, sorts, renders goal cards |
| `dashboard/dashboardRenderer.js` | Dashboard — KPIs, Hero Card, Today's Tasks |
| `completion/` | Goal completion modal and event orchestration |
| `services/goalsService.js` | HTTP calls for goal CRUD |
| `services/plannerService.js` | HTTP calls for planner data |

---

## Store Architecture (`window.SF_STORE`)

The store is a lightweight custom state manager with named slices:

| Slice | Contents |
|-------|----------|
| `goals` | `{ items[], loading, error, lastSync }` |
| `planner` | `{ dailyBlocks[], weeklyStats, selectedDate, loading }` |
| `recommended` | `{ goal, loading, error }` |
| `dashboard` | `{ data, loading, error }` |
| `idealab` | `{ activeGoalId, activeGoal, chatHistory }` |
| `user` | `{ profile, loading }` |

Store actions follow the pattern `module/ACTION_NAME` and are dispatched via:
```js
await window.SF_STORE.dispatch('goals/TOGGLE_SUBTASK', { goalId, subtaskId, completed });
```

The store is the **orchestration layer** — it detects state transitions, triggers side effects (e.g., emitting completion events), and notifies subscribers.

---

## Goal Lifecycle Architecture

Goals transition through lifecycle states computed entirely by the backend:

```
DRAFT → ACTIVE → DUE_SOON → OVERDUE → COMPLETED / COMPLETED_LATE
                              ↓
                          ABANDONED (future)
```

The `lifecycle.engine.js` on the backend determines state based on:
- `deadline` (raw date fact in DB)
- `completed` / `completedAt` (boolean + timestamp)
- Comparison to current date at request time

Completion happens when:
1. A user toggles the last subtask → backend auto-marks goal as `completed`
2. A user explicitly updates the goal with `completed: true`

The frontend detects this via: `!oldGoal.completed && updatedGoal.completed`

---

## Recommendation Architecture

The `GoalRecommendationService` on the backend:
1. Fetches all active goals for the user
2. Performs a **single-pass scan** (no sort) to find the goal with the highest `deadlineInfo.sortPriority`
3. Tie-breaks by earliest deadline, then oldest creation date
4. Returns one goal as the recommendation

**Endpoint**: `GET /api/v1/goals/recommended`

The frontend never re-ranks or filters goals to generate recommendations. It renders exactly what the endpoint returns.

Future consumers of this service include: Dashboard, Planner, Completion Modal, Mobile App, Daily Briefings, Push Notifications.
