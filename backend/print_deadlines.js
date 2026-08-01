import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  const goals = await Goal.find({});
  goals.forEach(g => {
    (g.subtasks || []).forEach(s => {
      if (!s.completed && s.deadline) {
         console.log("Goal:", g.title, "| Subtask:", s.title, "| Deadline:", s.deadline);
      }
    });
  });
  
  process.exit(0);
}
check().catch(console.error);
