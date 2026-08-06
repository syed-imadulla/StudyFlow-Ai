import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function insert() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  const db = mongoose.connection.db;
  const collection = db.collection('goals');
  
  // Find a user ID
  const goal = await collection.findOne({});
  const userId = goal ? goal.user : new mongoose.Types.ObjectId();
  
  await collection.insertOne({
    user: userId,
    title: "Legacy Milestone Test Goal",
    description: "Testing migration",
    urgency: "ACTIVE",
    subtasks: [
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Complete Milestone 1",
        estimate: "Sprint 1 • 1.5h",
        priority: "HIGH",
        deadlineDisplay: "Tomorrow",
        completed: false
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Complete Milestone 2",
        estimate: "Sprint 1 • 1.5h",
        priority: "MEDIUM",
        deadlineDisplay: "In 7 days",
        completed: false
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Complete Milestone 3",
        estimate: "Sprint 1 • 1.5h",
        priority: "LOW",
        deadlineDisplay: "Yesterday",
        completed: true
      },
      {
        _id: new mongoose.Types.ObjectId(),
        title: "Complete Milestone 4",
        estimate: "Sprint 1 • 1.5h",
        priority: "HIGH",
        deadlineDisplay: "Today",
        completed: false
      }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  console.log("Mock legacy data inserted.");
  process.exit(0);
}

insert().catch(console.error);
