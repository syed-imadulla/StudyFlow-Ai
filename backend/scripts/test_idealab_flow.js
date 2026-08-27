import mongoose from 'mongoose';
import { User } from '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/src/models/User.js';
import { Goal } from '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/src/models/Goal.js';
import { generateAccessToken } from '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/src/utils/jwt.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studyflow';
const PYTHON_AI_URL = 'http://127.0.0.1:8000';

async function runTest() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    let user = await User.findOne();
    if (!user) {
      user = await User.create({
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123'
      });
      console.log('Created test user');
    }

    const accessToken = generateAccessToken(user._id, user.role, user.tokenVersion || 0);
    console.log('Generated JWT token');

    const prompt = "I want to build a full-stack developer portfolio for internship applications in 14 days. I can spend 3 hours per day. I already have 3 deployed projects: an expense tracker built with React, a Node/Mongo library system, and a third JavaScript project. I want to showcase these rather than build new projects.";
    const thread_id = 'test-flow-' + Date.now();

    console.log('Submitting prompt to IdeaLab...');
    let res = await fetch(`${PYTHON_AI_URL}/api/v1/agent/insight`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt, thread_id, agent_type: 'idealab' })
    });

    let data = await res.json();
    console.log('Center Question:', data.center_question);
    console.log('Pending Action:', !!data.pending_action);
    
    if (!data.pending_action) {
      throw new Error("AI did not generate a proposal! It asked a question instead.");
    }
    
    const payload = data.pending_action.payload;
    console.log('Generated Payload Timeline:', payload.deadline);
    console.log('Generated Subtasks:', payload.subtasks.map(t => `${t.title} (${t.estimate})`));
    
    console.log('Approving proposal...');
    res = await fetch(`${PYTHON_AI_URL}/api/v1/agent/action/resume`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ thread_id, approved: true })
    });
    
    data = await res.json();
    console.log('Resume response:', data);

    console.log('Checking database for created Goal...');
    await new Promise(r => setTimeout(r, 1000));
    
    const createdGoal = await Goal.findOne({ user: user._id }).sort({ createdAt: -1 });
    if (!createdGoal) {
      throw new Error("No goal found in database!");
    }

    console.log('--- CREATED GOAL ---');
    console.log('Title:', createdGoal.title);
    console.log('Target Hours:', createdGoal.targetHours);
    console.log('Subtasks Count:', createdGoal.subtasks.length);
    createdGoal.subtasks.forEach((st, i) => {
      console.log(`  Subtask ${i+1}: ${st.title}`);
      console.log(`    Estimate: ${st.estimate}`);
      console.log(`    Deadline: ${st.deadline}`);
      console.log(`    Priority: ${st.priority}`);
    });
    
    // Cleanup
    await Goal.deleteOne({ _id: createdGoal._id });
    console.log('Cleaned up test goal.');
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

runTest();
