# Goals Specification

## Goal Schema

A Goal is a high-level objective with a title, optional deadline, milestones, and subtasks.

### Key Fields (stored in MongoDB)
```json
{
  "id": "string",
  "title": "string",
  "description": "string (optional)",
  "deadline": "ISO date string (optional)",
  "completed": "boolean",
  "completedAt": "ISO date string (null if not completed)",
  "createdAt": "ISO date string",
  "milestones": [...],
  "subtasks": [...]
}
```

### Derived Fields (computed by backend, never stored)
```json
{
  "lifecycle": {
    "status": "ACTIVE | DUE_SOON | OVERDUE | COMPLETED | COMPLETED_LATE | DRAFT",
    "label": "string",
    "color": "hex color"
  },
  "deadlineInfo": {
    "type": "TODAY | TOMORROW | UPCOMING | OVERDUE | NONE",
    "sortPriority": "number (higher = more urgent)",
    "urgencyLevel": "critical | high | medium | low | none",
    "badge": "string",
    "color": "hex color",
    "shortLabel": "string"
  },
  "progress": {
    "completionPercentage": "number 0-100",
    "goalHealth": { "score": "number", "label": "string" },
    "completedMilestones": "number",
    "totalMilestones": "number",
    "remainingMilestones": "number"
  }
}
```

---

## Milestone Schema

A Milestone is a concrete checkpoint within a Goal.

```json
{
  "id": "string",
  "title": "string",
  "deadline": "ISO date string (optional)",
  "completed": "boolean",
  "completedAt": "ISO date string (null if not completed)",
  "plannerBlockId": "string (set when scheduled)"
}
```

Milestones are directly linked to the Planner via `plannerBlockId`. Scheduling a Milestone instantiates a Planner Block.

---

## Subtask Schema

A Subtask is a lightweight checklist item within a Goal (not a Milestone).

```json
{
  "id": "string",
  "title": "string",
  "completed": "boolean",
  "deadlineInfo": { "type": "TODAY | TOMORROW | UPCOMING | OVERDUE | NONE", ... }
}
```

When all subtasks are completed, the backend automatically marks the parent Goal as `completed` and sets `completedAt`.

---

## Completion Flow

```
User toggles last subtask (PATCH /api/goals/:goalId/subtasks/:subtaskId/toggle)
      ↓
GoalService detects all subtasks are completed
      ↓
Goal status → COMPLETED, completedAt → now
      ↓
Updated Goal DTO returned to frontend
      ↓
Store detects !oldGoal.completed && updatedGoal.completed
      ↓
CompletionEvents.emitGoalCompleted()
      ↓
CompletionModal shows summary + next recommendation
```

Marking a Planner Block as complete also propagates status updates back through the Milestone and, if all milestones complete, to the parent Goal (via GoalSyncService).

---

## Lifecycle States

| Status | Meaning |
|--------|---------|
| `DRAFT` | Created but no deadline or milestones |
| `ACTIVE` | Has a future deadline; work in progress |
| `DUE_SOON` | Deadline within configured threshold |
| `OVERDUE` | Past deadline, not completed |
| `COMPLETED` | Completed on or before deadline |
| `COMPLETED_LATE` | Completed after deadline |

All lifecycle states are computed by `GoalLifecycleService` and `lifecycle.engine.js` on the backend. **Frontend never calculates lifecycle.**
