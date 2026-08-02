const { MongoClient } = require('mongodb');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("test");
    const goal = await db.collection("goals").findOne({ "subtasks.0": { $exists: true } });
    if(goal) {
      goal.subtasks.forEach((sub, idx) => {
         sub.deadline = `2026-08-0${idx + 2}`;
      });
      await db.collection("goals").updateOne({ _id: goal._id }, { $set: { subtasks: goal.subtasks } });
      console.log("Updated subtasks in MongoDB. Document:");
      const updatedGoal = await db.collection("goals").findOne({ _id: goal._id });
      console.log(JSON.stringify(updatedGoal.subtasks, null, 2));
    }
  } finally {
    await client.close();
  }
}
run().catch(console.dir);