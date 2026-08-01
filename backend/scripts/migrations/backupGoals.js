import mongoose from 'mongoose';
import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function backup() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const collection = db.collection('goals');
  
  const goals = await collection.find({}).toArray();
  const backupPath = path.join(process.cwd(), 'backend', 'backups', `goals_backup_${new Date().toISOString().replace(/:/g, '-')}.json`);
  
  fs.mkdirSync(path.join(process.cwd(), 'backend', 'backups'), { recursive: true });
  fs.writeFileSync(backupPath, JSON.stringify(goals, null, 2));
  
  console.log(`Backup completed successfully. Saved to: ${backupPath}`);
  console.log(`Total goals backed up: ${goals.length}`);
  
  await mongoose.disconnect();
  process.exit(0);
}

backup().catch(console.error);
