# Architecture

## High-Level Flow
Data and responsibility flow sequentially downward through the modules:
**Goals** ↓ **Milestones** ↓ **Planner** ↓ **Focus** ↓ **Analytics**

1. Users create **Goals**.
2. Goals are broken into **Milestones**.
3. Milestones are scheduled into the **Planner** as Planner Blocks.
4. Scheduled blocks are executed in the **Focus** module.
5. Execution data feeds into **Analytics**.

## Store Architecture
The frontend uses a custom global state manager `window.SF_STORE`.
- It acts as the single source of truth for UI state and cached entities (goals, planner blocks).
- State mutations are centralized to ensure reactivity and consistency across disjointed views.

## Rendering Flow
- Rendering is store-driven. Views react to changes in the global store.
- Re-rendering is modular (e.g., Weekly view updates independently of Monthly view).
- Data formatting and entity derivation happens immediately before the render loop, utilizing unified helpers (like `getPlannerBlockDate`) to ensure consistency across views.

## Backend Architecture
- Node.js/Express REST API.
- MongoDB for persistence, interfaced via Mongoose.
- Schemas strictly mirror frontend expectations, with Mongoose transforms handling property normalization (e.g., formatting `_id` to `id`, ensuring `dateStr` existence).

## Goal ↔ Planner Synchronization (Phase 2.2)
The Planner and Goal modules interact closely when Milestones are scheduled. Synchronization follows strict rules:

### Domain Ownership
- **PlannerService** orchestrates synchronization but **NEVER** mutates Goal state directly.
- **GoalSyncService** is the sole domain boundary responsible for mutating Goal state when reacting to Planner events.
- **Planner** is the source of truth for scheduling. **Goal** is the source of truth for progress and completion.

### State Transition Matrix
| Initial Status | Action         | Expected Status |
|----------------|----------------|-----------------|
| TODO           | Schedule       | SCHEDULED       |
| SCHEDULED      | Complete       | COMPLETED       |
| SCHEDULED      | Delete Planner | TODO            |
| SCHEDULED      | Reschedule     | SCHEDULED       |
| COMPLETED      | Reschedule     | COMPLETED       |

### Rollback Strategy & Atomicity
All cross-domain actions are atomic:
1. `PlannerService` applies its local mutation.
2. `GoalSyncService` applies the synchronized mutation.
3. If synchronization fails, `PlannerService` catches the error, triggers the respective `GoalSyncService.rollbackPlanner*` method to reverse state, logs the rollback, and safely propagates the original error.

### Invariants
1. **1:1 Mapping**: One Milestone corresponds to exactly one Planner Block. No duplicates.
2. **Status ↔ Completed**: If `status == COMPLETED`, then `completed == true`.
3. **Derived Progress**: Goal progress is strictly derived as `Completed Milestones / Total Milestones`. It is never manually overridden.
4. **Fail-Fast**: If synchronization encounters broken references (e.g., missing Goal or Milestone), it throws an immediate `AppError` instead of swallowing inconsistencies.

### Future Extensions
Features like Focus Sessions, AI Planner, or Calendar Sync that require cross-domain state adjustments MUST integrate through `GoalSyncService` to update Goal states. Do not bypass `GoalSyncService`.

## Intelligence Layer & ViewModel Architecture (Phase 2.3)
To ensure scalability, the system strictly separates factual data, derived intelligence, and presentation.

### 1. Store Facts, Derive Intelligence
The database stores immutable facts (e.g., `deadline`, `completedAt`, `status`). 
The **Intelligence Layer** dynamically derives state without persisting it:
- **GoalLifecycleService / MilestoneLifecycleService**: Calculates `ACTIVE`, `DUE_SOON`, `OVERDUE`, `COMPLETED`, etc.
- **GoalProgressService**: Aggregates milestone metrics (`completionPercentage`, `remainingMilestones`, `goalHealth`).
- **DeadlineIntelligenceService**: Formats lifecycle information into machine-readable types (`TODAY`, `UPCOMING`) and UI assets (color, badge, urgencyLevel).

### 2. ViewModels & Pure Presentation (Frontend)
The UI acts exclusively as a consumer of backend intelligence. 
- **Zero Calculations**: The frontend performs zero date math, deadline comparisons, or progress derivations.
- **Mappers (e.g., WorkspaceMapper)**: Isolates the frontend from the backend schema by transforming raw API objects into flattened `ViewModels`.
- **Pure Rendering**: Components (`workspaceComponents.js`) receive only ViewModels and execute in O(1) time without business logic. 
- **Modular State**: Dedicated UI state managers (e.g., `workspaceState.js`) handle sorting and filtering using backend-derived properties (e.g., `goal.goalHealth.score`, `goal.deadlineInfo.sortPriority`).
