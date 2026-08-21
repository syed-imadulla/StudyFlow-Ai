# STEP 3C ARCHITECTURE INVESTIGATION: STOPWATCH / DEEP FOCUS

### 1. VERIFIED CURRENT ARCHITECTURE
* `FocusSession.startTime` (backend) stores the authoritative UTC timestamp when the session begins.
* `FocusSession.duration` (backend) is the final execution duration in seconds, authoritatively computed and stored during `COMPLETE_SESSION`.
* `activeDuration` (frontend) represents the elapsed active wall-clock time in seconds, precisely computed by subtracting `totalPausedTime` from `now - startTime`.
* This frontend elapsed time logic is identical to a count-up stopwatch.

### 2. CURRENT STOPWATCH BEHAVIOR
* **Dropdown Selection**: The UI currently has a static option `🎯 Stopwatch / Deep Focus` which successfully dispatches `focus/SET_TIMER_MODE` with `{ mode: 'stopwatch', isStopwatch: true }`.
* **State Updates**: `store.js` writes this payload to `localStorage` properly keyed to the `sessionId` and patches the `focus` slice with `isStopwatch: true`.
* **Current Display Logic**: `updateTimerDisplay()` in `focus.html` successfully checks `if (isStopwatch)` and sets `displaySeconds = activeDuration || 0;`. This correctly switches the display from a countdown to a count-up timer.
* **Missing Features**: The display format is hardcoded to `MM:SS`. It lacks `HH:MM:SS` formatting required for long-running deep focus sessions. The badge label directly beneath the timer display is hardcoded to "Pomodoro Timer".

### 3. EXACT ELAPSED-TIME SOURCE
Stopwatch **must not** invent a new timer variable.
It relies directly on the existing `focus.activeDuration` value, which is:
- Securely derived from the server-authoritative `(now - startTime) - totalPausedTime` during `focus/LOAD`.
- Synchronously incremented by `+1` every second via `TIMER_TICK`.
By mapping `displaySeconds = activeDuration`, Stopwatch accurately represents true execution time.

### 4. PAUSE / RESUME
* Pause/Resume logic is entirely agnostic to `timerMode`.
* When paused, `isRunning = false` prevents `TIMER_TICK` from incrementing `activeDuration`.
* On the backend, `lastPausedAt` and `totalPausedTime` accurately track the pause window. 
* Upon resume, the frontend resumes ticking `activeDuration` without requiring a page reload.

### 5. RELOAD / SESSION RECOVERY
* On reload, `focus/LOAD` accurately recalculates `activeDuration = (now - startTime) - totalPausedTime` using authoritative backend data.
* `focus/LOAD` reads `timerPref` from `localStorage`. If `timerPref.isStopwatch === true` and the `sessionId` matches the current session, the timer restores itself seamlessly as a count-up Stopwatch starting precisely from the correct elapsed second.

### 6. COMPLETION
* `COMPLETE_SESSION` (`window.focusService.completeSession`) only transmits `notes` and `interruptions` to the backend.
* The backend independently computes `activeDurationSeconds = Math.max(0, totalElapsedSeconds - session.totalPausedTime)` and saves it to `session.duration`.
* Because `isStopwatch` explicitly displays `activeDuration`, the frontend UI exactly matches the backend's final computed duration. No secondary duration is sent or trusted.

### 7. LOCAL STORAGE
* `sf_focus_timer_mode` natively saves the `isStopwatch` boolean alongside the `mode` via `SET_TIMER_MODE`.
* No new keys, properties, or schemas are required to persist the Stopwatch preference for a session.

### 8. BACKEND IMPACT
**NONE.** The backend already computes, stores, and tracks elapsed active time securely. No database changes, route changes, or service changes are required.

### 9. IMPLEMENTATION SCOPE
Only minor, isolated frontend presentation changes are required:
1. Update `focus.html`'s `updateTimerDisplay()` to format `displaySeconds` as `HH:MM:SS` when `isStopwatch` is true (or when `displaySeconds >= 3600`).
2. Add an `id` (e.g., `timerModeBadge`) to the hardcoded `<span class="...">Pomodoro Timer</span>` badge directly beneath the countdown circle.
3. Update `updateTimerDisplay()` to dynamically set the badge's text content to match `slice.timerModeText` so it reads "Stopwatch / Deep Focus" (or "Time Block") instead of statically remaining "Pomodoro Timer".

### 10. OUT OF SCOPE
* Exam Mode
* Task Sprint
* Deep Focus redesign
* Break architecture
* AI recommendations
* Database changes
* Backend changes
* Planner redesign

### 11. REGRESSION PROTECTION
The following behaviors are guaranteed to remain untouched:
* **Pomodoro / Time Block**: Calculation logic (`timerRemaining`) is structurally bypassed when `isStopwatch` is true, ensuring original countdown logic is preserved.
* **Planner Entry Boundary**: Unchanged.
* **Pause/Resume/Complete**: The timer payload and backend API signatures remain untouched.
* **Session Recovery**: `focus/LOAD` calculations are completely independent of timer mode visual presentation.

### 12. VERIFICATION PLAN
* **Automated**: `npm run test:integration` must pass (48/48).
* **Manual - Formatting**: Select "Stopwatch", manually patch `window.SF_STORE.state.focus.activeDuration = 3605` in console, verify timer displays `01:00:05`.
* **Manual - Persistence**: Open a Time Block session, switch to Stopwatch, reload the page. Ensure the timer remains a count-up Stopwatch and doesn't revert.
* **Manual - Accuracy**: Run the stopwatch for 10 seconds, pause for 5 seconds, resume for 5 seconds, End & Save. Verify the final `duration` in the session log accurately reflects 15 seconds of execution.
