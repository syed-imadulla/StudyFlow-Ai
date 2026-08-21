# Phase 5 Analytics Functionality Audit & Repair Plan

## 1. Exact Root Cause(s)
The backend was successfully updated in Phase 5 to serve real analytics data from the `FocusSession` collection. The frontend `analyticsService.js` correctly fetches this data and stores it in the `analytics` slice of the store. 

However, the **frontend DOM is completely disconnected from the store data**:
- **Hardcoded HTML:** All KPI values (e.g., "28.4h", "92%", "10 AM - 1 PM", "Low") and "Insights at a Glance" are hardcoded directly in `frontend/analytics.html` without any DOM IDs. 
- **Missing Rendering Logic:** The inline script in `analytics.html` creates `Chart` instances but contains absolutely no logic to bind `slice.kpis` data to the HTML elements.
- **Broken Dropdown:** The period selector dropdown (e.g., "Last 7 Days") calls a UI formatting function but omits the callback parameter required to dispatch the `analytics/SET_PERIOD` action to the store, so changing the period does not fetch new data.

## 2. Before/After Data Flow
- **Before (Current):** MongoDB -> AnalyticsService -> API -> Frontend Store -> Charts (partially working, depending on period). KPI values -> Hardcoded HTML -> Rendered in Browser (Static).
- **After (Proposed):** MongoDB -> AnalyticsService -> API -> Frontend Store -> `renderAnalyticsCharts()` (Expanded to update DOM IDs) -> True values rendered in Browser.

## 3. Real Sources of Metrics
- **Total Focus Time:** Actual sum of `FocusSession.duration` (in seconds) / 3600.
- **Task Completion:** Actual `Goal` subtasks and `Task` statuses (rate calculated in backend). Trend percentage (+5%) is mocked and should be removed or marked out of scope.
- **Distraction Score:** Actual `FocusSession.interruptions` per session mapped to thresholds (Low, Medium, High).
- **Peak Velocity:** Currently a known limitation (Mocked on backend). Will be displayed as-is but marked correctly.
- **Weekly Focus Chart:** Actual FocusSession duration binned by day.
- **Velocity Chart:** Actual FocusSession duration binned by week.
- **Goal Allocation Chart:** Actual FocusSession duration grouped by `goalId`.

## 4. Empty-State & Edge-Case Handling
- When 0 completed sessions exist, the API accurately returns 0 focus hours and 0 average interruptions. The UI must be wired to reflect `0h` and `Low` rather than crashing or displaying default mock data.

## 5. Proposed Minimal Safe Fixes (Implementation Plan)

### A. Modify `frontend/analytics.html`
- Assign unique DOM IDs to all KPI card value elements (e.g., `#kpi-focus-val`, `#kpi-focus-sub`, `#kpi-task-val`).
- Assign IDs to "Insights at a Glance" spans so they can be populated or explicitly hidden if data is unavailable.
- Fix the `selectCustomDropdownItem` onclick handlers to include the callback `() => window.SF_STORE.dispatch('analytics/SET_PERIOD', { period: '...' })`.

### B. Update the Renderer Script (in `analytics.html`)
Expand `renderAnalyticsCharts(slice)` to:
```javascript
if (slice.kpis) {
  document.getElementById('kpi-focus-val').textContent = slice.kpis.focusTime?.value || '0h';
  document.getElementById('kpi-focus-sub').textContent = slice.kpis.focusTime?.subtitle || '0 Pomodoro blocks';
  document.getElementById('kpi-task-val').textContent = slice.kpis.taskCompletion?.value || '0%';
  document.getElementById('kpi-task-sub').textContent = slice.kpis.taskCompletion?.subtitle || '0 / 0 tasks finished';
  document.getElementById('kpi-peak-val').textContent = slice.kpis.peakVelocity?.value || '--';
  document.getElementById('kpi-dist-val').textContent = slice.kpis.distractionScore?.value || 'Low';
  document.getElementById('kpi-dist-sub').textContent = slice.kpis.distractionScore?.subtitle || '0 avg interruptions/session';
}
```

### C. Backend Safety
- The backend architecture requires ZERO changes. Integration tests are already passing 48/48. The issue is entirely confined to the frontend presentation layer.

## User Feedback Required
Please review this audit and plan. If approved, I will implement these exact DOM mappings in `analytics.html` so the UI honestly reflects the authoritative backend data, fully resolving the Phase 5 Analytics functionality!
