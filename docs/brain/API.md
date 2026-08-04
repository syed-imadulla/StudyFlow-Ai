# API Reference

## Authentication

All goal and planner endpoints require a valid JWT token via the `authenticate` middleware.

---

## Goal API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/goals` | Returns all goals with full intelligence DTOs |
| `POST` | `/api/goals` | Creates a new goal |
| `GET` | `/api/goals/recommended` | Returns the single most urgent active goal |
| `GET` | `/api/goals/:id` | Returns a single goal DTO |
| `PUT` | `/api/goals/:id` | Updates a goal (triggers completion detection) |
| `DELETE` | `/api/goals/:id` | Deletes a goal |
| `PATCH` | `/api/goals/:goalId/subtasks/:subtaskId/toggle` | Toggles a subtask; auto-completes goal if all subtasks done |

### Goal DTO Shape (full intelligence)
```json
{
  "id": "string",
  "title": "string",
  "deadline": "ISO date (optional)",
  "completed": false,
  "completedAt": null,
  "createdAt": "ISO date",
  "lifecycle": { "status": "ACTIVE", "label": "Active", "color": "#22C55E" },
  "deadlineInfo": {
    "type": "UPCOMING",
    "sortPriority": 3,
    "urgencyLevel": "medium",
    "badge": "Upcoming",
    "color": "#A855F7",
    "shortLabel": "Sep 1"
  },
  "progress": {
    "completionPercentage": 40,
    "goalHealth": { "score": 72, "label": "Good" },
    "completedMilestones": 2,
    "totalMilestones": 5,
    "remainingMilestones": 3
  },
  "milestones": [...],
  "subtasks": [...]
}
```

### Recommendation Endpoint
`GET /api/v1/goals/recommended`

Returns a single goal object (the highest-priority active goal) using a single-pass O(n) scan over `deadlineInfo.sortPriority`. Returns `null` when no active goals exist.

---

## Planner API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/planner` | Returns planner blocks (date-filtered) |
| `POST` | `/api/planner` | Creates a new planner block |
| `PUT` | `/api/planner/:id` | Updates a planner block |
| `DELETE` | `/api/planner/:id` | Deletes a planner block |

---

## Auth API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `POST` | `/api/auth/refresh` | Refresh access token |

---

## Store Action Reference

Key frontend store actions and their effects:

| Action | Payload | Effect |
|--------|---------|--------|
| `goals/LOAD` | none | Fetches all goals; patches `goals.items` |
| `goals/CREATE` | `{ goal }` | Creates goal via API; appends to store |
| `goals/UPDATE` | `{ goalId, patch }` | Updates goal; detects completion; patches store |
| `goals/DELETE` | `{ goalId }` | Deletes goal; removes from store |
| `goals/TOGGLE_SUBTASK` | `{ goalId, subtaskId, completed }` | Toggles subtask; detects completion; patches store |
| `goals/LOAD_RECOMMENDED` | none | Fetches recommendation; patches `recommended` slice |
| `planner/LOAD` | `{ date? }` | Loads planner data for date; patches `planner` slice |
| `planner/SELECT_DATE` | `{ date }` | Sets selected date in planner slice |
