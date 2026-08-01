import mongoose from 'mongoose';
import { GoalService } from './src/services/goal.service.js';

const mockGoal = {
  toJSON: () => mockGoal,
  subtasks: [
    { id: '1', completed: false, deadline: '2026-07-31', title: 'Overdue milestone' },
    { id: '2', completed: false, deadline: '2026-08-01', title: 'Due today milestone' },
    { id: '3', completed: true, deadline: '2026-07-31', completedAt: new Date(), title: 'Completed late milestone' }
  ],
  deadline: '2026-08-10'
};

GoalService.getGoalById = async () => { return mockGoal; };
// Use the helper that attaches dynamic progress directly.
import fs from 'fs';
const attachDynamicProgress = (goalDoc) => {
  // replicate the helper logic since it's private in the module...
  // Wait, I can just require the transpiled/ESM module if it's exported, but it's not exported.
};
