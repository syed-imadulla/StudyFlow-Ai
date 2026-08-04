import { GoalRecommendationService } from '../../../src/services/goalRecommendation.service.js';

/**
 * Unit tests for GoalRecommendationService.selectRecommendation()
 *
 * These tests verify the recommendation algorithm in isolation.
 * No DB connection or HTTP calls are made.
 */

// ── Test DTO helpers ─────────────────────────────────────────────────────────

const makeGoal = (overrides = {}) => ({
  status: 'ACTIVE',
  lifecycle: { isCompleted: false, daysRemaining: 7, overdueDays: null },
  deadlineInfo: { type: 'UPCOMING', sortPriority: 50 },
  createdAt: new Date('2026-01-01'),
  ...overrides
});

const makeCompleted = (overrides = {}) => makeGoal({
  status: 'COMPLETED',
  lifecycle: { isCompleted: true },
  deadlineInfo: { type: 'COMPLETED_TODAY', sortPriority: 20 },
  ...overrides
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GoalRecommendationService.selectRecommendation()', () => {

  // ── Edge Cases ─────────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns null goal when called with empty array', () => {
      const result = GoalRecommendationService.selectRecommendation([]);
      expect(result.goal).toBeNull();
      expect(result.strategy).toBeTruthy();
    });

    it('returns null goal when called with null input', () => {
      const result = GoalRecommendationService.selectRecommendation(null);
      expect(result.goal).toBeNull();
    });

    it('returns null goal when called with undefined input', () => {
      const result = GoalRecommendationService.selectRecommendation(undefined);
      expect(result.goal).toBeNull();
    });

    it('returns null goal when all goals are completed', () => {
      const result = GoalRecommendationService.selectRecommendation([
        makeCompleted({ title: 'Done A' }),
        makeCompleted({ title: 'Done B' })
      ]);
      expect(result.goal).toBeNull();
      expect(result.reason).toBeNull();
    });

    it('skips corrupted DTOs missing deadlineInfo entirely', () => {
      const bad = makeGoal({ deadlineInfo: null, title: 'Corrupted' });
      const good = makeGoal({ title: 'Valid', deadlineInfo: { type: 'UPCOMING', sortPriority: 50 } });
      const result = GoalRecommendationService.selectRecommendation([bad, good]);
      expect(result.goal.title).toBe('Valid');
    });

    it('returns null when only corrupted DTOs are present', () => {
      const bad = makeGoal({ deadlineInfo: null });
      const result = GoalRecommendationService.selectRecommendation([bad]);
      expect(result.goal).toBeNull();
    });

    it('returns the single active goal when there is only one', () => {
      const only = makeGoal({ title: 'Only Active Goal' });
      const result = GoalRecommendationService.selectRecommendation([only]);
      expect(result.goal.title).toBe('Only Active Goal');
    });
  });

  // ── Completed Goal Filtering ────────────────────────────────────────────────

  describe('completed goal exclusion', () => {
    it('excludes goals where status === COMPLETED', () => {
      const active = makeGoal({ title: 'Active', deadlineInfo: { type: 'UPCOMING', sortPriority: 50 } });
      const done = makeCompleted({ title: 'Completed' });
      const result = GoalRecommendationService.selectRecommendation([done, active]);
      expect(result.goal.title).toBe('Active');
    });

    it('excludes goals where lifecycle.isCompleted === true even if status is not COMPLETED', () => {
      const active = makeGoal({ title: 'Real Active' });
      const sneaky = makeGoal({ title: 'Sneaky Completed', lifecycle: { isCompleted: true } });
      const result = GoalRecommendationService.selectRecommendation([sneaky, active]);
      expect(result.goal.title).toBe('Real Active');
    });
  });

  // ── Priority Ordering ──────────────────────────────────────────────────────

  describe('priority ordering', () => {
    it('OVERDUE beats TODAY', () => {
      const overdue = makeGoal({
        title: 'OVERDUE Goal',
        deadlineInfo: { type: 'OVERDUE', sortPriority: 100 },
        lifecycle: { isCompleted: false, overdueDays: 2, daysRemaining: null }
      });
      const today = makeGoal({
        title: 'TODAY Goal',
        deadlineInfo: { type: 'TODAY', sortPriority: 90 },
        lifecycle: { isCompleted: false, daysRemaining: 0, overdueDays: null }
      });
      const result = GoalRecommendationService.selectRecommendation([today, overdue]);
      expect(result.goal.title).toBe('OVERDUE Goal');
      expect(result.reason).toContain('Overdue');
    });

    it('TODAY beats TOMORROW', () => {
      const today = makeGoal({
        title: 'TODAY Goal',
        deadlineInfo: { type: 'TODAY', sortPriority: 90 }
      });
      const tomorrow = makeGoal({
        title: 'TOMORROW Goal',
        deadlineInfo: { type: 'TOMORROW', sortPriority: 70 }
      });
      const result = GoalRecommendationService.selectRecommendation([tomorrow, today]);
      expect(result.goal.title).toBe('TODAY Goal');
    });

    it('TOMORROW beats UPCOMING', () => {
      const tomorrow = makeGoal({
        title: 'TOMORROW',
        deadlineInfo: { type: 'TOMORROW', sortPriority: 70 }
      });
      const upcoming = makeGoal({
        title: 'UPCOMING',
        deadlineInfo: { type: 'UPCOMING', sortPriority: 50 }
      });
      const result = GoalRecommendationService.selectRecommendation([upcoming, tomorrow]);
      expect(result.goal.title).toBe('TOMORROW');
    });

    it('UPCOMING beats NO_DEADLINE', () => {
      const upcoming = makeGoal({
        title: 'UPCOMING',
        deadlineInfo: { type: 'UPCOMING', sortPriority: 50 }
      });
      const none = makeGoal({
        title: 'NO_DEADLINE',
        deadlineInfo: { type: 'NO_DEADLINE', sortPriority: 0 }
      });
      const result = GoalRecommendationService.selectRecommendation([none, upcoming]);
      expect(result.goal.title).toBe('UPCOMING');
    });

    it('falls back to NO_DEADLINE goal when it is the only active goal', () => {
      const none = makeGoal({
        title: 'No Deadline',
        deadlineInfo: { type: 'NO_DEADLINE', sortPriority: 0 }
      });
      const result = GoalRecommendationService.selectRecommendation([none]);
      expect(result.goal.title).toBe('No Deadline');
    });
  });

  // ── Missing Fields Robustness ──────────────────────────────────────────────

  describe('robustness against missing optional fields', () => {
    it('handles missing sortPriority (defaults to 0)', () => {
      const withPriority = makeGoal({ title: 'Has Priority', deadlineInfo: { type: 'UPCOMING', sortPriority: 50 } });
      const noPriority = makeGoal({ title: 'No Priority', deadlineInfo: { type: 'UPCOMING' } });
      const result = GoalRecommendationService.selectRecommendation([noPriority, withPriority]);
      expect(result.goal.title).toBe('Has Priority');
    });

    it('handles missing lifecycle (still returns the goal)', () => {
      const noLifecycle = makeGoal({ title: 'No Lifecycle', lifecycle: undefined });
      const result = GoalRecommendationService.selectRecommendation([noLifecycle]);
      expect(result.goal.title).toBe('No Lifecycle');
    });

    it('handles null deadline gracefully (treated as NO_DEADLINE)', () => {
      const nullDeadline = makeGoal({
        title: 'Null Deadline',
        deadlineInfo: { type: 'NO_DEADLINE', sortPriority: 0 },
        lifecycle: { isCompleted: false, daysRemaining: null, overdueDays: null }
      });
      const result = GoalRecommendationService.selectRecommendation([nullDeadline]);
      expect(result.goal.title).toBe('Null Deadline');
    });
  });

  // ── Tie-Breaking ───────────────────────────────────────────────────────────

  describe('tie-breaking', () => {
    it('prefers the goal with fewer daysRemaining when sortPriority ties', () => {
      const farAway = makeGoal({
        title: '5 Days Left',
        deadlineInfo: { type: 'UPCOMING', sortPriority: 50 },
        lifecycle: { isCompleted: false, daysRemaining: 5, overdueDays: null }
      });
      const closer = makeGoal({
        title: '2 Days Left',
        deadlineInfo: { type: 'UPCOMING', sortPriority: 50 },
        lifecycle: { isCompleted: false, daysRemaining: 2, overdueDays: null }
      });
      const result = GoalRecommendationService.selectRecommendation([farAway, closer]);
      expect(result.goal.title).toBe('2 Days Left');
    });

    it('prefers the more overdue goal when both are OVERDUE', () => {
      const lessOverdue = makeGoal({
        title: '1 Day Overdue',
        deadlineInfo: { type: 'OVERDUE', sortPriority: 100 },
        lifecycle: { isCompleted: false, overdueDays: 1, daysRemaining: null }
      });
      const moreOverdue = makeGoal({
        title: '5 Days Overdue',
        deadlineInfo: { type: 'OVERDUE', sortPriority: 100 },
        lifecycle: { isCompleted: false, overdueDays: 5, daysRemaining: null }
      });
      const result = GoalRecommendationService.selectRecommendation([lessOverdue, moreOverdue]);
      expect(result.goal.title).toBe('5 Days Overdue');
    });

    it('uses createdAt as final stable tie-break when all else is equal', () => {
      const newer = makeGoal({ title: 'Newer', createdAt: new Date('2026-06-01'), deadlineInfo: { type: 'UPCOMING', sortPriority: 50 }, lifecycle: { isCompleted: false, daysRemaining: 5, overdueDays: null } });
      const older = makeGoal({ title: 'Older', createdAt: new Date('2026-01-01'), deadlineInfo: { type: 'UPCOMING', sortPriority: 50 }, lifecycle: { isCompleted: false, daysRemaining: 5, overdueDays: null } });
      const result = GoalRecommendationService.selectRecommendation([newer, older]);
      expect(result.goal.title).toBe('Older');
    });
  });

  // ── API Response Shape ─────────────────────────────────────────────────────

  describe('response shape', () => {
    it('always returns { goal, reason, strategy } even when goal is null', () => {
      const result = GoalRecommendationService.selectRecommendation([]);
      expect(result).toHaveProperty('goal');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('strategy');
    });

    it('returns a human-readable reason string for OVERDUE', () => {
      const g = makeGoal({ deadlineInfo: { type: 'OVERDUE', sortPriority: 100, label: 'Overdue by 3 days' } });
      const result = GoalRecommendationService.selectRecommendation([g]);
      expect(result.reason).toContain('Overdue');
    });

    it('returns a human-readable reason string for TODAY', () => {
      const g = makeGoal({ deadlineInfo: { type: 'TODAY', sortPriority: 90, label: 'Today' } });
      const result = GoalRecommendationService.selectRecommendation([g]);
      expect(result.reason).toContain('today');
    });

    it('includes the strategy description', () => {
      const g = makeGoal();
      const result = GoalRecommendationService.selectRecommendation([g]);
      expect(result.strategy).toContain('sortPriority');
    });
  });
});
