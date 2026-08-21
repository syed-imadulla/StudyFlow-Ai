import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const FocusSessionSchema = new mongoose.Schema({}, { strict: false });
const FocusSession = mongoose.model('FocusSession', FocusSessionSchema, 'focussessions');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const sessions = await FocusSession.find({}).lean();
  const types = {};
  sessions.forEach(s => {
    types[s.type] = (types[s.type] || 0) + 1;
  });
  console.log('Session types in DB:', types);
  process.exit(0);
}
run();
