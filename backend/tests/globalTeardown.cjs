module.exports = async function globalTeardown() {
  console.log('[GlobalTeardown] Stopping MongoMemoryServer...');
  const instance = global.__MONGOINSTANCE;
  if (instance) {
    await instance.stop();
    console.log('[GlobalTeardown] Stopped successfully.');
  } else {
    console.log('[GlobalTeardown] No instance found.');
  }
};
