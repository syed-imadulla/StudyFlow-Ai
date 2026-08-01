import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studyflow')
  .then(async () => {
    const goals = await Goal.find({ 'subtasks.0': { $exists: true } });
    if (goals.length > 0) {
      console.log(JSON.stringify(goals[0].subtasks, null, 2));
    } else {
      console.log('No goals with subtasks found');
    }
    process.exit(0);
  });
