import mongoose from 'mongoose';
import { User } from '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/src/models/User.js';
import { Goal } from '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/src/models/Goal.js';
import { generateAccessToken } from '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/src/utils/jwt.js';
import dotenv from 'dotenv';

dotenv.config({ path: '/home/syed-imadulla/Desktop/StudyFlow Ai/backend/.env' });

const MONGODB_URI = process.env.MONGODB_URI;

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
    
    // Simulate EXACT payload that Python sends to Node
    const aiPayload = {
      title: 'Full-Stack Developer Portfolio',
      description: 'Build a full-stack portfolio showcasing React Expense Tracker and Node Mongo Library in 14 days.',
      targetHours: 42,
      rawDump: 'I want to build a full-stack developer portfolio for internship applications in 14 days. I can spend 3 hours per day. I already have 3 deployed projects: an expense tracker built with React, a Node/Mongo library system, and a third JavaScript project.',
      ai_summary: '# Portfolio Plan\n\nShowcasing existing projects...',
      deadline: {
        mode: 'duration',
        value: 14,
        unit: 'days',
        date: null
      },
      subtasks: [
        {
          title: 'Design wireframes and structure',
          description: 'Create a simple, clean design prioritizing the 3 existing projects.',
          estimate: '4h',
          priority: 'HIGH'
        },
        {
          title: 'Develop frontend with React',
          description: 'Implement the UI and integrate the existing projects.',
          estimate: '20h',
          priority: 'HIGH'
        },
        {
          title: 'Integrate backend Node/Mongo',
          description: 'Build any necessary contact forms or dynamic data layers.',
          estimate: '10h',
          priority: 'MEDIUM'
        },
        {
          title: 'Deploy and polish',
          description: 'Deploy to Vercel/Render and optimize SEO.',
          estimate: '8h',
          priority: 'URGENT'
        }
      ]
    };

    console.log('Hitting POST /api/v1/tools/goals on Node API...');
    
    const response = await fetch('http://127.0.0.1:5000/api/v1/tools/goals', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(aiPayload)
    });
    
    const data = await response.json();
    console.log('Response Status:', response.status);
    if (response.status !== 200 && response.status !== 201) {
        console.error('Failed response:', data);
        process.exit(1);
    }
    
    console.log('Created Goal ID:', data.data.id);
    
    const createdGoal = await Goal.findById(data.data.id);
    console.log('\n--- DATABASE VERIFICATION ---');
    console.log('Title Match:', createdGoal.title === aiPayload.title);
    console.log('Target Hours:', createdGoal.targetHours);
    console.log(`Subtasks Count: ${createdGoal.subtasks.length} (Expected: 4)`);
    
    let allEstimatesPreserved = true;
    let noGenericSprints = true;
    
    createdGoal.subtasks.forEach((st, i) => {
        const original = aiPayload.subtasks[i];
        console.log(`[Task ${i+1}] ${st.title}`);
        console.log(`  - DB Estimate: ${st.estimate} | AI Estimate: ${original.estimate}`);
        console.log(`  - DB Priority: ${st.priority}`);
        
        if (st.estimate !== original.estimate) allEstimatesPreserved = false;
        if (st.estimate.includes('Sprint') || st.estimate === '1.5h') noGenericSprints = false;
    });

    console.log('\n--- FINAL ASSERTIONS ---');
    console.log(allEstimatesPreserved ? '✅ All AI estimates accurately preserved' : '❌ Backend overwrote estimates!');
    console.log(noGenericSprints ? '✅ No generic Sprint X/1.5h detected' : '❌ Generic templates detected!');
    
    // Cleanup
    await Goal.deleteOne({ _id: createdGoal._id });
    console.log('\nCleaned up database.');
    process.exit(allEstimatesPreserved && noGenericSprints ? 0 : 1);

  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

runTest();
