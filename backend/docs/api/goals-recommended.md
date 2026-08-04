# GET /api/v1/goals/recommended

## Purpose

Returns the single most-recommended active goal for the authenticated user.
Not Dashboard-specific — this is a shared backend capability powering:
- Dashboard Hero Card
- Planner Focus Goal panel
- AI Study Coach
- Push notifications / daily briefings
- Mobile App

## Authentication

Requires `Authorization: Bearer <token>`.

## Request

```
GET /api/v1/goals/recommended
Authorization: Bearer <access_token>
```

## Response (200 OK)

### Response Structure

```json
{
  "status": "success",
  "data": {
    "goal": { ... full goal DTO ... },
    "reason": "Overdue — immediate attention required (Yesterday)",
    "strategy": "deadlineInfo.sortPriority descending (OVERDUE:100 > TODAY:90 > TOMORROW:70 > UPCOMING:50 > NO_DEADLINE:0); tie-break: closest deadline; final: oldest goal (createdAt)",
    "strategyVersion": "v1"
  }
}
```

### Response (Null / No active goals)

```json
{
  "status": "success",
  "data": { 
    "goal": null, 
    "reason": null, 
    "strategy": "deadlineInfo.sortPriority descending (OVERDUE:100 > TODAY:90 > TOMORROW:70 > UPCOMING:50 > NO_DEADLINE:0); tie-break: closest deadline; final: oldest goal (createdAt)", 
    "strategyVersion": "v1" 
  }
}
```

## Recommendation Strategy (v1)

```
Recommendation Priority

1. Higher deadlineInfo.sortPriority
   (OVERDUE:100 > TODAY:90 > TOMORROW:70 > UPCOMING:50 > NO_DEADLINE:0)
2. Earlier deadline (tie-break)
   (Pre-computed lifecycle.overdueDays or lifecycle.daysRemaining)
3. Older active goal (stable ordering final tie-break)
   (createdAt ascending)
```

Algorithm: Single-pass O(n) scan — no sorting of the full collection is performed.

## Fallback Behavior

- `deadlineInfo` missing → goal is skipped defensively
- `sortPriority` missing → treated as 0
- `lifecycle` missing   → no deadline proximity tiebreaker applied
- All completed goals   → `{ goal: null, reason: null }` returned
- No active goals       → `{ goal: null, reason: null }` returned

## Versioning

The strategy version (currently `v1`) will be bumped if the recommendation algorithm changes in a breaking way or introduces new significant ranking variables.
