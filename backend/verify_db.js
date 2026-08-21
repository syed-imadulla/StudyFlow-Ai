import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();
const FocusSessionSchema = new mongoose.Schema({}, { strict: false });
const FocusSession = mongoose.model('FocusSession', FocusSessionSchema, 'focussessions');
async function run() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/studyflow-ai');
  const sessions = await FocusSession.find({}).lean();
  console.log('Total sessions:', sessions.length);
  const types = {};
  const status = {};
  sessions.forEach(s => {
    types[s.type] = (types[s.type] || 0) + 1;
    status[s.status] = (status[s.status] || 0) + 1;
  });
  console.log('Types:', types);
  console.log('Status:', status);
  if (sessions.length > 0) {
    console.log('Sample session:', JSON.stringify(sessions[0], null, 2));
  }
  process.exit(0);
}
run().catch(console.error);
