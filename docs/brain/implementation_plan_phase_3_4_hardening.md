# Phase 3.4 Hardening / Product Definition

## 1. Current Focus Architecture
[VERIFIED FACT] The Focus architecture separates scheduling from execution. The `FocusSession` model (MongoDB) acts as the server-authoritative source of truth for execution. The frontend `store.js` manages local state (`focus` slice) and pulls data from the active session. 
[VERIFIED FACT] The backend tracks `startTime`, `endTime`, `duration` (elapsed time in seconds), `goalId`, `milestoneId`, `plannerId`, `interruptions`, and `notes`. The frontend locally manages UI states like the `checklist`.

## 2. Verified Current Behavior
[EXISTING BEHAVIOR] Currently, when a user starts a Focus session, a POST request is sent to `/api/v1/focus/start`. The frontend then sets an active session ID and spins up a Pomodoro timer based on local `timerConfig` (defaulting to 25 minutes).
[EXISTING BEHAVIOR] If `goalId` and `milestoneId` are present on the session, `focusService.getActiveSprintTask` fetches them from the local `goals` slice. If they are absent (Free Focus), it makes a fallback call to `/api/v1/focus/sprint-task`, which dangerously plucks the first incomplete goal.

## 3. Generic Planner Context Problem
[VERIFIED FACT] A generic Planner block has a valid `plannerId` but no `goalId` or `milestoneId`.
[EXISTING BEHAVIOR] When `focusService.getActiveSprintTask(goalId, milestoneId)` evaluates a generic planner session, `goalId` is null. It incorrectly defaults to the `FREE FOCUS` fallback logic, displaying the title of the user's first incomplete Goal instead of the Planner block's context.
[PROPOSED CHANGE] Extend `getActiveSprintTask(goalId, milestoneId, plannerId)` to accept `plannerId`. If `goalId` is null but `plannerId` exists, resolve the task context locally using `SF_STORE.getSlice('planner').items`. This requires zero backend changes.

## 4. Timer Architecture Problem
[VERIFIED FACT] The timer always defaults to 25 minutes because `store.js` uses `timerConfig.focus` to set `timerTotal` and `timerRemaining`. It completely ignores the duration defined in the scheduled Planner block.
[PRODUCT DECISION] Conflating "Scheduled Work Window" (e.g., a 2-hour planner block) with "Execution Strategy" (e.g., 25-minute Pomodoros) breaks user expectations. 
[PROPOSED CHANGE] Focus should implement a timer mode selector in the UI. If a session originates from a Planner block with a duration, Focus should offer two modes: "Scheduled Duration" (countdown the 2 hours) or "Pomodoro" (default 25 minutes). This is purely a frontend visualization concern; the backend simply records elapsed `duration` regardless of mode.

## 5. Completion UX Problem
[EXISTING BEHAVIOR] Completion is primarily timer-driven or triggered via an "Abort" flow. There is no highly visible "Finish Early & Save" action that clearly communicates that notes and interruptions will be preserved.
[PROPOSED CHANGE] Add an explicit "Complete Session" action to the UI that can be triggered at any time. Add helper text explicitly stating: "Notes and distractions will be saved upon completion."

## 6. Session Persistence Problem
[VERIFIED FACT] On reload, `checklist`, `distractions`, and `scratchpad` reset to their default states.
[EXISTING BEHAVIOR] 
- `checklist` is a frontend-only construct hardcoded in `getActiveSprintTask` and not persisted.
- `distractions` and `notes` are only sent to the backend when `COMPLETE_SESSION` is dispatched.
[VERIFIED FACT] The backend route `PATCH /api/v1/focus/:id` (mapped to `FocusController.updateSession`) ALREADY EXISTS and accepts `interruptions` and `notes` according to `focus.validator.js`.
[PROPOSED CHANGE] Implement a debounced background sync in the frontend. When `notes` or `distractions` change, dispatch a `PATCH` request to `/:id` to save them continuously. For the `checklist`, we can either keep it ephemeral (as intended for transient focus steps) or serialize it into the `notes` field if persistence is truly desired.

## 7. Session State Model
[PRODUCT DECISION]
| State | Server (`status`) | Store (`isRunning`) | UI | Survives Reload? |
|------|--------|-------|----|----|
| No Session | (None) | `false` | Dashboard/Free Focus | N/A |
| Starting | `IN_PROGRESS` | `true` | Loading spinner | Yes |
| In Progress | `IN_PROGRESS` | `true` | Countdown Active | Yes (re-calculated from `startTime`) |
| Paused | `PAUSED` | `false` | Timer Halted | Yes (using `totalPausedTime`) |
| Break | `IN_PROGRESS`* | `true` | Break Timer Active | Yes |
| Completed | `COMPLETED` | `false` | Summary View | N/A (Session ends) |
| Aborted | `ABORTED` | `false` | Returns to Dashboard | N/A (Session ends) |

*Break states are typically frontend-managed intervals within a single execution block.*

## 8. Timer/Pomodoro Recommendation
[PROPOSED CHANGE] Do not force Pomodoro. Implement a segmented timer logic:
- If Planner duration exists > Use "Scheduled" mode (e.g. 2h)
- If Free Focus > Use "Stopwatch" (count up) or "Pomodoro" (25m)
- The backend `duration` field will naturally just capture elapsed execution time in seconds when completed, fully supporting all modes without backend changes.

## 9. UI Refinement Recommendations
[PROPOSED CHANGE] 
- **CRITICAL UX:** Fix the generic Planner block title mapping so users know what they are working on.
- **CRITICAL UX:** Add an explicit "End & Save Session" button.
- **MINOR POLISH:** Add a subtle save indicator for the scratchpad (e.g., "Saved to cloud" fading in/out) to build trust that notes survive.

## 10. Backend Changes
[VERIFIED FACT] **NO BACKEND CHANGES ARE REQUIRED.** 
The existing schema and existing `PATCH /api/v1/focus/:id` endpoint natively support updating `notes` and `interruptions` on the fly. The fallback logic problem for generic planners is entirely solvable on the frontend.

## 11. Exact Implementation Sequence
1. Update `store.js:focus/LOAD` and `focus/START_SESSION` to pass `plannerId` to `getActiveSprintTask`.
2. Update `focusService.js:getActiveSprintTask` to check `plannerId` and resolve the Planner block title locally if `goalId` is null.
3. Add a debounced auto-save effect in `store.js` that calls `PATCH /api/v1/focus/:id` whenever `scratchpad` or `distractions` change.
4. Update `focus.html` to include a clear "Complete Session" button.

## 12. Testing Strategy
- Run unit tests for `focusService` changes.
- Ensure integration tests remain untouched to guarantee Phase 3.3 freezing invariants.

## 13. Manual QA Strategy
- Create a generic Planner block, start Focus, and verify the title is the Planner block's title.
- Type in the scratchpad, refresh the page, and verify the notes are restored from the backend.
- Increment distractions, refresh, and verify the count restores.

## 14. Phase 3.3 Regression Protection
[REQUIRES APPROVAL] Since we will not touch `backend/`, Phase 3.3 contracts cannot be violated. All changes are localized to `frontend/src/js/store.js`, `frontend/src/js/services/focusService.js`, and `frontend/focus.html`.
