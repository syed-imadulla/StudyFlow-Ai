# Changelog

All notable changes to this project will be documented in this file.

## v2.1.1 (Phase 2.3.0.2 Completion)
**Release Date**: July 31, 2026

### Summary
This release marks the completion of Phase 2.3.0.2 — Goal Lifecycle Engine. The goal lifecycle state is now dynamically computed from immutable facts, ensuring a single source of truth without persisting lifecycle status in the database.

### Major Features
- **Goal Lifecycle Engine**: Implemented `GoalLifecycleService` to compute lifecycle states (e.g., DUE_SOON, OVERDUE, COMPLETED_LATE) on the fly based on goal deadlines and completion timestamps.
- **Immutable Persistence**: Added `completedAt` timestamp to track exactly when goals are completed. Refactored the architecture to avoid saving dynamic lifecycle states to MongoDB.

### Architecture Improvements
- **Separation of Workflow and Lifecycle**: The `status` field is now strictly for workflow state (ACTIVE, COMPLETED), while all intelligence (OVERDUE, DUE_TODAY) lives in the computed `lifecycle` response object.

---

## v2.1.0 (Phase 2.2 Completion)
**Release Date**: July 21, 2026

### Summary
This release marks the completion of the Goal ↔ Planner synchronization foundation (Phase 2.2). It solidifies the architecture, testing, API error handling, structured logging, and UI consistency for the core scheduling workflows.

### Major Features
- **Goal ↔ Planner Synchronization**: Seamlessly schedule milestones from goals to the planner.
- **Planner Scheduling Workflow**: Intuitive modal to schedule and update milestones, supporting conflict detection and automatic resizing.
- **Workspace ↔ Planner Synchronization**: Real-time frontend updates to reflect scheduled state changes immediately across the UI.

### Architecture Improvements
- **Goal Lifecycle Cleanup**: Ensured proper cascading deletes and status rollbacks when unscheduling.
- **Application Rollback Strategy**: Implemented robust two-phase commits with rollback compensation in `GoalSyncService` to prevent orphaned blocks.
- **Planner Synchronization Service**: Dedicated `PlannerService` and `GoalSyncService` for handling complex interdependent state safely.

### Backend Improvements
- **Structured Logging**: Replaced generic console logs with centralized structured logging for observability and production readiness.
- **API Error Standardization**: Replaced inconsistent API errors with machine-readable, stable application error codes.

### Frontend Improvements
- **Dashboard & Workspace Sync**: Immediate UI state reflection using local state patching (e.g., `isMilestoneScheduled` helper) without unnecessary API re-fetches.
- **UI Consistency & UX Polish**: Removed redundant badges, replaced large text buttons with elegant minimalist icons, refined tooltips, and improved planner block titles to match the StudyFlow design system.

### Testing
- **Automated Testing Suite**: Built a comprehensive Jest-based test suite specifically validating the Goal ↔ Planner synchronization architecture.
- **Integration Tests**: Covered end-to-end sync flows, error recovery, rollback behavior, and edge cases.

### Documentation
- Centralized `API_ERRORS.md` registry detailing all public error codes.
- `CHANGELOG.md` and release documentation tracking.

### Bug Fixes
- Fixed "undefined `scheduleMilestone`" issue caused by frontend module initialization orders.
- Resolved UI desynchronization where scheduled blocks wouldn't update the Workspace without a hard reload.
- Prevented title wrapping in Planner calendar blocks by splitting goal names into chips.

### Known Limitations
- No recurring planner events.
- No drag-and-drop rescheduling.
- Focus mode not fully integrated.
- AI scheduling enhancements pending.

### Next Milestone
**Phase 2.3**: Focus Mode, Dashboard Intelligence, Planner UX, and AI Productivity.
