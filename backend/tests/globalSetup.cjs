const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async function globalSetup() {
  console.log('[GlobalSetup] Starting MongoMemoryServer...');
  const instance = await MongoMemoryServer.create();
  const uri = instance.getUri();
  
  global.__MONGOINSTANCE = instance;
  process.env.MONGO_URI = uri;
  console.log(`[GlobalSetup] MongoMemoryServer started at ${uri}`);
};
