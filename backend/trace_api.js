import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import { GoalService } from './src/services/goal.service.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve('./.env') });

async function trace() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const goals = await Goal.find().lean();
  let targetGoal = null;
  let targetSub = null;
  for (const g of goals) {
    if (g.subtasks) {
      for (const sub of g.subtasks) {
        if (!sub.completed) {
          targetGoal = g;
          targetSub = sub;
          break;
        }
      }
    }
    if (targetSub) break;
  }
  
  const apiGoals = await GoalService.getGoals(targetGoal.user);
  console.log("Goals found for user:", apiGoals.length);
  const apiGoal = apiGoals.find(g => g.id === targetGoal._id.toString());
  if (!apiGoal) {
    console.log("Goal not found in API response. API returned goal IDs:", apiGoals.map(g => g.id));
    process.exit(1);
  }
  const apiSub = apiGoal.subtasks.find(s => s.id === targetSub._id.toString());
  
  console.log("\n--- 2. API Milestone ---");
  console.log("Goal ID:", apiGoal.id);
  console.log("Milestone ID:", apiSub.id);
  console.log("Completed:", apiSub.completed);
  console.log("Deadline:", apiSub.deadline);
  console.log("Lifecycle Status:", apiSub.lifecycle?.status);
  console.log("isDueToday:", apiSub.lifecycle?.isDueToday);
  console.log("isDueSoon:", apiSub.lifecycle?.isDueSoon);
  console.log("isOverdue:", apiSub.lifecycle?.isOverdue);
  console.log("DeadlineInfo Label:", apiSub.deadlineInfo?.label);
  
  await mongoose.disconnect();
}

trace().catch(console.error);
