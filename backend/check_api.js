import mongoose from 'mongoose';
import dotenv from 'dotenv';
import http from 'http';
import { generateAccessToken } from './src/utils/jwt.js';

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const user = await User.findOne({});
  const token = generateAccessToken(user._id.toString(), 'user', user.tokenVersion || 0);
  
  const endpoints = ['/api/v1/analytics/summary?period=last30', '/api/v1/analytics/kpis?period=last30', '/api/v1/analytics/focus?period=last30', '/api/v1/analytics/velocity?period=last30', '/api/v1/analytics/weekly-comparison?period=last30', '/api/v1/analytics/goal-allocation?period=last30'];

  for (const endpoint of endpoints) {
    console.log(`\nFetching ${endpoint}...`);
    await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port: 5000,
        path: endpoint,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        console.log(`Status: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try { console.log(JSON.stringify(JSON.parse(data), null, 2)); }
          catch(e) { console.log(data); }
          resolve();
        });
      });
      req.on('error', reject);
      req.end();
    });
  }
  process.exit(0);
}
run().catch(console.error);
