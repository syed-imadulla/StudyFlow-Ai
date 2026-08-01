import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  const user = new mongoose.Types.ObjectId();
  
  const goal = new Goal({
    user,
    title: 'Test Workflow Goal',
    subtasks: [
      {
        title: 'My Subtask',
        deadline: '2026-08-05',
        completed: true,
        status: 'TODO' // This should be auto-corrected by pre-save
      }
    ]
  });
  
  await goal.save();
  const saved = await Goal.findById(goal._id).lean();
  console.log(JSON.stringify(saved.subtasks[0], null, 2));
  
  await mongoose.disconnect();
}
run().catch(console.error);
