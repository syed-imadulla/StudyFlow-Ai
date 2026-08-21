import mongoose from 'mongoose';
import { FocusSession } from './backend/src/models/FocusSession.js';

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/studyflow', {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  const session = await FocusSession.findOne().sort({ createdAt: -1 });
  console.log("Raw session:", session);
  console.log("JSON session:", session.toJSON());
  process.exit(0);
}
test();
