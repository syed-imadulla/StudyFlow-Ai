const { MongoClient } = require('mongodb');

async function run() {
  const uri = "mongodb://localhost:27017";
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("studyflow");
    const goal = await db.collection("goals").findOne({});
    console.log(JSON.stringify(goal, null, 2));
  } finally {
    await client.close();
  }
}
run().catch(console.dir);
