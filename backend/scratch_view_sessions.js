import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const FocusSessionSchema = new mongoose.Schema({}, { strict: false });
const FocusSession = mongoose.model('FocusSession', FocusSessionSchema, 'focussessions');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sessions = await FocusSession.find({ status: 'COMPLETED' }).lean();
  console.log('Completed sessions:', sessions.length);
  sessions.slice(0, 5).forEach(s => console.log('Duration:', s.duration, 'Interruptions:', s.interruptions, 'Goal:', s.goalId, 'Type:', s.type));
  process.exit(0);
}
run();
