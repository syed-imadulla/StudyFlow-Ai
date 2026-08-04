# Coding Principles

These rules govern every implementation in StudyFlow AI.
**Future contributors must read and follow these principles without exception.**

---

## 1. Investigate Before Implementing

Before writing any code, trace the complete data flow:
```
Backend Service → API Route → Frontend Service → Store Action → Renderer
```
Use console logs, code inspection, and root-cause analysis. Never implement based on assumptions.

---

## 2. Backend Owns All Intelligence

The backend is the single source of truth for:
- Goal lifecycle status
- Deadline intelligence (badges, colors, urgency, sortPriority)
- Progress calculation
- Goal health
- Recommendation ranking
- Completion detection

**If it involves a date comparison, a status derivation, or a priority calculation — it belongs in the backend.**

---

## 3. Frontend Renders Only

The frontend receives backend DTOs and renders them. It must never:
- Compare dates
- Calculate progress percentages
- Sort goals by urgency
- Determine lifecycle status
- Generate recommendation text
- Compute completion duration

---

## 4. Store Is the Orchestration Layer

All user actions flow through the Store:
```
User action → workspaceActions.js → SF_STORE.dispatch() → API → store patch → re-render
```
The Store is also the only place that detects state transitions (e.g., goal becoming completed) and triggers side effects (e.g., emitting completion events).

---

## 5. Never Duplicate Business Logic

If a computation exists in a backend service, do not reproduce it in the frontend. If a UI component exists in `SF_COMPONENTS`, do not create a parallel implementation. Duplication breaks consistency.

---

## 6. Reuse Existing Services and Components

Before creating anything new:
1. Check if a backend service already handles it
2. Check if a Store action already fetches it
3. Check if `SF_COMPONENTS` already renders it
4. Check if a WorkspaceMapper method already transforms it

Only create new code when no existing path is viable.

---

## 7. Preserve the Existing UI

New phases must not change:
- Layout or spacing
- Typography
- Colors
- Icons
- Animations
- Navigation
- Responsive behavior
- Existing workflows

**The application should look visually identical before and after any implementation phase.**

---

## 8. Preserve Existing Architecture

Do not refactor core systems without explicit user approval:
- Planner internals are frozen
- Store slice structure is stable
- WorkspaceMapper pattern is established
- `SF_COMPONENTS` is the canonical component library

---

## 9. Renderers Are Pure

Rendering functions receive a ViewModel and return an HTML string. They contain:
- No API calls
- No store reads
- No business logic
- No date parsing

---

## 10. Graceful Fallbacks Everywhere

The application must continue working when:
- A recommendation is null
- An optional timestamp (e.g., `completedAt`) is missing
- A backend field is undefined
- A network request fails

Never throw uncaught errors. Never render broken UI.

---

## 11. Event Bus for Side Effects

Side effects triggered from the Store use the `CompletionEvents` pattern:
- Store detects state transition
- Emits via `CompletionEvents.emitGoalCompleted(goal)`
- Module listens via `CompletionEvents.onGoalCompleted(callback)`

Never use raw `window.dispatchEvent` outside the `completionEvents.js` helper.

---

## 12. Scope Scripts to Where They're Needed

Completion module scripts (`completionEvents.js`, `completionRenderer.js`, `completionModal.js`) are loaded only on pages that consume goal state. Unrelated pages (settings, analytics, focus, 404) do not load these scripts.

---

## 13. Idempotency for Side Effects

Any side effect that could fire multiple times (e.g., completion modal) must include an idempotency guard:
```js
if (this.lastCompletedGoalId === goal.id) return;
this.lastCompletedGoalId = goal.id;
```

---

## 14. Document Architectural Decisions

When making a non-obvious design choice, record it in `docs/brain/DECISIONS.md` with:
- Status
- Context
- Decision
- Consequences

---

## 15. Deferred Features Stay Deferred

Features on the deferred list (Goal Archive, Analytics, XP, Badges, Navigation improvements, AI personalization) must not be partially implemented as part of other phases. Each deferred feature has its own dedicated phase.
