# Focus Step 0 — Architecture Lock

## 1. Product Model
The intended StudyFlow execution model strictly follows:
`GOAL → MILESTONE → PLANNER → PLANNER ITEM / SCHEDULED BLOCK → FOCUS → FOCUS METHOD → FOCUS SESSION → SESSION RESULT`

- **[PRODUCT RULE]** Planner is the authoritative source of executable focus work.
- **[PRODUCT RULE]** A Goal or Milestone is a contextual reference, not a direct execution target. They become executable only when represented as a scheduled Planner block.

## 2. Verified Current Architecture
- **[VERIFIED FACT]** The `FocusSession` schema accurately stores references for `plannerId`, `goalId`, `milestoneId`, and `taskId`.
- **[VERIFIED FACT]** The backend `FocusService` governs the session lifecycle (start, pause, resume, end, abort) securely and authoritatively.
- **[VERIFIED FACT]** The frontend relies on `store.js` (via `focus/LOAD` and `focus/START_SESSION`) and `focusService.js` to marshal data between the UI and backend.

## 3. Planner → Focus Flow
- **[EXISTING WORKING BEHAVIOR]** The `planner.html` UI exposes a "Start Focus" button in the context menu for blocks.
- **[EXISTING WORKING BEHAVIOR]** Selecting this action invokes `startPlannerFocus(id)`, which dispatches `focus/START_SESSION` with `{ plannerId }`.
- **[VERIFIED FACT]** The backend `FocusService.createSession` validates Planner ownership and securely overrides the payload's `goalId` and `milestoneId` with the authoritative values from the `Planner` document.

## 4. Normal Planner Task Flow
- **[VERIFIED FACT]** A normal Planner task created without Goal context has `goalId = null` and `milestoneId = null`. This correctly cascades into the `FocusSession`.

## 5. Milestone → Planner → Focus Flow
- **[VERIFIED FACT]** If a Milestone is scheduled in the Planner, the backend inherits and locks the associated `goalId` and `milestoneId` into the active `FocusSession`.

## 6. Generic Planner Flow
- **[VERIFIED FACT]** The frontend `getActiveSprintTask` explicitly checks for `plannerId`. If a `plannerId` exists but `goalId` is null, it resolves the local Planner block without falling back to an unrelated Goal.

## 7. Recurring Planner Flow
- **[EXISTING WORKING BEHAVIOR]** Recurring blocks in the Planner UI append virtual recurrence dates (e.g., `664c...::2026-08-08`).
- **[VERIFIED FACT]** The frontend `startPlannerFocus` explicitly strips the `::` suffix and sends the underlying real `plannerId` to the backend.
- **[VERIFIED FACT]** The backend securely validates this by querying `$or: [{ _id: plannerId }, { seriesId: plannerId }, { originalSeriesId: plannerId }]`.

## 8. Current Free Focus Flow
- **[EXISTING WORKING BEHAVIOR]** "Free Focus" triggers when `focus/START_SESSION` receives no `goalId` and no `plannerId`.
- **[EXISTING WORKING BEHAVIOR]** The backend creates a `FocusSession` entirely null of contextual IDs.
- **[LEGACY BEHAVIOR]** The frontend `getActiveSprintTask` handles a null context by fetching `/focus/sprint-task` (the user's first incomplete Goal) and displaying it to the user.
- **[CONFLICT]** The UI silently suggests an incomplete Goal as the working context, even though the session itself lacks a `goalId`.
- **[REQUIRES PRODUCT DECISION]** Should "Free Focus" be removed, or formally supported as a purely unstructured execution session?

## 9. Current Goal → Focus Flow
- **[LEGACY BEHAVIOR]** `workspaceActions.startFocus(goalId, milestoneId)` is currently wired to Goal action menus in `components.js`.
- **[CONFLICT]** This behavior completely bypasses the Planner, violating the core product model. It creates a `FocusSession` with a `goalId` but a null `plannerId`.

## 10. Current Milestone → Focus Flow
- **[LEGACY BEHAVIOR]** `workspaceActions.startFocus` is wired to Milestone action buttons in `components.js`.
- **[CONFLICT]** This also bypasses the Planner, violating the core product model.

## 11. FocusSession Data Model
- **[VERIFIED FACT]** Schema natively supports: `type`, `status`, `startTime`, `endTime`, `duration`, `goalId`, `taskId`, `milestoneId`, `plannerId`, `interruptions`, `pauseCount`, `totalPausedTime`, `notes`.

## 12. Goal / Milestone / Planner Relationships
- **[VERIFIED FACT]** Milestones are embedded subdocuments (`subtasks`) within the `Goal` document.
- **[VERIFIED FACT]** `Planner` blocks directly reference `goalId` and `milestoneId`.
- **[VERIFIED FACT]** The `plannerId` is client-supplied to the Focus endpoint, but `goalId` and `milestoneId` are strictly inherited authoritatively by the backend from the Planner.

## 13. Current Timer Architecture
- **[EXISTING WORKING BEHAVIOR]** Timer modes (Pomodoro, Breaks, Stopwatch) dictate execution behavior entirely on the frontend UI.
- **[VERIFIED FACT]** Pause/Resume/Completion dynamically calculates `activeDurationSeconds` securely on the backend based on `startTime` and `totalPausedTime`.
- **[VERIFIED FACT]** Reloads correctly reconstruct elapsed time using the backend's authoritative timestamps.

## 14. Current Duration Sources
- **[EXISTING WORKING BEHAVIOR]** Countdown timer duration is strictly driven by the Pomodoro configuration in user settings / `localStorage`.
- **[CONFLICT]** Planner blocks have explicit scheduled durations (e.g., 2 hours), but this scheduled block duration is entirely ignored by the Focus timer. 

## 15. Current Focus Method Behavior
- **[EXISTING WORKING BEHAVIOR]** The system currently supports standard Pomodoro, Short Break, Long Break, and Stopwatch.
- **[OPEN QUESTION]** How should advanced intended methods (Deep Focus, Task Sprint, Time Block, Flow) be modeled? Specifically, "Time Block" would likely require inheriting the Planner block's scheduled duration.

## 16. Current Problems / Loopholes
- **[CONFLICT]** Goals and Milestones can be executed directly into Focus via the UI, bypassing the Planner.
- **[CONFLICT]** Planner block duration has no impact on Focus execution strategy.

## 17. Product Rules
- Focus must only be launched from a scheduled Planner item.
- Goals and Milestones are context, not execution points.
- A generic Planner item is a perfectly valid Focus target.

## 18. Frozen Systems
The following architecture is considered highly stable and should not be modified:
- Phase 3.1: Server-authoritative Focus lifecycle and duration calculation.
- Phase 3.2: Goal/Milestone strict database relationships and subtask embedding.
- Phase 3.3: Planner → Focus backend ownership inheritance.
- Phase 3.4: Duplicate completion locks, sequential debounce autosave.

## 19. Open Questions
- Is "Free Focus" going to be officially dropped or formalized as unstructured execution?
- Do we want to introduce "Time Block" mode immediately so that Focus countdown timers respect Planner scheduled block duration?

## 20. Proposed Step 1 Scope
- **Deprecate Direct Execution:** Remove `workspaceActions.startFocus` from Goal and Milestone UI action menus in `components.js`.
- **Force Scheduling:** Replace direct execution UI with "Schedule in Planner" flows.
- **Resolve Free Focus:** Formalize or drop the Free Focus fallback behavior in `focusService.js`.

## 21. Files Likely To Be Modified Later
- `frontend/src/js/workspace/workspaceActions.js`
- `frontend/src/js/components.js`
- `frontend/src/js/services/focusService.js`

## 22. Files That Should Remain Untouched
- `backend/src/models/*` (FocusSession, Planner, Goal)
- `backend/src/services/*`
- `backend/src/controllers/*`
- `frontend/src/js/store.js`

## 23. Test Baseline
- **[VERIFIED FACT]** Integration test suite `npm run test:integration` currently exits with `48/48 PASS`.

## 24. Manual QA Baseline
- Manual QA from Phase 3.4 is pending user verification.
