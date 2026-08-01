import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { GoalService } from './src/services/goal.service.js';
import { Goal } from './src/models/Goal.js';
import { DeadlineIntelligenceService } from './src/services/deadlineIntelligence.service.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  const userId = new mongoose.Types.ObjectId();
  
  const payload = {
    title: 'New AI Goal Integration Test',
    urgency: 'ACTIVE',
    description: 'Testing the new backend milestone generation',
    deadline: { mode: 'DURATION', value: 7, unit: 'days' },
    rawDump: "Milestone A\nMilestone B"
  };

  const createdGoal = await GoalService.createGoal(userId, payload);
  
  const dbGoal = await Goal.findById(createdGoal._id).lean();
  console.log("=== MONGODB DOCUMENT ===");
  console.log(JSON.stringify(dbGoal.subtasks, null, 2));

  console.log("\n=== API RESPONSE ===");
  console.log(JSON.stringify(createdGoal.subtasks, null, 2));

  await mongoose.disconnect();
}
run().catch(console.error);
