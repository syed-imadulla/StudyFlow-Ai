import mongoose from 'mongoose';
import { Planner } from './src/models/Planner.js';
import { PlannerService } from './src/services/planner.service.js';

async function run() {
  await mongoose.connect('mongodb+srv://syed_imadulla:Imad1447@cluster0.a9nfhxb.mongodb.net/?appName=Cluster0');
  
  // create dummy user
  const userId = new mongoose.Types.ObjectId();
  
  // Create master
  const master = await Planner.create({
    user: userId,
    title: 'Test Master',
    startTime: '2025-01-01T12:00:00Z',
    endTime: '2025-01-01T13:00:00Z',
    isRecurring: true,
    recurrence: { frequency: 'DAILY', interval: 1 }
  });
  
  // Create exception for Jan 2
  const newEx = await PlannerService.updateEvent(userId, master._id.toString(), {
    editScope: 'SINGLE',
    exDate: '2025-01-02',
    startTime: '2025-01-02T14:00:00Z',
    endTime: '2025-01-02T15:00:00Z'
  });
  
  // Get events for Jan 2
  const events = await PlannerService.getEventsForDate(userId, '2025-01-02');
  console.log("Events returned for Jan 2:", events.length);
  events.forEach(e => console.log(e.id, e.title, e.isException));
  
  await mongoose.disconnect();
}
run();
