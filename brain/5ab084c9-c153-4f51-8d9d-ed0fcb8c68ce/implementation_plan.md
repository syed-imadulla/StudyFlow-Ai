# Phase 5 Analytics Final Upgrade - Implementation Plan

## Goal Description
To make Analytics genuinely 100% data-driven and remove all remaining fabricated metrics (e.g. static trend percentages, hardcoded Peak Velocity). We will update the `AnalyticsService` backend to calculate exact values across the requested date ranges (`period`) and compare them truthfully against the previous equivalent date ranges to generate valid percentage trends.

## Proposed Changes

---

### Backend Service (Analytics)
#### [MODIFY] `analytics.service.js`

1. **Date Range Helper (`getDateRange`)**
   - Implements period resolution (`last7`, `last30`, `last90`, `all`) to return `start` and `prevStart` timestamps.

2. **`getSummary(userId, period)` Updates**
   - Accepts `period` to filter sessions for the *current period* and *previous period*.
   - **Total Focus Time**: Calculated purely from `currentSessions.duration` (seconds).
   - **Longest Focus Session**: `Math.max` over `currentSessions.duration`.
   - **Average Daily Focus**: Total duration divided by number of days in the period.
   - **Method Breakdown**: Counts sessions by `FocusSession.type` (`POMODORO`, `SHORT_BREAK`, etc.).

3. **`getKPIs(userId, period)` Updates**
   - Calculates **true percentage trends** comparing current period vs previous period (e.g. Focus Time `change`).
   - Handles `taskCompletion.change` by explicitly setting it to `Unavailable` since historical snapshotting for tasks is not currently supported in the data model.
   - Calculates **Peak Velocity** deterministically: buckets all `currentSessions` by hour of the day (e.g., 3-hour windows). Finds the window with maximum focus duration (e.g., "9 AM - 12 PM") or returns `--` / "Not enough data" if there are zero sessions.
   - Computes **Distraction Score trend**: true percentage change between `avgInterruptions` and `prevAvgInterruptions`.
   - Populates "Insights at a Glance" fields (Longest Session, Tasks Finished, Average Daily Focus, Pomodoro Sessions) dynamically using the new `getSummary` values.

4. **`getFocusChart`, `getVelocityChart`, `getWeeklyComparison`, `getGoalAllocation` Updates**
   - Ensure all queries respect the `period` argument.
   - Modify **Weekly Comparison** target data: Return `[0,0,0,0,0,0,0]` instead of an arbitrary calculation `Math.max(2.0, Math.round(val + 1))` since a user-configured target is not stored in the DB. This truthfully represents the lack of an arbitrary target.

---

### Open Questions / Limitations

> [!WARNING]
> **Task History Limitation**
> The current data model does not track *when* tasks were completed. We only know their current state. Therefore, calculating a true period-over-period percentage change for Task Completion (e.g., "vs last 7 days") is impossible. I will change the Task Completion UI trend to "Unavailable" rather than fabricating a percentage.

> [!WARNING]
> **Weekly Comparison Target Goal**
> The Target Goal dataset was previously faked by adding +1 to actual hours. Since there's no DB field storing a target goal, I will return `0` for the target dataset to avoid faking data.

> [!WARNING]
> **Focus Methods**
> The prompt mentions mapping methods like `DEEP_FOCUS` and `FLOW_SESSION`. However, the current backend `FOCUS_SESSION_TYPE` only supports `POMODORO`, `SHORT_BREAK`, and `LONG_BREAK`. I will aggregate whatever types actually exist in the DB, without inventing unsupported enums.

## Verification Plan

### Automated Tests
- Run `npm run test:integration` before and after to guarantee 48/48 tests remain unaffected.

### Manual Verification
- A completed FocusSession will be created (or verified via existing data).
- The Analytics UI will be inspected for valid trend percentages.
- Empty states will be tested by selecting an empty date range, ensuring no NaN or crashes occur.
