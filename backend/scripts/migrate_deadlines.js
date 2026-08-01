import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

const DRY_RUN = process.argv.includes('--dry-run');

// Use relative date from today
const getRelativeDate = (display) => {
  if (!display) return null;
  const lower = display.toLowerCase().trim();
  const today = new Date();
  let diffDays = null;
  
  if (lower === 'today') diffDays = 0;
  else if (lower === 'tomorrow') diffDays = 1;
  else if (lower === 'yesterday' || lower === 'overdue') diffDays = -1;
  else if (lower.startsWith('in ') && lower.includes('day')) {
    const num = parseInt(lower.replace(/[^\d]/g, ''), 10);
    if (!isNaN(num)) diffDays = num;
  }
  
  if (diffDays !== null) {
    const target = new Date(today);
    target.setDate(target.getDate() + diffDays);
    return target.toISOString().split('T')[0];
  }
  return null;
};

async function migrate() {
  console.log(`Starting Migration... MODE: ${DRY_RUN ? 'DRY RUN' : 'PRODUCTION'}`);
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  const db = mongoose.connection.db;
  const collection = db.collection('goals');
  
  const goals = await collection.find({}).toArray();
  let goalsUpdated = 0;
  let milestonesUpdated = 0;
  
  let beforeSample = null;
  let afterSample = null;
  
  for (const goal of goals) {
    let modifiedGoal = false;
    
    if (goal.subtasks && goal.subtasks.length > 0) {
      for (const sub of goal.subtasks) {
        if (!sub.deadline && sub.deadlineDisplay) {
          // Do not modify completed milestones unless necessary. 
          // We will update them to ensure schema consistency.
          const newDeadline = getRelativeDate(sub.deadlineDisplay);
          
          if (newDeadline) {
            console.log(`Goal: "${goal.title}" | Subtask: "${sub.title}"`);
            console.log(`  - Migrating: '${sub.deadlineDisplay}' -> '${newDeadline}'`);
            
            if (!beforeSample) {
               beforeSample = JSON.parse(JSON.stringify(sub));
            }
            
            sub.deadline = newDeadline;
            sub.deadlineTime = null;
            delete sub.deadlineDisplay;
            
            if (!afterSample) {
               afterSample = JSON.parse(JSON.stringify(sub));
            }
            
            milestonesUpdated++;
            modifiedGoal = true;
          }
        }
      }
    }
    
    if (modifiedGoal) {
      if (!DRY_RUN) {
        await collection.updateOne({ _id: goal._id }, { $set: { subtasks: goal.subtasks } });
      }
      goalsUpdated++;
    }
  }
  
  console.log('\n--- Migration Summary ---');
  console.log(`Goals updated: ${goalsUpdated}`);
  console.log(`Milestones updated: ${milestonesUpdated}`);
  
  if (beforeSample && afterSample) {
     console.log('\n--- Before/After Sample ---');
     console.log("BEFORE:", JSON.stringify(beforeSample, null, 2));
     console.log("AFTER:", JSON.stringify(afterSample, null, 2));
  }
  
  process.exit(0);
}

migrate().catch(console.error);
