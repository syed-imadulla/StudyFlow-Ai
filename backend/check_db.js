import mongoose from 'mongoose';

const FocusSession = mongoose.model('FocusSession', new mongoose.Schema({
  user: mongoose.Schema.Types.ObjectId,
  type: String,
  status: String,
  startTime: Date,
  endTime: Date,
  duration: Number,
  goalId: mongoose.Schema.Types.ObjectId,
  interruptions: Number
}, { collection: 'focussessions' }));

async function run() {
  await mongoose.connect('mongodb://127.0.0.1:27017/studyflow-ai');
  console.log('Connected to DB');
  const sessions = await FocusSession.find({});
  console.log(JSON.stringify(sessions, null, 2));
  mongoose.connection.close();
}
run().catch(console.error);
