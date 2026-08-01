import mongoose from 'mongoose';
import { GoalService } from '../../src/services/goal.service.js';
import { Goal } from '../../src/models/Goal.js';

let userId;

beforeAll(async () => {
  userId = new mongoose.Types.ObjectId();
});

describe('Milestone Generation Pipeline & Intelligence Layer', () => {
  it('should generate factual milestones and attach intelligence natively', async () => {
    const payload = {
      title: 'Full Pipeline Integration Test',
      urgency: 'ACTIVE',
      description: 'Verifying end-to-end intelligence layer generation',
      deadline: { mode: 'DURATION', value: 7, unit: 'days' },
      rawDump: "First Milestone\nSecond Milestone"
    };

    // 1. Goal Creation & Backend Generation
    const goal = await GoalService.createGoal(userId, payload);
    
    // 2. Assert MongoDB persistence (Should ONLY contain facts)
    const dbGoal = await Goal.findById(goal._id).lean();
    expect(dbGoal.subtasks.length).toBe(2);
    
    dbGoal.subtasks.forEach(sub => {
      // Must have a factual deadline string (YYYY-MM-DD)
      expect(sub.deadline).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Must NEVER persist deadlineDisplay
      expect(sub.deadlineDisplay).toBeUndefined();
    });

    // 3. Assert GET /goals API Response (Should attach derived intelligence)
    const apiGoals = await GoalService.getGoals(userId);
    expect(apiGoals.length).toBe(1);
    
    const apiGoal = apiGoals[0];
    apiGoal.subtasks.forEach(sub => {
      // Must contain factual deadline
      expect(sub.deadline).toBeDefined();
      
      // Must contain derived lifecycle
      expect(sub.lifecycle).toBeDefined();
      expect(sub.lifecycle.status).toBe('ACTIVE');
      expect(sub.lifecycle.hasDeadline).toBe(true);

      // Must contain derived deadlineInfo
      expect(sub.deadlineInfo).toBeDefined();
      expect(sub.deadlineInfo.type).toBeDefined();
      expect(sub.deadlineInfo.label).toBeDefined();
      expect(sub.deadlineInfo.color).toBeDefined();
      expect(sub.deadlineInfo.badge).toBeDefined();
      expect(sub.deadlineInfo.icon).toBeDefined();
      
      // Legacy presentation fields should not exist
      expect(sub.deadlineDisplay).toBeUndefined();
    });
  });
});
