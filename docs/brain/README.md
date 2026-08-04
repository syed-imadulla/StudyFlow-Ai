# README — StudyFlow AI Brain

This folder (`docs/brain/`) is the **persistent project memory** for StudyFlow AI.

It is the single source of knowledge about the project's architecture, decisions, and current state.

**Start here when onboarding to this project.**

---

## Files

| File | Purpose |
|------|---------|
| `PROJECT_OVERVIEW.md` | What the project is, technology stack, high-level architecture, module map |
| `CURRENT_STATUS.md` | Current phase, next phase, roadmap table |
| `ROADMAP.md` | All phases with status; deferred features |
| `ARCHITECTURE.md` | Full technical architecture: backend, frontend store, completion flow, event flow |
| `DECISIONS.md` | All architectural decisions with context and consequences |
| `CODING_PRINCIPLES.md` | Implementation rules every contributor must follow |
| `COMPLETED_FEATURES.md` | Summary of every completed phase with rationale and design decisions |
| `GOALS.md` | Goal, Milestone, and Subtask schemas; completion flow; lifecycle states |
| `PLANNER.md` | Planner architecture, canonical date helper, frozen rules |
| `INTEGRATIONS.md` | Cross-module contracts and integration phase mapping |
| `API.md` | All important API endpoints, DTO shape, and store action reference |
| `QA_HISTORY.md` | QA validation history through current phase |
| `CHANGELOG.md` | High-level changelog |
| `UI_GUIDELINES.md` | Visual design guidelines |
| `DEBUG_NOTES.md` | Debug notes |
| `SESSION.md` | Session notes |

---

## Quick Summary

StudyFlow AI is an intelligent study planning platform.

**Architecture in one sentence**: The backend owns all business logic and returns enriched DTOs; the frontend is a pure presentation layer that renders what the backend provides, orchestrated by a custom global store.

**Current phase**: ✅ Phase 2.3.0.8 — Goal Completion Experience (COMPLETE)

**Next phase**: ▶ Phase 2.3.0.9 — Goal Archive

---

## Core Rule

> **Persist facts. Derive intelligence. Render only.**

The database stores raw facts. The backend Intelligence Layer derives lifecycle, deadline urgency, progress, and recommendations dynamically. The frontend renders the result without any calculations.
