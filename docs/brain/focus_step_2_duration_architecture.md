# Step 2 — Focus Method & Planner Duration Architecture

## 1. Verified Current Architecture
- [VERIFIED FACT] Planner is exclusively the execution entry point; it passes its `plannerId` to Focus.
- [VERIFIED FACT] The backend `FocusSession` model enforces that every execution creates a unique session record pointing to a specific `plannerId`, `goalId`, and `milestoneId`.
- [EXISTING BEHAVIOR] Currently, when a user clicks "Start Focus" on a 2-hour Planner block, the frontend ignores the block's scheduled duration and automatically instantiates a default Pomodoro (e.g. 25 min) display timer.

## 2. Planner Time Model
- [VERIFIED FACT] `backend/src/models/Planner.js` stores `startTime` and `endTime` as UTC `Date` objects.
- [VERIFIED FACT] It does not directly store a `duration` field; duration is dynamically calculated as the difference between `endTime` and `startTime`.
- [VERIFIED FACT] Timezone awareness is handled automatically since MongoDB stores UTC.
- [VERIFIED FACT] Recurring blocks store the rule in `recurrence` and the base `startTime`/`endTime`, but their executable instances (occurrences) mathematically inherit the duration boundaries.

## 3. Focus Timer Model
- [VERIFIED FACT] `frontend/src/js/store.js` relies on `localStorage` (`sf_focus_timer_mode`) for `timerTotal` and `timerModeText`. If missing, it defaults to a 25-minute Pomodoro `timerConfig.focus`.
- [VERIFIED FACT] `timerRemaining` is calculated purely as `Math.max(0, focusPatch.timerTotal - activeDuration)`.
- [EXISTING BEHAVIOR] When `timerRemaining` hits zero, the frontend simply stops ticking down but does NOT automatically complete the session in the backend. 
- [VERIFIED FACT] `backend/src/models/FocusSession.js` tracks the authoritative `duration`. It is explicitly calculated at the backend during `endSession` as: `(endTime - startTime) - totalPausedTime`.

## 4. Scheduled Time vs Actual Execution Time
- [PRODUCT DECISION] "Scheduled Time" (Planner) defines *when* and *for how long* work was anticipated (e.g. 120 minutes).
- [PRODUCT DECISION] "Actual Execution Time" (FocusSession) defines the literal elapsed seconds minus paused seconds for a given execution run.
- [INFERENCE] Because a 120-minute Planner block can host multiple 25-minute Pomodoro `FocusSession` instances, the system correctly decouples "plan" from "execution". Therefore, `FocusSession.duration` MUST NOT blindly overwrite or sync to the Planner scheduled duration.

## 5. Focus Methods
To prevent overengineering and provide clarity within the current architecture:
- [PRODUCT DECISION] **Pomodoro**: 25-minute countdown (customizable). Once it reaches zero, it stops. User can take a break (pause or complete session) and start a new one.
- [PRODUCT DECISION] **Time Block**: Countdown automatically set to the time remaining in the current Planner block. Useful for uninterrupted focused sessions.
- [PRODUCT DECISION] **Stopwatch (Deep Focus)**: Count-up timer with no maximum limit. Execution continues until manually completed.
- [DEFERRED] Flow Session, Task Sprint, Exam Mode, Quick Focus are unnecessary complexity for now and deferred.

## 6. Recommended Focus Method Model
- [PRODUCT DECISION] Treat the Planner duration as a scheduling boundary, while the Focus Method strictly controls the display timer logic.
- [PRODUCT DECISION] Focus Method selection must happen **after** the `FocusSession` is created. `plannerId` establishes WHAT is being executed. The Focus Method establishes HOW it is executed.
- [PRODUCT DECISION] The exact ordering must be: `Planner → START_SESSION → FocusSession → Focus Method selection`.
- [PRODUCT DECISION] The user selects their preferred Focus Method (Pomodoro, Time Block, Stopwatch) in `focus.html` after the active session is loaded, and the frontend configures the timer display accordingly without modifying backend schemas or session prerequisites.

## 7. Planner Duration Relationship
- [PRODUCT DECISION] Planner Scheduled Duration does not force the frontend timer *unless* the user specifically selects the "Time Block" Focus Method.
- [EXISTING BEHAVIOR] If Pomodoro is selected, the timer ignores the Planner duration and counts down from 25 minutes, creating a discrete `FocusSession` chunk against that Planner block.

## 8. Late Start / Early Finish / Overrun
Assuming Planner block is 2:00 PM → 4:00 PM (120 mins) and "Time Block" is selected:
- [PRODUCT DECISION] **Late Start (e.g. 2:20 PM)**: The timer automatically calculates `4:00 PM - 2:20 PM = 100 minutes` remaining and sets that as `timerTotal`.
- [PRODUCT DECISION] **Early Finish (e.g. 3:20 PM)**: The user manually clicks "End Session". `FocusSession.duration` records exactly 60 minutes. The Planner block can be marked complete early.
- [PRODUCT DECISION] **Overrun (e.g. 4:30 PM)**: If the timer reaches 0 at 4:00 PM, it enters overtime (count-up mode) or stops, but `activeDuration` continues tracking. If manually ended at 4:30 PM, `FocusSession.duration` correctly reflects the 150 minutes of actual execution.

## 9. Pause / Resume / Break Behavior
- [VERIFIED FACT] The backend calculates `totalPausedTime` natively by tracking `pauseCount` and `lastPausedAt`.
- [PRODUCT DECISION] A "Pause" suspends execution tracking and does NOT count towards `FocusSession.duration`.
- [PRODUCT DECISION] A "Break" (e.g., between Pomodoros) is handled by Completing the current `FocusSession` and resting before creating a NEW `FocusSession` for the next cycle. We will not build complex nested break states inside `FocusSession.js`.

## 10. Session History Requirements
- [EXISTING BEHAVIOR] `FocusSession` currently tracks `date`, `duration`, `interruptions`, and `taskId` / `plannerId`.
- [INFERENCE] To view comprehensive history for a specific Planner block later, the backend only needs to aggregate all `FocusSession` records querying `plannerId === targetId`.
- [DEFERRED] Advanced visualization of Pomodoro cycles vs Break gaps in the dashboard.

## 11. AI Compatibility
- [INFERENCE] Because `FocusSession` records pure execution time securely linked to a `plannerId` (and inherited `goalId`), future AI agents can easily compare "Scheduled Duration" (Planner) vs "Actual Duration" (sum of FocusSessions) to provide accurate productivity and under-estimation insights.

## 12. Deferred Features
- [DEFERRED] "Auto-complete Planner block on timer zero". User must manually end the session to ensure accurate reporting.
- [DEFERRED] "Forced breaks" or automated "Rest Sessions" tracked in the database.
- [DEFERRED] Niche timer modes like Exam Mode or Flow Session.

## 13. Risks
- If the frontend "Time Block" mode calculates remaining time incorrectly due to local clock vs server timezone mismatch, `timerTotal` might be wildly incorrect. We must calculate Time Block remaining time using server-aligned timestamps where possible.

## 14. Proposed Step 3 Implementation Scope
- Implement the "Time Block" mode in the frontend that dynamically reads the `endTime` of the active `Planner` task.
- Build the Focus Method selector UI in `focus.html` (Pomodoro, Time Block, Stopwatch) to configure the display timer *after* `START_SESSION` has already instantiated the backend session and the UI is active.
- No backend schema changes required.

## 15. Regression Baseline
- [VERIFIED FACT] Running `npm run test:integration` currently yields `48 passed, 48 total`. No broken state exists prior to Step 3.

## 16. Final Architecture Decision
- We will proceed with the decoupled architecture: Planner dictates the scheduled boundary; Focus Method dictates the UI execution strategy; Backend strictly monitors absolute elapsed time.
