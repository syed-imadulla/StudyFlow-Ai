# Module Integrations

This document is the authoritative reference for all cross-module communication within StudyFlow AI.

---

## Module Data Flow

```
Goal (creation / update / completion)
      │
      ▼
Backend Intelligence Layer
(GoalLifecycleService, DeadlineIntelligenceService,
 GoalProgressService, GoalRecommendationService)
      │
      ▼
Complete Goal DTO (via REST API)
      │
      ▼
window.SF_STORE (global state orchestrator)
      │
      ├─────────────────────────────────────┐
      ▼                                     ▼
WorkspaceRenderer                   DashboardRenderer
(workspace.html)                    (dashboard.html)
      │                                     │
      ▼                                     ▼
workspaceMapper.toCardModel()       Backend intelligence rendered
→ SF_COMPONENTS.renderGoalCard()    → Hero Card (recommended goal)
                                    → KPI badges
                                    → Today's Subtask List

      │
      ▼ (on goal completion)
CompletionEvents.emitGoalCompleted()
      │
      ▼
CompletionModal
→ LOAD_RECOMMENDED → recommended slice updated
→ planner/LOAD → planner slice updated
→ CompletionRenderer.getModalHtml()
→ Modal shown to user
```

---

## Integration Principles

1. **Each module owns its own data.**
2. **Modules communicate only through IDs** (goalId, milestoneId, plannerBlockId).
3. **No duplicated business logic.**
4. **No title or text matching** between modules.
5. **No circular dependencies.**
6. **Planner is the scheduling source of truth.** Planner owns scheduling.
7. **Goals are the progress source of truth.** Goal owns milestone lifecycle.
8. **Focus is the execution source of truth.** *(future)*
9. **Analytics is read-only.** *(future)*
10. **AI is advisory only.** *(future)*
11. **Cross-domain operations happen only through application-level orchestration** (GoalSyncService).
12. **Domains never directly mutate another domain's entities.**
13. **UI coordinates user interaction only.**
14. **Business workflows belong outside presentation components.**

---

## Cross-Module Contracts

### Goals → Store

When a goal is created/updated/toggled:
1. `goalsService.js` makes the API call
2. Store action (`goals/UPDATE` or `goals/TOGGLE_SUBTASK`) receives the updated DTO
3. Store patches `goals.items` slice
4. Store optionally emits `CompletionEvents` if a completion transition is detected
5. All subscribed renderers (Workspace, Dashboard) re-render

### Goals → Recommendation

The Recommendation is a derived view of the Goals collection:
- `GoalRecommendationService` reads all active goals
- Runs single-pass scan for highest `deadlineInfo.sortPriority`
- Returns one goal via `GET /api/v1/goals/recommended`
- Dashboard, Completion Modal, and Planner all consume this endpoint via `goals/LOAD_RECOMMENDED`

### Goals → Planner (Milestone Scheduling)

A Milestone is scheduled, generating a Planner Block:
- **Required IDs**: `goalId` and `milestoneId` are mandatory links embedded in the Planner Block
- **Ownership**: Planner owns the scheduling data; Goals own the milestone data
- **Cross-domain sync**: `GoalSyncService` is the sole boundary for mutating Goal state from Planner events
- **Rollback**: Atomic — if GoalSyncService fails, PlannerService calls the rollback method and propagates the error

### Goals → Completion Module

When all subtasks are checked:
1. Backend auto-marks goal as `completed`, sets `completedAt`
2. Store detects transition: `!oldGoal.completed && updatedGoal.completed`
3. `CompletionEvents.emitGoalCompleted(updatedGoal)` is called
4. `CompletionModal` listens via `CompletionEvents.onGoalCompleted()`
5. Modal shows completion summary + fetches new recommendation

### Planner → Focus *(Future)*

Planner creates Focus Sessions based on scheduled blocks.
- Focus never creates Planner Blocks
- Planner remains the absolute scheduling source

### Focus → Goals *(Future)*

Completing a Focus Session updates milestone progress via linked IDs.
- Goal progress is dynamically calculated from completed milestones
- Focus never edits Goal metadata directly

### Goals → Analytics *(Future)*

Analytics reads Goals, Milestones, Completions, Planner history, and Focus history.
- Analytics never modifies Goals (read-only boundary)

### Analytics → AI *(Future)*

AI consumes Analytics reports.
- AI never directly modifies Planner or Goals
- AI only produces recommendations for the user to accept or reject

---

## Phase Mapping

| Phase | Integration | Status |
|-------|-------------|--------|
| Phase 1 | Planner only | ✅ Complete |
| Phase 2.3.0.1–2.3.0.5 | Goals ↔ Workspace | ✅ Complete |
| Phase 2.3.0.6 | Goals → Dashboard (Intelligence) | ✅ Complete |
| Phase 2.3.0.7 | Goals → Planner (Awareness) | ✅ Complete |
| Phase 2.3.0.8 | Goals → Completion Experience | ✅ Complete |
| Phase 2.3.0.9 | Goal Archive | ▶ Next |
| Phase 3 | Planner → Focus | 🔒 Locked |
| Phase 4 | Focus → Goal Progress | 🔒 Locked |
| Phase 5 | Analytics | 🔒 Locked |
| Phase 6 | AI Coach | 🔒 Locked |
