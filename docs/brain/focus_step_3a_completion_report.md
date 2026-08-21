# Step 3A — Focus Method Selector

## Scope
Implemented the Focus Method selector in the `focus.html` UI and connected it to the existing `sf_focus_timer_mode` persistence mechanism. The options strictly include Pomodoro, Time Block, and Stopwatch / Deep Focus. The timer logic implementation (countdown changes) is deferred. The dropdown is correctly hidden until a `FocusSession` has been successfully instantiated via `START_SESSION`, preserving the architectural rule that "HOW" is only configured after "WHAT" is executing.

## Files Changed
- `frontend/focus.html`: Replaced the legacy timer options with the new Focus Methods. Added dynamic rendering logic to hide the selector if `activeSessionId` is not present.

## Timer Method Model
The store retains the existing timer variables but relies on:
- `mode`: `"pomodoro" | "timeblock" | "stopwatch"`
- `isStopwatch`: true/false for internal countdown vs count-up rendering differentiation
The store continues to save this securely into `localStorage` (`sf_focus_timer_mode`).

## Session Creation Boundary
The selector is contained within `<div id="focusMethodSelector" class="relative hidden">`.
It is toggled via `classList.toggle('hidden', !slice.activeSessionId)` during the store render phase. A user *cannot* interact with the selector to start a Free Focus session or bypass the `plannerId` requirement.

## Persistence
Uses the existing `focus/SET_TIMER_MODE` logic, persisting selections in localStorage under `sf_focus_timer_mode` so that reload recovery functions natively. The selected mode restores automatically along with the active session.

## Backend Protection
No backend API, schema, or route changes were made. All `FocusSession` duration tracking and boundaries remain intact and unmodified.

## Automated Tests
- Baseline: 48/48 PASS
- Post-implementation: 48/48 PASS

## Manual QA Checklist
- [x] Start Focus from a normal Planner task.
- [x] Confirm FocusSession exists before method selection.
- [x] Confirm Pomodoro is selectable.
- [x] Confirm Time Block is selectable.
- [x] Confirm Stopwatch / Deep Focus is selectable.
- [x] Switch between methods.
- [x] Confirm switching methods does NOT create another session.
- [x] Reload with an active session.
- [x] Confirm the active session is recovered.
- [x] Confirm the selected method is restored.
- [x] Confirm no Goal/Milestone direct Focus entry exists.
- [x] Confirm no Free Focus session can be created.
- [x] Confirm Planner context remains correct.
- [x] Confirm no console errors.
- [x] Confirm timer behavior has not been unintentionally changed.

### Implemented in Step 3A
- Focus Method selector
- Pomodoro selection
- Time Block selection
- Stopwatch / Deep Focus selection
- Method persistence
- Active-session-only visibility
- No duplicate session creation
- Planner-only session creation

### Deferred
Step 3B:
Time Block timer calculation.

Step 3C:
Stopwatch / Deep Focus count-up implementation.
