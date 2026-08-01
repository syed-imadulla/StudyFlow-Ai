import mongoose from 'mongoose';
import { GoalService } from './src/services/goal.service.js';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
dotenv.config();

async function trace() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  // 1. Get a goal with incomplete subtasks
  const goal = await Goal.findOne({ 'subtasks.completed': false });
  if (!goal) {
    console.log("No incomplete milestones found in DB.");
    process.exit(0);
  }
  
  const subtask = goal.subtasks.find(s => !s.completed);
  console.log("=== Layer 1: MongoDB ===");
  console.log({
    goalId: goal._id,
    milestoneId: subtask._id,
    completed: subtask.completed,
    deadline: subtask.deadline,
    lifecycleStatus: subtask.lifecycle?.status,
    deadlineInfoLabel: subtask.deadlineInfo?.label
  });
  
  console.log("\n=== Layer 2: GoalService.getGoals() / API JSON ===");
  const apiGoals = await GoalService.getGoals(goal.user);
  const apiGoal = apiGoals.find(g => g.id === goal.id || g._id?.toString() === goal._id.toString());
  const apiSubtask = apiGoal.subtasks.find(s => s.id === subtask.id || s._id?.toString() === subtask._id.toString());
  
  console.log({
    goalId: apiGoal.id || apiGoal._id,
    milestoneId: apiSubtask.id || apiSubtask._id,
    completed: apiSubtask.completed,
    deadline: apiSubtask.deadline,
    lifecycleStatus: apiSubtask.lifecycle?.status,
    isDueToday: apiSubtask.lifecycle?.isDueToday,
    isDueSoon: apiSubtask.lifecycle?.isDueSoon,
    isOverdue: apiSubtask.lifecycle?.isOverdue,
    deadlineInfoLabel: apiSubtask.deadlineInfo?.label
  });

  process.exit(0);
}
trace().catch(console.error);
