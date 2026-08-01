# Architectural Decisions

This document records the most important architectural decisions.

1. **Planner is the scheduling source of truth.**
2. **Rendering is store-driven.** Disjointed views do not manage their own underlying block data.
3. **Canonical date helper:** `getPlannerBlockDate()` handles all date string extractions from block entities. Do not parse dates manually inline.
4. **Mock schema mirrors backend schema.** There should be no structural difference between test environments and production datasets.
5. **Planner architecture is frozen.** Do not refactor core planner behaviors (drag-and-drop, overlaps, grid systems) unless solving a validated bug.
6. **No duplicate business logic.** If a pattern exists, reuse it. Do not reimplement helpers natively within a component.

## Persist facts. Derive intelligence. Never persist presentation.

- **Status**: Accepted
- **Context**: The frontend was previously calculating dates (e.g. `deadlineDisplay: 'Tomorrow'`) and sending presentation strings to the backend, which saved them in MongoDB. This broke the Intelligence Layer's ability to calculate metrics since it expects factual dates.
- **Decision**: 
  - The database must only persist pure facts (`deadline`, `completed`, `completedAt`).
  - No module should ever store presentation strings or visual labels in the database.
  - The `LifecycleEngine` and `DeadlineIntelligenceService` are solely responsible for deriving intelligence (`lifecycle`, `deadlineInfo`) dynamically on every request.
  - The frontend must never compute these properties independently, nor parse strings to reconstruct dates. It acts as a pure consumer of backend intelligence.
- **Consequences**: This principle governs all future modules (Dashboard, Planner, Mobile, etc.). They must all render from the exact same Intelligence Layer, ensuring total consistency and a single source of truth for business logic.
