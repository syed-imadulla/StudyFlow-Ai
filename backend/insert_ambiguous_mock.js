import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function insert() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  const db = mongoose.connection.db;
  const collection = db.collection('goals');
  
  const goal = await collection.findOne({});
  const userId = goal ? goal.user : new mongoose.Types.ObjectId();
  
  await collection.insertOne({
    user: userId,
    title: "Ambiguous Milestone Test Goal",
    description: "Testing unknown format skipping",
    urgency: "ACTIVE",
    subtasks: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Ambiguous Milestone 1",
        estimate: "Sprint 1 • 1.5h",
        priority: "High",
        deadlineDisplay: "Next Week",
        completed: false
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Ambiguous Milestone 2",
        estimate: "Sprint 1 • 1.5h",
        priority: "High",
        deadlineDisplay: "ASAP",
        completed: false
      }
    ],
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date()
  });
  
  console.log("Mock ambiguous data inserted.");
  await mongoose.disconnect();
  process.exit(0);
}

insert().catch(console.error);
