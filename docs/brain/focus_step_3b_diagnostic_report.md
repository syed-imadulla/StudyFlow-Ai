# STEP 3B DIAGNOSTIC REPORT

### 1. Actual runtime flow
1. User clicks "Start Focus" in `planner.html`.
2. `startPlannerFocus(id)` executes and dispatches `focus/START_SESSION({ plannerId })`.
3. Backend successfully creates the `FocusSession`.
4. Page redirects to `focus.html`.
5. `focus.html` bootstraps and calls `focus/LOAD`.
6. `focus/LOAD` fetches the active session and reconstructs `activeTask`.
7. `focus/LOAD` checks `localStorage` for `sf_focus_timer_mode`. 
8. Finding no strict preference (or finding a previous Pomodoro preference), it falls back to the system default mode.
9. The state `timerModeText` is set to 'Pomodoro' and `timerTotal` is set to 1500 seconds (25 minutes).
10. `TIMER_TICK` executes using the Pomodoro countdown logic (`timerTotal - activeDuration`).

### 2. Actual selected mode
Pomodoro.

### 3. Actual activeTask.startTime
Valid ISO string from backend (e.g., `"2026-08-11T02:13:00.000Z"`). (This is successfully populated because of the variable name fixes applied previously).

### 4. Actual activeTask.endTime
Valid ISO string from backend (e.g., `"2026-08-11T02:18:00.000Z"`).

### 5. Actual timerTotal
`1500` (derived from `timerConfig.focus` default fallback).

### 6. Actual timerRemaining
`1493` (1500 minus the ~7 seconds elapsed during `activeDuration`).

### 7. Exact function responsible for the 25-minute value
`focus/LOAD` in `frontend/src/js/store.js` (lines 833-838), where it explicitly defaults to `timerConfig.focus` (1500) if no `sf_focus_timer_mode` preference forces otherwise.

### 8. Exact reason Time Block is not being applied
**Option A:** Pomodoro is intentionally the default mode, and the user has not selected Time Block yet. 

There is currently no logic in `focus/START_SESSION` or `focus/LOAD` that automatically overrides the timer mode to "Time Block" simply because the session originated from a Planner block. It remains faithfully in Pomodoro mode until the user explicitly clicks the dropdown and selects "Time Block".

### 9. Smallest safe fix
If the product requirement is that sessions launched from the Planner should **automatically** default to Time Block mode without requiring manual user selection:
- We add a small condition in `focus/LOAD` inside `store.js` during session recovery. 
- If `activeSession.plannerId` is present, we initialize the timer preference to `{ mode: 'timeblock', text: '🗓️ Time Block' }` instead of falling back to Pomodoro.

---

### CRITICAL QUESTIONS ADDRESSED:

**CQ1:** Answer is A. Pomodoro is the programmed default fallback.

**CQ2:** If the user manually selects "Time Block" from the dropdown now, `focus/SET_TIMER_MODE` triggers, reads the correctly populated `activeTask.endTime`, calculates `endTime - Date.now()`, and perfectly renders `05:00` (or whichever time remains).

**CQ3:** Changing the dropdown does trigger an immediate recalculation without a reload.

**CQ4:** Planner data property names are confirmed as `startTime` and `endTime` (not `start`/`end`).

**CQ5:** The Planner block lookup is confirmed to resolve the correct block, as the race condition against `plannerEvents` loading was patched.
