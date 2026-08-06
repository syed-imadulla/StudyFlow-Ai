import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const updatePriorities = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studyflow');
    console.log('Connected to MongoDB.');

    const db = mongoose.connection.db;
    const goalsCollection = db.collection('goals');
    
    // Find goals that have subtasks with lowercase/mixed-case priorities
    const goals = await goalsCollection.find({
      'subtasks.priority': { $in: ['Low', 'Medium', 'High'] }
    }).toArray();

    if (goals.length === 0) {
      console.log('No goals found requiring priority migration.');
    } else {
      console.log(`Found ${goals.length} goals requiring priority migration. Updating...`);
      
      let updatedCount = 0;
      for (const goal of goals) {
        const updatedSubtasks = goal.subtasks.map(sub => {
          if (['Low', 'Medium', 'High'].includes(sub.priority)) {
            return { ...sub, priority: sub.priority.toUpperCase() };
          }
          return sub;
        });

        await goalsCollection.updateOne(
          { _id: goal._id },
          { $set: { subtasks: updatedSubtasks } }
        );
        updatedCount++;
      }
      
      console.log(`Successfully updated ${updatedCount} goals.`);
    }

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

updatePriorities();
