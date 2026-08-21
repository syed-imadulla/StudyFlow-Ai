# Focus Method & Duration Architecture

## 1. Method Matrix
| Method | Type | Purpose | Timer Display | Default Duration |
|--------|------|---------|---------------|------------------|
| 🍅 Pomodoro | Fixed Countdown | Classic work interval | MM:SS / HH:MM:SS | 25 min |
| 🎯 Deep Focus | Fixed Countdown | Long uninterrupted focus | MM:SS / HH:MM:SS | 50 min |
| ⚡ Task Sprint | Fixed Countdown | Short intentional execution | MM:SS / HH:MM:SS | 25 min |
| 🗓️ Time Block | Schedule-Bound | Execute Planner schedule | MM:SS / HH:MM:SS | N/A (End Time - Now) |
| 🌊 Flow Session | Open-Ended | Unbounded focus | Stopwatch (MM:SS -> HH:MM:SS) | N/A |

## 2. Duration Presets
- **Pomodoro**: 15, 25, 45
- **Deep Focus**: 50, 75, 90
- **Task Sprint**: 15, 25, 45, 60
- **Time Block**: *Derived from Planner*
- **Flow Session**: *No duration limit*

## 3. Timer Formulas
- **Fixed Duration**: `timerRemaining = Math.max(0, timerTotal - elapsedIntervalTime)` (Where `elapsedIntervalTime` is the time elapsed since this interval started, or we can just derive it cleanly from `activeDuration` if we don't support multiple intervals per session yet. To keep it safe: `timerRemaining = Math.max(0, timerTotal - activeDuration)` as it currently works for a single interval).
- **Time Block**: `timerRemaining = Math.max(0, Planner.endTime - Date.now())`
- **Flow Session**: `timerRemaining = 0` (Visual display uses `activeDuration`).

## 4. State Machine Updates
- `READY`, `RUNNING`, `PAUSED`, `COMPLETING`, `COMPLETED`, `ABORTED` remain.
- **NEW STATE**: `INTERVAL_COMPLETE`
  - Triggered when a fixed-duration or Time Block countdown reaches `00:00`.
  - The local `TIMER_TICK` will `stopLocalTimerTick()` but will **NOT** automatically `COMPLETE_SESSION` (removing the existing forced completion and alert).
  - The `FocusSession` remains active on the backend.
  - The UI updates to show the interval is complete and prompts the user to "End & Save Session".

## 5. Ring Behavior
- **Fixed Duration**: `progress = timerRemaining / timerTotal`
- **Time Block**: `progress = Math.max(0, Math.min(1, timerRemaining / (Planner.endTime - Planner.startTime)))`
- **Flow Session**: No ring progress. The ring will display an indeterminate/static subtle pulse with no percentage fill.

## 6. Persistence Rules
- `timerMode` and selected `duration` will be scoped per-session in `localStorage` using `sf_focus_timer_mode_${sessionId}`. 
- Global defaults can be saved separately, but the active session always loads its exact scoped configuration first.

## 7. Reload Behavior
- **Time Block**: `timerRemaining` is recalculated as `Planner.endTime - Date.now()`. It NEVER restores a stale value.
- **Flow Session**: Relies on backend `activeDuration` (derived from `now - startTime - totalPausedTime`).
- **Fixed Duration**: Restores `timerTotal` from session config and `activeDuration` from backend.

## 8. Method Switching Behavior
- Switching methods mutates `sf_focus_timer_mode_${sessionId}` and immediately updates the UI.
- It does **NOT** touch the backend `FocusSession`.
- If switched while running, `activeDuration` is preserved seamlessly. The new method simply changes the visual timer calculation and ring display.

## 9. Edge Cases Addressed
- **Reaching Zero**: Safely stops the timer but leaves the session active (no automatic completion).
- **Time Block Late Start / Expiry**: Handled by clamping to 0 and showing "Expired Schedule" state.
- **Switching Methods while Running**: Modifies `timerTotal` and display logic instantly without resetting `activeDuration`.

## 10. Backend Boundaries
- **UNCHANGED**. The backend will not be modified in any way.

## 11. UI Changes
- Add a secondary dropdown for **Duration ▾** when a fixed method is selected.
- Hide the Duration dropdown for Time Block and Flow Session, showing specific informational text instead.
- Update the main Action Button states to remove automatic completions and explicitly show "End & Save Session" prominently when the interval completes.

## 12. Test Plan
- Run `npm run test:integration` (Target: 48/48 PASS).
- Manually execute all 5 methods.
- Manually verify the new Duration sub-selector.
- Manually verify switching methods while the timer is running.
- Verify `INTERVAL_COMPLETE` does not kill the session.
