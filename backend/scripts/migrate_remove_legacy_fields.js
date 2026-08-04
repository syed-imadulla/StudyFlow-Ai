import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow';

async function migrate() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI}...`);
    await mongoose.connect(MONGODB_URI);
    console.log('Connected.');

    console.log('Removing legacy fields "urgency" and "finalDeadline" from all goals...');
    const result = await mongoose.connection.collection('goals').updateMany(
      {},
      { $unset: { urgency: "", finalDeadline: "" } }
    );
    
    console.log(`Migration completed. ${result.modifiedCount} documents updated.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

migrate();
