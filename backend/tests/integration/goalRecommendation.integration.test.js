/**
 * Integration Test: GET /api/v1/goals/recommended
 *
 * Verifies the complete recommendation pipeline:
 *   GoalService.getGoals()
 *     → attachDynamicProgress (lifecycle + deadlineInfo)
 *     → GoalRecommendationService.selectRecommendation()
 *     → GoalService.getRecommendedGoal()
 *
 * Tests are service-level (no HTTP server required).
 * Authentication is implicit via userId parameter.
 */

import mongoose from 'mongoose';
import { GoalService } from '../../src/services/goal.service.js';
import { createMockUser } from '../factories/models.factory.js';

describe('GoalRecommendation Integration — GoalService.getRecommendedGoal()', () => {
  let userId;

  beforeEach(() => {
    userId = createMockUser();
  });

  // ── Response shape ──────────────────────────────────────────────────────────

  describe('response shape', () => {
    it('always returns { goal, reason, strategy, strategyVersion }', async () => {
      const result = await GoalService.getRecommendedGoal(userId);
      expect(result).toHaveProperty('goal');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('strategy');
      expect(result).toHaveProperty('strategyVersion');
      expect(result.strategyVersion).toBe('v1');
    });
  });

  // ── Null recommendation ─────────────────────────────────────────────────────

  describe('null recommendation', () => {
    it('returns goal: null when user has no goals', async () => {
      const result = await GoalService.getRecommendedGoal(userId);
      expect(result.goal).toBeNull();
      expect(result.reason).toBeNull();
    });
  });

  // ── Recommendation selection ────────────────────────────────────────────────

  describe('recommendation selection', () => {
    it('returns the only active goal when there is exactly one', async () => {
      await GoalService.createGoal(userId, {
        title: 'Only Active Goal',
        urgency: 'ACTIVE',
        deadline: '2099-12-31'
      });

      const result = await GoalService.getRecommendedGoal(userId);
      expect(result.goal).not.toBeNull();
      expect(result.goal.title).toBe('Only Active Goal');
    });

    it('excludes completed goals from recommendation', async () => {
      await GoalService.createGoal(userId, {
        title: 'Active Goal',
        urgency: 'ACTIVE',
        deadline: '2099-12-31'
      });
      const completedGoal = await GoalService.createGoal(userId, {
        title: 'Completed Goal',
        urgency: 'ACTIVE',
        deadline: '2099-12-01'
      });
      await GoalService.updateGoal(userId, completedGoal._id, { completed: true });

      const result = await GoalService.getRecommendedGoal(userId);
      expect(result.goal.title).toBe('Active Goal');
    });

    it('prefers the OVERDUE goal over an UPCOMING goal', async () => {
      // Overdue: deadline in the past
      await GoalService.createGoal(userId, {
        title: 'Overdue Goal',
        urgency: 'ACTIVE',
        deadline: '2020-01-01'
      });
      // Upcoming: deadline far in the future
      await GoalService.createGoal(userId, {
        title: 'Upcoming Goal',
        urgency: 'ACTIVE',
        deadline: '2099-12-31'
      });

      const result = await GoalService.getRecommendedGoal(userId);
      expect(result.goal.title).toBe('Overdue Goal');
    });

    it('includes a non-null reason string for active goals', async () => {
      await GoalService.createGoal(userId, {
        title: 'Goal with Reason',
        urgency: 'ACTIVE',
        deadline: '2020-01-01'
      });

      const result = await GoalService.getRecommendedGoal(userId);
      expect(result.goal).not.toBeNull();
      expect(typeof result.reason).toBe('string');
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('recommended goal DTO includes lifecycle and deadlineInfo', async () => {
      await GoalService.createGoal(userId, {
        title: 'Intel Goal',
        urgency: 'ACTIVE',
        deadline: '2020-01-01'
      });

      const result = await GoalService.getRecommendedGoal(userId);
      expect(result.goal.lifecycle).toBeDefined();
      expect(result.goal.lifecycle.status).toBeDefined();
      expect(result.goal.deadlineInfo).toBeDefined();
      expect(result.goal.deadlineInfo.type).toBeDefined();
      expect(result.goal.deadlineInfo.sortPriority).toBeDefined();
    });
  });
});
