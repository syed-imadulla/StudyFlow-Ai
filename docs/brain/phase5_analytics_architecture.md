# Phase 5 Analytics Architecture & Audit

## 1. Analytics Endpoints & Controllers
| Endpoint | Controller Method | Service Method | Frontend Consumer |
| :--- | :--- | :--- | :--- |
| `GET /analytics/summary` | `AnalyticsController.getSummary` | `AnalyticsService.getSummary` | Unused by UI directly, but aggregates base data. |
| `GET /analytics/kpis` | `AnalyticsController.getKPIs` | `AnalyticsService.getKPIs` | `analytics.html` KPI Row (Focus Time, Tasks Completed, Peak Velocity, Distraction Score) |
| `GET /analytics/focus` | `AnalyticsController.getFocusChart` | `AnalyticsService.getFocusChart` | `analytics.html` Main Focus Hours Chart |
| `GET /analytics/velocity` | `AnalyticsController.getVelocityChart`| `AnalyticsService.getVelocityChart` | `analytics.html` Task Velocity Chart |
| `GET /analytics/weekly-comparison` | `AnalyticsController.getWeeklyComparison` | `AnalyticsService.getWeeklyComparison` | `analytics.html` Weekly Comparison Chart |
| `GET /analytics/goal-allocation` | `AnalyticsController.getGoalAllocation` | `AnalyticsService.getGoalAllocation` | `analytics.html` Goal Allocation Donut Chart |

## 2. Database Queries
- `AnalyticsService.getSummary` queries:
  - `Goal.find({ user: userId })`
  - `Task.find({ user: userId })`
  - `FocusSession.find({ user: userId, status: 'COMPLETED' })`
- `AnalyticsService.getFocusChart` queries:
  - `FocusSession.find({ user: userId, status: 'COMPLETED', startTime: { $gte: sevenDaysAgo } })`
- `AnalyticsService.getVelocityChart` queries:
  - None. Uses hardcoded static arrays.
- `AnalyticsService.getWeeklyComparison` queries:
  - None directly. It wraps `getFocusChart` and derives a "Target Goal" by adding 1 to the actual data.
- `AnalyticsService.getGoalAllocation` queries:
  - `Goal.find({ user: userId }).limit(4)`

## 3. FocusSession Fields Consumed
- `duration`: Consumed by `getSummary` and `getFocusChart`.
- `startTime`: Consumed by `getSummary` (for streak calculations) and `getFocusChart` (for bucketing by day of week).
- `status`: Used in queries to filter only `COMPLETED` sessions.

**Ignored Fields:** `totalPausedTime`, `plannerId`, `goalId`, `milestoneId`, `interruptions`, `pauseCount`, `notes`, `type`.

## 4. Calculations & Unit Conversions
**Current Bug:** `FocusSession.duration` is stored in **SECONDS**.
- In `getSummary`:
  ```javascript
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
  const focusHours = parseFloat((totalMinutes / 60).toFixed(1)) || 0;
  ```
  - **Error:** It treats `duration` as seconds, labels it `totalMinutes`, divides by `60`, and calls it `focusHours`. This calculates total **minutes** but surfaces them as **hours**.
- In `getFocusChart`:
  ```javascript
  data[mappedIdx] += parseFloat(((s.duration || 0) / 60).toFixed(1));
  ```
  - **Error:** Again, it divides seconds by 60, pushing **minutes** to a chart expected to display **hours**.

## 5. Mocked/Static Values
- **Distraction Score (`getKPIs`)**:
  Hardcoded to return `{ value: 'Low', change: '↓ 10% interruptions', subtitle: 'Focus discipline' }`. It completely ignores `FocusSession.interruptions`.
- **Peak Velocity (`getKPIs`)**:
  Hardcoded to return `{ value: '10 AM – 1 PM' }`.
- **Velocity Chart (`getVelocityChart`)**:
  Hardcoded to return static datasets: `[15, 20, 22, 25]` (Planned) and `[12, 18, 20, 24]` (Completed).
- **Goal Allocation (`getGoalAllocation`)**:
  Instead of measuring actual focus time spent on a goal (`FocusSession.duration` grouped by `goalId`), it artificially weights goals by the number of their subtasks: `g.subtasks?.length * 15 || 25`.

## 6. UI Consumption Mapping
- **KPI: Focus Time**: Uses `focusTime.value` (from `getKPIs` -> `getSummary.focusHours` which is actually minutes).
- **KPI: Distraction Score**: Uses `distractionScore.value` (mocked).
- **KPI: Task Completion**: Uses `taskCompletion.value` (from actual task resolution).
- **KPI: Peak Velocity**: Uses `peakVelocity.value` (mocked).
- **Chart: Focus Chart**: Uses `datasets[0].data` (from `getFocusChart` which is actually minutes).
- **Chart: Goal Allocation**: Uses `datasets[0].data` (from `getGoalAllocation` which uses fake subtask math).
- **Chart: Velocity**: Uses `datasets` (from `getVelocityChart` which is mocked).
