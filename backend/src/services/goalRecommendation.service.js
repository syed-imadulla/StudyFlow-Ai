/**
 * GoalRecommendationService
 * ─────────────────────────────────────────────────────────────────────────────
 * Purpose: Backend intelligence service that selects the single most-important 
 * active goal from a pre-enriched goal DTO collection.
 *
 * Responsibilities:
 *  - Iterates over active goals to find the best candidate.
 *  - Uses pre-computed intelligence (from GoalLifecycleService and 
 *    DeadlineIntelligenceService) to rank goals.
 *  - Provides a consistent recommendation for any requesting client.
 *
 * Inputs: Array of enriched goal DTOs (must contain lifecycle and deadlineInfo).
 * Outputs: RecommendationResult containing the recommended goal, reason, 
 *          and strategy details.
 *
 * Service Ownership & Consumers
 * ──────────────────────────────────────────────────────────────────────────────
 * This is a Reusable Backend Infrastructure component.
 * It is explicitly NOT a Dashboard-specific service. Frontend clients never 
 * implement recommendation logic. Future consumers include:
 *  - Dashboard Hero Card
 *  - Planner Focus Goal panel
 *  - AI Study Coach
 *  - Push Notifications & Daily Briefings
 *  - Mobile Applications
 *
 * RECOMMENDATION STRATEGY (v1) — Priority Order
 * ──────────────────────────────────────────────────────────────────────────────
 *
 *  1. sortPriority (primary) — values from DEADLINE_SORT_PRIORITY constants
 *       OVERDUE      → 100
 *       TODAY        → 90
 *       TOMORROW     → 70
 *       UPCOMING     → 50
 *       NO_DEADLINE  → 0
 *
 *  2. Closest deadline (tie-break)
 *       Pre-computed lifecycle.overdueDays / lifecycle.daysRemaining.
 *       Among OVERDUE goals: more overdue wins. Among others: sooner deadline wins.
 *
 *  3. Oldest goal (stable final tie-break)
 *       createdAt ascending. Normalized to ms once per DTO.
 *
 * PERFORMANCE & COMPLEXITY
 * ──────────────────────────────────────────────────────────────────────────────
 *  • Complexity: O(n) single-pass linear scan — no array sort() is performed.
 *  • Memory: Only one best-candidate reference is kept in memory.
 *  • Optimization: No new Date() parsing is performed inside the loop comparison.
 *
 * FUTURE RECOMMENDATION SIGNALS (Roadmap)
 * ──────────────────────────────────────────────────────────────────────────────
 *  Version 1 intentionally keeps recommendation simple (urgency-driven).
 *  Future phases will add to _compare without changing any consumer contracts:
 *  - Goal Health: Score penalty for at-risk goals
 *  - Blocking Milestones: Boost for goals blocking dependent tasks
 *  - User Priority: Multipliers for user-defined importance
 *  - Exam Proximity: Calendar-based urgency curve
 *  - Study Streak / Focus History: Momentum-based weighting
 *  - AI Personalization: Behavioral models to suggest optimal tasks
 *  - Predictive Analytics: Recommending based on user success patterns
 */

import { DEADLINE_SORT_PRIORITY } from '../constants/index.js';

// ── Strategy constants ─────────────────────────────────────────────────────────

/** Bump when the recommendation algorithm changes in a breaking way. */
const STRATEGY_VERSION = 'v1';

const STRATEGY_DESCRIPTION =
  'deadlineInfo.sortPriority descending ' +
  '(OVERDUE:100 > TODAY:90 > TOMORROW:70 > UPCOMING:50 > NO_DEADLINE:0); ' +
  'tie-break: closest deadline; final: oldest goal (createdAt)';

// ── Internal helpers ───────────────────────────────────────────────────────────

/**
 * Returns a tiebreaker urgency score for a goal.
 * Lower value = higher urgency.
 * Uses only pre-computed lifecycle fields — no date parsing.
 */
function _tiebreakerScore(goal) {
  const lc = goal.lifecycle;
  if (!lc) return 0;
  if (lc.overdueDays != null) return -lc.overdueDays; // more overdue → lower → wins
  if (lc.daysRemaining != null) return lc.daysRemaining; // fewer days → lower → wins
  return 0;
}

/**
 * Compares two enriched goal DTOs for recommendation ranking.
 * Returns negative if `a` should be recommended over `b`.
 */
function _compare(a, b) {
  const pa = a.deadlineInfo?.sortPriority ?? 0;
  const pb = b.deadlineInfo?.sortPriority ?? 0;

  if (pb !== pa) return pb - pa;                    // 1. Higher sortPriority wins

  const ta = _tiebreakerScore(a);
  const tb = _tiebreakerScore(b);
  if (ta !== tb) return ta - tb;                    // 2. Closest deadline wins

  return a._createdAtMs - b._createdAtMs;           // 3. Oldest goal wins (stable)
}

/**
 * Generates a human-readable reason string for the recommended goal.
 */
function _reason(goal) {
  const type  = goal.deadlineInfo?.type;
  const label = goal.deadlineInfo?.label;

  const REASON_BY_TYPE = {
    OVERDUE:     `Overdue — immediate attention required (${label})`,
    TODAY:       `Due today — highest priority for today (${label})`,
    TOMORROW:    `Due tomorrow — next closest deadline (${label})`,
    UPCOMING:    `Upcoming deadline — recommended next (${label})`,
    NO_DEADLINE: 'No deadline — only active goal available'
  };

  return REASON_BY_TYPE[type] ?? `Recommended by urgency (${label ?? 'unknown'})`;
}

// ── Service ────────────────────────────────────────────────────────────────────

export class GoalRecommendationService {
  /**
   * Selects the single most-recommended active goal from a pre-enriched DTO array.
   *
   * Input: goalDTOs produced by GoalService.getGoals() (lifecycle + deadlineInfo attached).
   * Output: RecommendationResult — always returns the full shape, never throws.
   *
   * @param {Array<Object>|null|undefined} goalDTOs
   * @returns {{ goal: Object|null, reason: string|null, strategy: string, strategyVersion: string }}
   */
  static selectRecommendation(goalDTOs) {
    const empty = {
      goal:            null,
      reason:          null,
      strategy:        STRATEGY_DESCRIPTION,
      strategyVersion: STRATEGY_VERSION
    };

    if (!Array.isArray(goalDTOs) || goalDTOs.length === 0) return empty;

    // Normalize createdAt to ms ONCE per DTO — avoids repeated Date construction inside _compare.
    for (const g of goalDTOs) {
      g._createdAtMs = g.createdAt ? new Date(g.createdAt).getTime() : 0;
    }

    let best = null;

    for (const goal of goalDTOs) {
      // Exclude completed goals
      if (goal.lifecycle?.isCompleted || goal.status === 'COMPLETED') continue;

      // Skip corrupted DTOs missing deadlineInfo — defensive guard
      if (!goal.deadlineInfo) continue;

      if (best === null || _compare(goal, best) < 0) {
        best = goal;
      }
    }

    if (!best) return empty;

    return {
      goal:            best,
      reason:          _reason(best),
      strategy:        STRATEGY_DESCRIPTION,
      strategyVersion: STRATEGY_VERSION
    };
  }
}
