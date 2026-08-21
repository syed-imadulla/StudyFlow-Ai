# Next Pillar Architecture Investigation

## 1. CURRENT STUDYFLOW ARCHITECTURE
StudyFlow is built on a distinct layered architecture separating intent from execution:
- **Goals & Milestones**: High-level objectives and structural breakdowns.
- **Planner**: The scheduling engine. Converts abstract objectives into concrete blocks of time.
- **Focus**: The execution engine. Records actual time spent working.

## 2. EXISTING PRODUCT PILLARS & STATUS
| Pillar | Purpose | Status | Backend Maturity | Frontend Maturity | Depends on Planner/Focus |
|--------|---------|--------|------------------|-------------------|-------------------------|
| **Planner** | Scheduling work | [STABLE] | High | High | Core |
| **Focus** | Executing work | [STABLE] | High (Frozen) | High (Frozen) | Core |
| **Goals (IdeaLab)** | Goal creation & breakdown | [PARTIALLY COMPLETE] | Medium | High (Complex 7-step UI) | None |
| **Dashboard** | Daily overview | [PARTIALLY COMPLETE] | Low (Relies on Goal endpoint) | High | Goals |
| **Analytics & History** | Progress tracking & feedback | [TECHNICAL DEBT] / [INCOMPLETE] | High (Real queries exist) | Low (Hardcoded UI) | Focus, Goals, Planner |

## 3. COMPLETE USER JOURNEY ANALYSIS
1. User creates a Goal (IdeaLab). -> Working.
2. Goal is broken into Milestones/Subtasks. -> Working.
3. Subtasks are scheduled in Planner. -> Working.
4. User opens Focus and works on Planner block. -> Working.
5. Focus completes, saves duration. -> Working.
6. **[GAP] User seeks feedback on their progress.**
   - The user has no way to see a history of their past Focus Sessions.
   - The Dashboard only shows the current active goal progress.
   - The Analytics page (`analytics.html`) contains hardcoded strings (e.g., `+10%`, `Low Distractions`) and mock UI elements.

## 4. VERIFIED GAPS
- **No Session History**: The application saves `FocusSession` data perfectly, but the user literally cannot view it anywhere in the UI.
- **Hardcoded Analytics UI**: The backend `AnalyticsService.js` calculates real streaks and total hours, but `analytics.html` ignores much of it and uses hardcoded metrics.
- **Missing Feedback Loop**: Without seeing the impact of their deep work, the productivity loop is broken.

---

## 5. CANDIDATE NEXT PILLARS

### Candidate 1: Analytics & Session History (RECOMMENDED)
- **Problem**: The user journey ends abruptly after Focus. There is no way to view past execution data, and the Analytics UI is fake.
- **Current state**: Backend is mature (already calculates streaks/hours). Frontend is hardcoded.
- **Why now**: It closes the core loop of (Plan → Execute → Review). It proves that the data collected in Focus is actually valuable.
- **Backend impact**: Low (exposing a history endpoint, refining existing KPIs).
- **Frontend impact**: High (rendering actual charts, replacing hardcoded HTML, building a History list).
- **Risk**: Low (read-only operations on existing data).
- **Out of Scope**: Advanced AI productivity coaching.

### Candidate 2: Deep Goal/Checklist Unification
- **Problem**: The Focus checklist is synthetic. The Dashboard progress doesn't perfectly map to Planner completion.
- **Current state**: Mismatched schemas between Goal subtasks and Focus states.
- **Why wait**: Fixing this requires risky, cross-domain schema migrations (Goals + Planner + Focus). Analytics provides more immediate user value with less risk.

### Candidate 3: AI Goal Architect (IdeaLab)
- **Problem**: Goal creation is currently a heavy manual process or relies on mock AI.
- **Current state**: `idealab.html` has a massive 7-step UI.
- **Why wait**: It is an onboarding/creation feature. The core execution loop (Analytics) is more critical for retention.

---

## 6. RECOMMENDATION: ANALYTICS & SESSION HISTORY
**Why:** Focus is now actively recording highly accurate, server-authoritative execution data. However, this data goes into a black hole. Building the Analytics & History pillar provides the payoff for the user's hard work. It connects Goals, Planner, and Focus together into a unified progress report.

**What it will connect:**
- `FocusSession` duration/notes/interruptions → displayed in a History feed.
- `FocusSession` dates → calculated into Streaks and Velocity charts.
- `Planner/Goal` completion → displayed in Task Completion rates.

**What MUST NOT be included yet:**
- Productivity scoring algorithms.
- Gamification/badges.
- AI personalized coaching.

---

## 7. PROPOSED PHASE 0: ARCHITECTURE INVESTIGATION + BOUNDARY LOCK
Before writing code for Analytics, Step 0 must define:
1. **Source of Truth**: Confirm that `FocusSession` is the sole source of time metrics and `Goal/Task` is the sole source of completion metrics.
2. **Chart Strategy**: Decide how to render charts on the frontend without heavy external dependencies if possible, or select a library (e.g., Chart.js).
3. **API Contracts**: Define exactly what `GET /api/v1/analytics/history` and `GET /api/v1/analytics/kpis` must return to replace the hardcoded UI.
4. **Security Boundaries**: Ensure users can only query their own Analytics.
5. **Test Strategy**: Define how to test analytics aggregations without flaky date-math in Jest.
