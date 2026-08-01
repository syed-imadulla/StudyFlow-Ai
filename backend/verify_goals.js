import mongoose from 'mongoose';
import { User } from './src/models/User.js';
import { Goal } from './src/models/Goal.js';
import { GoalService } from './src/services/goal.service.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find the first user
    const user = await User.findOne();
    if (!user) {
      console.log('No user found in DB');
      process.exit(1);
    }

    console.log(`Using user: ${user.email}`);

    // Create a goal with deadline = yesterday (OVERDUE)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Create a goal completed today but deadline was yesterday (COMPLETED_LATE)
    const today = new Date();
    
    // Create goals directly via model to bypass any validation in the service
    await Goal.deleteMany({ user: user._id });

    const overdueGoal = await Goal.create({
      user: user._id,
      title: 'Overdue Goal Test',
      deadline: yesterdayStr,
      completed: false,
      status: 'ACTIVE'
    });

    const completedLateGoal = await Goal.create({
      user: user._id,
      title: 'Completed Late Goal Test',
      deadline: yesterdayStr,
      completed: true,
      completedAt: today,
      status: 'COMPLETED'
    });

    // Fetch goals using the service (which attaches the lifecycle)
    const goals = await GoalService.getGoals(user._id);

    const output = {
      overdueGoal: goals.find(g => g.title === 'Overdue Goal Test'),
      completedLateGoal: goals.find(g => g.title === 'Completed Late Goal Test')
    };

    const outPath = path.join(process.cwd(), '../scratch_test/goals_output.json');
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

    console.log(`Successfully wrote to ${outPath}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
