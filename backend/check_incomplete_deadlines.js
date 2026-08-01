import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  const goals = await Goal.find({});
  let incompleteWithDeadline = 0;
  let incompleteWithoutDeadline = 0;
  
  goals.forEach(g => {
    (g.subtasks || []).forEach(s => {
      if (!s.completed) {
         if (s.deadline) incompleteWithDeadline++;
         else incompleteWithoutDeadline++;
      }
    });
  });
  
  console.log("Incomplete with deadline:", incompleteWithDeadline);
  console.log("Incomplete without deadline:", incompleteWithoutDeadline);
  process.exit(0);
}
check().catch(console.error);
