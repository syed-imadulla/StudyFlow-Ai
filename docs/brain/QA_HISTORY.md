# QA Validation History

This document summarizes major QA validations completed through Phase 2.3.0.8.

---

## Phase 2.3.0.6 — Dashboard Intelligence QA

### Regression Fixed: Today's Actionable Subtasks
- **Root cause**: Frontend enum mismatch — Dashboard checked for `"DUE_TODAY"` but backend returned `"TODAY"`.
- **Fix**: Updated Dashboard filter to use the backend's actual `deadlineInfo.type` values (`TODAY`, `TOMORROW`, `UPCOMING`, `OVERDUE`).
- **Verified**: Subtasks with `deadlineInfo.type === "TODAY"` now correctly appear in the "Today's Actionable Subtasks" widget.

### Regression Fixed: Hero Card Goal Order
- **Root cause**: `GET /api/goals` returns goals ordered by `-createdAt`. The Hero Card was displaying the most recently created goal, not the most urgent.
- **Fix**: Introduced `GoalRecommendationService` with a dedicated `GET /api/v1/goals/recommended` endpoint using single-pass priority selection.
- **Verified**: Hero Card displays the goal with the highest `deadlineInfo.sortPriority`, not the most recently created goal.

### AI Study Coach vs. Dashboard Consistency
- **Verified**: Both widgets read from the same store slice. They can no longer display contradictory counts.

---

## Phase 2.3.0.7 — Planner Awareness QA

- **Verified**: Planner views reflect updated goal intelligence without requiring a page reload.
- **Verified**: Planner core architecture unchanged — drag-and-drop, view switching, block editing all functional.
- **Verified**: `getPlannerBlockDate()` canonical helper unchanged and still used for all date resolution.
- **Verified**: No regressions in Daily, Weekly, or Monthly views.

---

## Phase 2.3.0.8 — Goal Completion Experience QA

### Goal Completion
- ✅ Completed a goal by toggling its last subtask — completion modal appeared correctly.
- ✅ Completed a goal with milestones — milestone count (completedMilestones / totalMilestones) displayed accurately from backend DTO.
- ✅ Completed a goal with no deadline — `completedAt` rendered gracefully as "Recently" fallback.
- ✅ Completed a goal with missing optional metadata — no runtime errors; modal still rendered.

### Synchronization
- ✅ Dashboard Hero Card updated to next recommended goal after completion without page reload.
- ✅ Workspace goal list updated (completed goal removed from active filter) without page reload.
- ✅ Planner refreshed silently in background.
- ✅ Recommendation refreshed via `goals/LOAD_RECOMMENDED` immediately after completion.

### Recommendation
- ✅ Next recommended goal shown in modal when available.
- ✅ "All Caught Up" graceful state displayed when no active goals remain.
- ✅ Application continued working correctly when recommendation endpoint was temporarily unavailable (fallback: modal shown without recommendation section).

### Idempotency
- ✅ Triggered duplicate `emitGoalCompleted` calls for the same goal — second call was silently suppressed by `lastCompletedGoalId` guard.
- ✅ Completing Goal A → Goal B → Goal C in quick succession: modal appeared three times, recommendation updated correctly each time, no race conditions observed.

### Regression
- ✅ Dashboard — functioning correctly, no regressions.
- ✅ Planner — functioning correctly, no regressions.
- ✅ Workspace — functioning correctly, no regressions.
- ✅ Goal Recommendation Service — functioning correctly.
- ✅ Deadline Intelligence — functioning correctly.
- ✅ Goal Lifecycle — functioning correctly.
- ✅ Milestone Lifecycle — functioning correctly.

### Script Scoping
- ✅ Completion module scripts confirmed absent from `settings.html`, `analytics.html`, `focus.html`, `404.html`.
- ✅ Completion module scripts confirmed present in `workspace.html`, `dashboard.html`, `planner.html`, `idealab.html`.

---

## Known Constraints to Preserve

Future implementations must not break:

| Feature | Owner | Risk if broken |
|---------|-------|---------------|
| Dashboard Intelligence | `dashboardRenderer.js` | KPIs, Hero Card, Task List stop working |
| Planner Awareness | `planner.html` + store | Planner shows stale data |
| Goal Completion Experience | `completion/` | Completion events not triggered |
| Recommendation Engine | `goalRecommendation.service.js` | Hero Card shows wrong goal |
| Deadline Intelligence | `deadlineIntelligence.service.js` | Sorting, badges, urgency broken |
| Workspace Integration | `workspace/` | Goal cards show incorrect state |
| Goal Lifecycle | `goalLifecycle.service.js` | Status labels wrong everywhere |
| Milestone Lifecycle | `milestoneLifecycle.service.js` | Milestone status wrong in Planner |
