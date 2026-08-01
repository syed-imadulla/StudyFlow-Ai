import { jest } from '@jest/globals';
import mongoose from 'mongoose';
import { GoalSyncService } from '../../src/services/goalSync.service.js';
import { Goal } from '../../src/models/Goal.js';
import { AppError } from '../../src/utils/AppError.js';
import { HTTP_STATUS } from '../../src/constants/index.js';
import { createMockUser, createMockGoal, createMockMilestone } from '../factories/models.factory.js';

describe('GoalSyncService', () => {
  let userId;

  beforeEach(() => {
    userId = createMockUser();
  });

  describe('handlePlannerScheduled', () => {
    it('should transition a milestone from TODO to SCHEDULED', async () => {
      const milestone = createMockMilestone({ status: 'TODO', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      const updatedGoal = await GoalSyncService.handlePlannerScheduled(userId, goal._id, milestone._id);
      const updatedMilestone = updatedGoal.subtasks.id(milestone._id);

      expect(updatedMilestone.status).toBe('SCHEDULED');
      expect(updatedMilestone.completed).toBe(false);
    });

    it('should throw AppError if goal does not exist', async () => {
      const fakeGoalId = new mongoose.Types.ObjectId();
      const fakeMilestoneId = new mongoose.Types.ObjectId();

      await expect(GoalSyncService.handlePlannerScheduled(userId, fakeGoalId, fakeMilestoneId))
        .rejects
        .toThrow(AppError);
    });
    
    it('should throw AppError if milestone is already COMPLETED', async () => {
      const milestone = createMockMilestone({ status: 'COMPLETED', completed: true });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      await expect(GoalSyncService.handlePlannerScheduled(userId, goal._id, milestone._id))
        .rejects
        .toThrow(AppError);
    });

    it('should do nothing if milestone is already SCHEDULED', async () => {
      const milestone = createMockMilestone({ status: 'SCHEDULED', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      const updatedGoal = await GoalSyncService.handlePlannerScheduled(userId, goal._id, milestone._id);
      expect(updatedGoal.subtasks.id(milestone._id).status).toBe('SCHEDULED');
    });
  });

  describe('handlePlannerCompleted', () => {
    it('should transition a milestone from SCHEDULED to COMPLETED and update goal progress', async () => {
      const m1 = createMockMilestone({ status: 'SCHEDULED', completed: false });
      const m2 = createMockMilestone({ status: 'TODO', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [m1, m2] }));
      await goal.save();

      const updatedGoal = await GoalSyncService.handlePlannerCompleted(userId, goal._id, m1._id);
      const updatedM1 = updatedGoal.subtasks.id(m1._id);

      expect(updatedM1.status).toBe('COMPLETED');
      expect(updatedM1.completed).toBe(true);
      expect(updatedGoal.progress).toBe(50);
    });

    it('should throw AppError if milestone is TODO', async () => {
      const milestone = createMockMilestone({ status: 'TODO', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      await expect(GoalSyncService.handlePlannerCompleted(userId, goal._id, milestone._id))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('handlePlannerDeleted', () => {
    it('should transition a milestone from SCHEDULED to TODO', async () => {
      const milestone = createMockMilestone({ status: 'SCHEDULED', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      const updatedGoal = await GoalSyncService.handlePlannerDeleted(userId, goal._id, milestone._id);
      const updatedMilestone = updatedGoal.subtasks.id(milestone._id);

      expect(updatedMilestone.status).toBe('TODO');
      expect(updatedMilestone.completed).toBe(false);
    });

    it('should throw AppError if milestone is COMPLETED', async () => {
      const milestone = createMockMilestone({ status: 'COMPLETED', completed: true });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      await expect(GoalSyncService.handlePlannerDeleted(userId, goal._id, milestone._id))
        .rejects
        .toThrow(AppError);
    });
  });

  describe('Rollback Helpers', () => {
    it('rollbackPlannerScheduled should restore metadata if applicable', async () => {
      const milestone = createMockMilestone({ status: 'SCHEDULED', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      const updatedGoal = await GoalSyncService.rollbackPlannerRescheduled(userId, goal._id, milestone._id, { deadline: '2026-08-01' });
      expect(updatedGoal.subtasks.id(milestone._id).deadline).toBe('2026-08-01');
    });

    it('rollbackPlannerCompleted should restore status to SCHEDULED and completed=false', async () => {
      const milestone = createMockMilestone({ status: 'COMPLETED', completed: true });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone], progress: 100 }));
      await goal.save();

      const updatedGoal = await GoalSyncService.rollbackPlannerCompleted(userId, goal._id, milestone._id);
      const updatedMilestone = updatedGoal.subtasks.id(milestone._id);
      expect(updatedMilestone.status).toBe('SCHEDULED');
      expect(updatedMilestone.completed).toBe(false);
      expect(updatedGoal.progress).toBe(0);
    });

    it('rollbackPlannerDeleted should restore status to SCHEDULED', async () => {
      const milestone = createMockMilestone({ status: 'TODO', completed: false });
      const goal = new Goal(createMockGoal(userId, { subtasks: [milestone] }));
      await goal.save();

      const updatedGoal = await GoalSyncService.rollbackPlannerDeleted(userId, goal._id, milestone._id);
      const updatedMilestone = updatedGoal.subtasks.id(milestone._id);
      expect(updatedMilestone.status).toBe('SCHEDULED');
      expect(updatedMilestone.completed).toBe(false);
    });
  });
});
