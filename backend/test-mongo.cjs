const globalSetup = require('./tests/globalSetup.cjs');
const mongoose = require('mongoose');

(async () => {
  await globalSetup();
  console.log("Started Mongo:", process.env.MONGO_URI);
  
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected successfully!");
    await mongoose.disconnect();
  } catch (e) {
    console.error("Connection failed:", e);
  }
  
  const globalTeardown = require('./tests/globalTeardown.cjs');
  await globalTeardown();
  console.log("Stopped Mongo.");
})();
