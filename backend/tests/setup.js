import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

beforeAll(async () => {
  const baseUri = process.env.MONGO_URI;
  if (!baseUri) {
    throw new Error('MONGO_URI is not defined in the environment. globalSetup may have failed.');
  }
  
  const workerId = process.env.JEST_WORKER_ID || '1';
  const dbName = `test_${workerId}`;
  
  // Parse and replace the pathname to guarantee a valid URI
  const url = new URL(baseUri);
  url.pathname = `/${dbName}`;
  const mongoUri = url.toString();
  
  console.log(`[Worker ${workerId}] Connecting to ${mongoUri}`);
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  
  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 2000,
  });
});

beforeEach(async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = await mongoose.connection.db.listCollections().toArray();
    for (const collection of collections) {
      if (!collection.name.startsWith('system.')) {
        await mongoose.connection.db.collection(collection.name).deleteMany({});
      }
    }
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
});
