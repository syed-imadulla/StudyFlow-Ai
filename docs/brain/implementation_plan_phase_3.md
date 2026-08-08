# Phase 3 Implementation Plan: Focus Module Integration

## 1. Existing Architecture & Domain Models
Before defining integrations, we must strictly define the existing domain relationships and ownership models in the repository.

### Domain Distinctions
- **Goal:** Owns the macro objective, lifecycle, health, priority, and progress tracking.
- **Milestone (Subtask):** Embedded within a Goal; owns the specific unit of work that drives Goal progress.
- **Task (`Task.js`):** Owns an executable work item. Historically, this appears to be a generic/legacy task model. It is distinct from scheduling.
- **Planner Block (`Planner.js`):** Owns the scheduled instance of work. It maps time allocations to Goals (`goalId`) and Milestones (`milestoneId`).

### Focus Ownership Model
- **FocusSession:** Owns the **actual execution and time spent**. Focus must NOT become a parallel task management system. Focus asks: *"How much actual focused work happened?"* and logs execution against the references provided.

## 2. FocusSession Audit
The existing `FocusSession` schema contains:
- `user`, `type`, `status`, `startTime`, `endTime`, `duration`, `goalId`, `taskId`, `interruptions`, `pauseCount`, `notes`.

### Proposed Reference Strategy (DO NOT add fields yet)
Currently, `FocusSession` maps to a `taskId`. Before adding `plannerId` or `milestoneId`, we must evaluate:
- **Why it is necessary:** A Focus Session must accurately report execution time for a specific Milestone or Planner Block for analytics.
- **Why existing references are insufficient:** `taskId` references the generic `Task` model, whereas the modern Workspace architecture uses `Goal -> Subtask (Milestone) -> Planner Block`. If a session is started from a Planner block, storing the `Planner` ID is crucial.
- **Who owns it:** `FocusSession` will own these references as foreign keys.
- **Required/Optional:** Optional. Standalone sessions ("Free Focus") without a Goal or Planner reference must be supported.
- **Future migration impact:** Changing the schema will require a database migration, so we will definitively map the derived relationships in Phase 3.1 before altering the schema.

## 3. Timer Architecture: Server-Authoritative
The timer must be **server-authoritative**. 
- The frontend timer (`setInterval`) is strictly a **presentation clock**. 
- The backend owns the true `startTime`, `endTime`, `pause` states, and `duration` calculation based on persisted timestamps.
- **Duration Calculation:** Actual duration = Sum of all active intervals. Paused time, time after abandonment, and browser inactivity must not be counted. 

### Clock Safety
- The backend uses a consistent server-side time source (`Date.now()` on the server).
- Clock drift, tab sleep, or laptop hibernation on the client are mitigated because the frontend will derive its visual display from the authoritative backend state upon reconnection or `focus/LOAD`.

## 4. Session State Machine
Based on the existing `FOCUS_SESSION_STATUS` (`IN_PROGRESS`, `COMPLETED`, `ABORTED`), the state machine requires refinement to handle pauses securely.

**Proposed States:**
- `IN_PROGRESS`: Actively counting down.
- `PAUSED`: Timer is temporarily halted. (Requires adding `PAUSED` to the status enum).
- `COMPLETED`: Session successfully finished.
- `ABORTED`: Session was abandoned or canceled.

**Allowed Transitions:**
- `IN_PROGRESS` → `PAUSED`
- `PAUSED` → `IN_PROGRESS`
- `IN_PROGRESS` → `COMPLETED`
- `IN_PROGRESS` → `ABORTED`
- `PAUSED` → `ABORTED`

**Invalid Transitions:**
- `COMPLETED` → `IN_PROGRESS` (A completed session is immutable).
- `ABORTED` → `IN_PROGRESS` (An aborted session is immutable).

## 5. Recovery Architecture & Pause/Resume Design
- **Start:** Frontend requests start -> Backend creates session -> Returns server `startTime`.
- **Pause:** Frontend requests pause -> Backend logs pause timestamp, updates status to `PAUSED`.
- **Resume:** Frontend requests resume -> Backend logs resume timestamp, updates status to `IN_PROGRESS`.
- **Browser Closure without Pause:** If a user closes the browser mid-session, the session remains `IN_PROGRESS` on the backend.
- **Recovery (Focus Page Load):** 
  - Frontend requests the active session via `focus/LOAD`.
  - Backend returns the authoritative session state.
  - Frontend reconstructs the timer display based on `(serverTime - startTime) - totalPausedTime`.
  - Local browser storage may be used as a cache, but *never* as the source of truth.

## 6. Multiple Active Sessions
**Enforcement:** ONE active FocusSession per user.
- The backend must strictly enforce this constraint. If a user attempts to start a new session while one is `IN_PROGRESS` or `PAUSED`, the backend must reject the request or auto-abort the previous session.

## 7. Edge-Case Behavior & Goal Interactions
Focus should **never** silently modify Goal lifecycle state. 

- **Goal completed during Focus:** The active session continues normally. Execution time is preserved.
- **Goal archived during Focus:** The active session continues normally. Execution time is preserved.
- **Goal deadline passes during Focus:** The active session continues normally.
- **Planner block deleted during Focus:** The session retains the orphaned `plannerId` reference. Execution time is preserved for analytics.
- **Session without Goal/Task:** A "Free Focus" session is created with null references. Valid and fully supported.

## 8. Distraction Tracking
The existing `FocusService` tracks distractions (`interruptions`, `pauseCount`). 
- **Audit:** Distractions are currently logged incrementally and surfaced for AI suggestions. 
- **Phase 3.1 Constraint:** Do not redesign this behavior. Keep distraction intelligence completely separated from the server-authoritative timer correctness. Distraction counts are presentation/analytics inputs and do not alter the calculated true `duration`.

## 9. AI Suggestions
AI distraction recommendations are a separate concern. Phase 3.1 focuses entirely on establishing reliable, server-authoritative session data. AI logic will consume this data later and should not influence timer architecture.

## 10. Analytics Compatibility
The data model must allow future analytics to calculate:
- Total focus time
- Focus time per Goal / Milestone / Planner Task
- Sessions per day and average duration
- Completion and interruption rates
**Constraint:** Do NOT implement the analytics endpoints/charts now. Just ensure the data model inherently supports these queries.

## 11. Phase Boundaries
**Phase 3.1: Focus Foundation (COMPLETED 2026-08-08)**
- Establish Session state machine (`IN_PROGRESS`, `PAUSED`, `COMPLETED`, `ABORTED`).
- Implement Backend-authoritative timing (Start, Pause, Resume, Complete, Abort).
- Build the Recovery pipeline (`focus/LOAD` reconstructing from backend).
- Backend validation (One active session limit).

**Phase 3.2: Goal / Milestone Integration**
- Add UI hooks: Start Focus from Goal / Milestone.
- Map correct Goal references to the backend session.

**Phase 3.3: Planner Integration**
- Add UI hooks: Start Focus from Planner Task.
- Map correct Planner block references to the backend session.

**Phase 3.4: Focus UX Polish**
- Refine Focus interface, timer presentation, visual feedback, and existing distraction UI.

## 12. Frozen Systems
The following systems are explicitly **FROZEN** and must not be modified during Phase 3.1 unless a concrete integration requirement proves a change is unavoidable:
- Workspace UI
- DiscoveryPipeline
- SearchEngine, FilterEngine, SortEngine, Comparators
- Goal Health & Priority Architecture
- Goal Lifecycle Engine & Goal Management
- Planner business logic

## 13. Test Strategy (QA)
Before completing Phase 3.1, tests must validate:
- Session creation and start timestamps.
- Pause/Resume tracking (duration calculation excluding paused time).
- Completion and Abandonment (Aborted) finalization.
- Invalid state transitions (e.g., trying to resume a completed session).
- Backend rejection of duplicate active sessions.
- Refresh recovery and Browser close recovery.
- Multiple pause/resume cycles calculating exact duration accurately.
- [x] Create `POST /api/v1/focus/start` (No ID required)
- [x] Create `POST /api/v1/focus/:id/pause`
- [x] Create `POST /api/v1/focus/:id/resume`
- [x] Create `POST /api/v1/focus/:id/complete`
- [x] Create `POST /api/v1/focus/:id/abort`
- [x] Implement backend active session check (prevent duplicate concurrent sessions)
- [x] Refactor `frontend/src/js/services/focusService.js` to use POST requests correctly
- [x] Test lifecycle state transitions and database time accumulation
- [x] Build integration test suite with isolated tests (`tests/integration/focus.api.test.js`)
- Goal, Milestone, and Planner reference retention during deletion/archival edge cases.
- Zero console errors and persistence after refresh.

## 15. Phase 3.2: Goal/Milestone Integration Plan
**Status:** PENDING APPROVAL

### Goal & Milestone Reference Schema Analysis
The current `FocusSession` schema contains:
- `goalId`: Refers to the `Goal` model.
- `taskId`: Refers to the `Task` model.

**Architectural Conflict:**
In the StudyFlow architecture, a "Milestone" is implemented as a subdocument array (`subtasks`) within the `Goal` model, rather than as a standalone document in the `Task` collection. Therefore, placing a Milestone ID into the `taskId` field of `FocusSession` is semantically incorrect and will break Mongoose `populate('taskId')` operations because the ID does not exist in the `Task` collection.

**Proposed Schema Change:**
We must explicitly add `milestoneId` to the `FocusSession` model.
- `milestoneId: { type: mongoose.Schema.Types.ObjectId, default: null }`
- Note: It does not need a strict `ref` since it is a subdocument of the referenced `Goal`, but it explicitly designates the intent of the field.

*Migration Implications:*
- Existing sessions remain compatible since `milestoneId` will default to `null`.
- Free Focus continues working with both `goalId` and `milestoneId` as `null`.

### UI Integration Strategy
The existing UI already has well-defined action areas that we will reuse without altering visual design:

1. **Goal Integration:** 
   - Add a "Start Focus" item to the existing Goal Action Overflow Menu (`renderGoalActionMenu` in `components.js`), utilizing the exact same styling as "Edit Goal" or "Archive Goal".
   - `WorkspaceActions.startFocus(goalId, null)`

2. **Milestone Integration:**
   - The dashboard mode of `renderTaskCard` currently has a non-functional "Start Focus Timer" icon button. We will bind this to `WorkspaceActions.startFocus(goalId, milestoneId)`.
   - We will mirror this exact minimal icon button into the `workspace` mode of `renderTaskCard`.

### State & API Integration
- `WorkspaceActions.startFocus(goalId, milestoneId)` will be updated to dispatch `focus/START_SESSION` with the explicit payload.
- `store.js` will send `goalId` and `milestoneId` instead of relying on a mock active task.
- `focusService.js` and `focus.routes.js` will handle `milestoneId`.
- Duplicate active session checks (409) will catch gracefully and display via the existing `window.SF_COMPONENTS.showToast()`.

### User Review Required
> [!IMPORTANT]
> **Schema Change Approval Needed:** Do you approve the addition of `milestoneId` to the `FocusSession` schema to properly decouple it from `taskId`, preventing reference corruption?
