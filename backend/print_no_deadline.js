import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function print() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  const db = mongoose.connection.db;
  const collection = db.collection('goals');
  
  const goals = await collection.find({}).toArray();
  for (const goal of goals) {
    if (goal.subtasks && goal.subtasks.length > 0) {
      for (const sub of goal.subtasks) {
        if (!sub.deadline) {
          console.log(`Goal: ${goal.title} | Subtask: ${sub.title}`);
          console.log(JSON.stringify(sub, null, 2));
        }
      }
    }
  }
  process.exit(0);
}
print().catch(console.error);
