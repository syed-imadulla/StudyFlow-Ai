import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  const goals = await Goal.find({});
  let totalSubtasks = 0;
  let subtasksWithDeadline = 0;
  let subtasksWithDeadlineDisplay = 0;
  
  goals.forEach(g => {
    (g.subtasks || []).forEach(s => {
      totalSubtasks++;
      if (s.deadline) subtasksWithDeadline++;
      if (s.deadlineDisplay) subtasksWithDeadlineDisplay++;
    });
  });
  
  console.log("Total goals:", goals.length);
  console.log("Total subtasks:", totalSubtasks);
  console.log("Subtasks with deadline:", subtasksWithDeadline);
  console.log("Subtasks with deadlineDisplay:", subtasksWithDeadlineDisplay);
  process.exit(0);
}
check().catch(console.error);
