# Architectural Decisions

This document records all important architectural decisions made through Phase 2.3.0.8.
Future implementations must understand and respect these decisions.

---

## Core Principle: Persist Facts. Derive Intelligence. Never Persist Presentation.

- **Status**: Accepted (Phase 2.3.0.2)
- **Decision**: The database stores only pure factual data (`deadline`, `completed`, `completedAt`, `createdAt`). All derived values (`lifecycle`, `deadlineInfo`, `progress`, `goalHealth`) are computed dynamically by the backend Intelligence Layer on every API response. The frontend never stores, calculates, or approximates these values.
- **Consequences**: This governs every future module. Dashboard, Planner, Mobile, and any other consumer must render from the same Intelligence Layer, ensuring total consistency.

---

## Backend Is the Single Source of Truth

- **Status**: Accepted (Phase 2.3)
- **Decision**: All business logic — lifecycle computation, deadline intelligence, progress aggregation, recommendation ranking, completion detection — lives exclusively in the backend.
- **Violated by**: Any frontend file that calculates dates, checks if a deadline is today, sorts goals by urgency, or generates recommendation text.

---

## Frontend Is a Pure Presentation Layer

- **Status**: Accepted (Phase 2.3.0.5)
- **Decision**: The frontend renders what the backend provides. It contains no date math, no sorting by business criteria, no lifecycle calculations, no recommendation algorithms.
- **Pattern**: DTO → WorkspaceMapper.toCardModel() → ViewModel → Renderer → HTML

---

## Store Is the Orchestration Layer

- **Status**: Accepted (Phase 2.3.0.5)
- **Decision**: `window.SF_STORE` is the single point of state management and the only place where side effects are coordinated (e.g., detecting completion transitions, triggering refreshes after mutations).
- **Pattern**: User action → workspaceActions.js → SF_STORE.dispatch() → API call → store patch → subscriber re-renders

---

## Completion Detection Lives in the Store

- **Status**: Accepted (Phase 2.3.0.8)
- **Decision**: The only place in the frontend that detects a goal completing is inside `goals/UPDATE` and `goals/TOGGLE_SUBTASK` in `store.js`, via the pattern `!oldGoal.completed && updatedGoal.completed`. No other file may perform this check.
- **Reason**: The store already has access to both old and new state, making it the natural and correct orchestration point.

---

## Completion Experience Is an Isolated Module

- **Status**: Accepted (Phase 2.3.0.8)
- **Decision**: The completion experience (modal, events, renderer) lives in `frontend/src/js/completion/`, not inside `components.js` or any existing module.
- **Reason**: Separation of concerns, maintainability, future extensibility. `components.js` remains generic; completion concerns are scoped.

---

## Completion Scripts Load Only Where Needed

- **Status**: Accepted (Phase 2.3.0.8)
- **Decision**: `completionEvents.js`, `completionRenderer.js`, `completionModal.js` are only included in pages that consume goal state: `workspace.html`, `dashboard.html`, `planner.html`, `idealab.html`. They are excluded from `settings.html`, `analytics.html`, `focus.html`, `404.html`.

---

## Recommendation Logic Lives Only in the Backend

- **Status**: Accepted (Phase 2.3.0.6)
- **Decision**: Goal recommendation is computed by `GoalRecommendationService` via a single-pass algorithm. The frontend renders the result of `GET /api/v1/goals/recommended` without any re-ranking, filtering, or supplementary scoring.
- **Service is generic**: `GoalRecommendationService` is not a "dashboard service." Its consumers include Dashboard, Planner, Completion Modal, Mobile App, Push Notifications, and any future AI feature.

---

## Recommendation Selection Algorithm

- **Status**: Accepted (Phase 2.3.0.6 refinement)
- **Decision**: Use a single-pass O(n) scan — not a sort — to find the goal with the highest `deadlineInfo.sortPriority`. Tie-break by earliest deadline, then oldest `createdAt`. This makes intent explicit and avoids unnecessary sorting cost.

---

## Planner Architecture Is Frozen

- **Status**: Accepted (Phase 2.3.0.7)
- **Decision**: The Planner's core behaviors (drag-and-drop, view rendering, grid overlaps, block creation) must not be refactored unless resolving a verified bug. Phase 2.3.0.7 added intelligence to the Planner by integrating backend DTOs — without touching the core architecture.
- **Canonical rule**: All date resolution must use `window.getPlannerBlockDate(block)`.

---

## Dashboard and Planner Are Intelligence Consumers

- **Status**: Accepted (Phase 2.3.0.6 / 2.3.0.7)
- **Decision**: The Dashboard and Planner never calculate urgency, lifecycle, recommendation, health, or deadline priority. They subscribe to Store changes and render the backend DTOs they receive. All intelligence originates from the backend.

---

## Shared UI Components Must Be Reused

- **Status**: Accepted (Phase 2.3.0.5 onward)
- **Decision**: `window.SF_COMPONENTS` provides shared, canonical HTML render functions for goal cards, badges, status indicators, etc. New modules (e.g., Completion Modal) must reuse these components instead of creating duplicate implementations.

---

## GoalSyncService Owns Cross-Domain Goal Mutations

- **Status**: Accepted (Phase 2.2)
- **Decision**: When Planner actions need to affect Goal state (e.g., completing a milestone via Planner), they must go through `GoalSyncService`. No module may directly mutate another module's entities.
- **Rollback**: All cross-domain operations are atomic. If synchronization fails, GoalSyncService rolls back and propagates the error.

---

## Planner Is the Scheduling Source of Truth

- **Status**: Accepted (Phase 2.2)
- **Decision**: Scheduling belongs to the Planner. Goals are the progress source of truth. Focus is the execution source of truth. Analytics is read-only.

---

## Investigate Before Implementing

- **Status**: Standing Requirement (all phases)
- **Decision**: Before any implementation, trace the complete data flow from backend → service → store → renderer to identify root causes. Never implement based on assumptions. Screenshots, console logs, and code traces must confirm the root cause before any code is written.

---

## No Navigation in Completion Experience (v1)

- **Status**: Accepted (Phase 2.3.0.8)
- **Decision**: The Completion Modal provides only `Dismiss` and `Continue` actions. No routing to IdeaLab, Planner, or next goal is implemented. Navigation improvements belong to a future roadmap phase.

---

## Idempotency Guard on Completion Events

- **Status**: Accepted (Phase 2.3.0.8 polish)
- **Decision**: `CompletionModal.lastCompletedGoalId` guards against duplicate modal renders from retries, rapid updates, or optimistic UI glitches. It allows different goals to complete consecutively while suppressing duplicate events for the same goal.

---

## Workspace UI and Architecture Are Frozen

- **Status**: Accepted (Phase 2.3.1.3 Release Freeze)
- **Decision**: The Workspace UI, DiscoveryPipeline, SearchEngine, FilterEngine, SortEngine, Comparators, WorkspaceRenderer, WorkspaceMapper, Goal Health, Goal Editing, and Priority Architecture are officially frozen.
- **Constraints**: Micro-interactions intentionally remain subtle. The UI design is considered final. Future work should extend functionality without redesigning the Workspace or altering the core architecture.
