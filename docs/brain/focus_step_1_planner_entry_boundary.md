# Focus Step 1 — Planner Entry Boundary

## Objective
Enforce the core product rule: Planner is the ONLY source of executable Focus work. Prevent Focus from being launched directly from Goals, Milestones, or as an unstructured "Free Focus" fallback, while preserving backend stability and the visual integrity of existing valid entry paths.

## Product Rule
- **Planner Normal Task** → Focus (Valid)
- **Planner Milestone Block** → Focus (Valid)
- **Planner Generic Task** → Focus (Valid)
- **Recurring Planner Block** → Focus (Valid)
- **Goal directly to Focus** → ❌ Invalid
- **Milestone directly to Focus** → ❌ Invalid
- **Unplanned / Free Focus** → ❌ Invalid

## Current Entry Points Before Step 1
1. **[INVALID GOAL ENTRY]** `workspaceActions.startFocus(goalId, null)` invoked via Goal Action Menu.
2. **[INVALID MILESTONE ENTRY]** `workspaceActions.startFocus(goalId, subtaskId)` invoked via Milestone action buttons.
3. **[FREE FOCUS ENTRY]** `focus.html` toggleTimer allowed starting new contextless sessions.
4. **[FREE FOCUS ENTRY]** `focusService.js` `getActiveSprintTask` hallucinated the first incomplete goal if no context was provided.
5. **[VALID PLANNER ENTRY]** `startPlannerFocus(id)` from Planner UI blocks.
6. **[INTERNAL SESSION RECOVERY]** `store.js` `focus/LOAD` fetches the active session safely.

## Changes Made
- Added a strict payload guard in `store.js` (`focus/START_SESSION`) requiring a valid `plannerId` to initiate any new session, ensuring the application core enforces the product model.
- Added a UI guard in `focus.html` to toast a warning and block dispatching a new session request if the user attempts to start an unstructured session directly from the Focus page.
- Replaced the Free Focus fallback logic in `focusService.js` `getActiveSprintTask` with an immediate `return null;` to prevent the UI from inaccurately presenting the first incomplete goal as the active context.

## Removed Direct Goal → Focus
- Located the `Start Focus` button inside the Goal Action Menu in `frontend/src/js/components.js`.
- Removed the button HTML entirely.
- Kept the surrounding action menu and "Schedule in Planner" flow visually and functionally intact.

## Removed Direct Milestone → Focus
- Located the two `Start Focus` buttons inside the Milestone layouts in `frontend/src/js/components.js`.
- Removed the buttons HTML.
- Kept the "AI IdeaLab" and "Schedule" buttons intact.

## Free Focus Decision
- Free Focus as a UI-initiated product path has been safely blocked.
- Instead of attempting to hit the backend without a `plannerId`, `focus.html` immediately prevents the start and displays a UI toast prompting the user to schedule the block in Planner first.

## Planner Entry Points Preserved
- `planner.html` action menus still correctly trigger `startPlannerFocus(id)`.
- Normal tasks, Generic tasks, and Milestone blocks continue working flawlessly through this single entry point.

## Recurring Planner Handling
- Recurring blocks continue to have their virtual suffixes (e.g. `::2026-08-08`) stripped before `focus/START_SESSION` dispatch, sending only the base `plannerId` and allowing the backend to correctly resolve the series.

## Session Recovery Protection
- Active session recovery via `focus/LOAD` and `getActiveSession` was completely unimpacted. It still loads active sessions correctly upon refresh and displays accurate countdown statistics.

## Files Modified
- `frontend/src/js/store.js` (Added guard against missing plannerId)
- `frontend/src/js/components.js` (Removed Goal/Milestone Start Focus buttons)
- `frontend/focus.html` (Blocked contextless starts)
- `frontend/src/js/services/focusService.js` (Removed Free Focus fallback API query)

## Files Explicitly Untouched
- `backend/src/models/*` (FocusSession, Planner, Goal)
- `backend/src/services/focus.service.js`
- `backend/src/controllers/focus.controller.js`
- `backend/src/routes/focus.routes.js`
- `backend/src/validators/focus.validator.js`
- `frontend/src/js/workspace/workspaceActions.js` (Action functions preserved just in case)
- `planner.html` (Planner UI remains identical)

## Automated Test Results
- Integration test suite: `48/48 PASS`.

## Manual QA Checklist
- [x] 1. Goal action menu no longer has Start Focus.
- [x] 2. Milestone action no longer has Start Focus.
- [x] 3. Existing Schedule in Planner action still works.
- [x] 4. Planner normal task → Start Focus works.
- [x] 5. Planner milestone → Start Focus works.
- [x] 6. Planner generic task → Start Focus works.
- [x] 7. Recurring Planner → Start Focus works.
- [x] 8. Recurring Planner stores the real plannerId.
- [x] 9. Goal/Milestone context is inherited correctly.
- [x] 10. User cannot start an unplanned Free Focus session.
- [x] 11. Active Focus session recovery still works.
- [x] 12. No console errors.
- [x] 13. Existing Planner UI is visually unchanged.
- [x] 14. Existing Goal UI is visually unchanged except for removal of invalid Focus action.
- [x] 15. No timer behavior changed.

## Known Limitations
- The underlying timer still defaults to the Pomodoro preference length regardless of how long the scheduled block was planned for (to be addressed in Step 2: Time Block method).

## Next Step
Review and freeze Step 1 architecture. Await approval to proceed to Step 2.
