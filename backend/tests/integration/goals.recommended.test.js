import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { Goal } from '../../src/models/Goal.js';
import { User } from '../../src/models/User.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { jest } from '@jest/globals';

describe('GET /api/v1/goals/recommended', () => {
  let user;
  let token;

  beforeEach(async () => {
    user = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });
    token = generateAccessToken(user._id, user.role, user.tokenVersion || 0);

    await Goal.deleteMany({});
  });

  afterEach(async () => {
    await Goal.deleteMany({});
    await User.deleteMany({});
  });

  const setupGoals = async () => {
    const d = new Date();
    const toDateStr = (date) => date.toISOString().split('T')[0];

    const today = toDateStr(d);
    
    const dTomorrow = new Date(d);
    dTomorrow.setDate(d.getDate() + 1);
    const tomorrow = toDateStr(dTomorrow);
    
    const dYesterday = new Date(d);
    dYesterday.setDate(d.getDate() - 1);
    const yesterday = toDateStr(dYesterday);
    
    const dUpcoming = new Date(d);
    dUpcoming.setDate(d.getDate() + 5);
    const upcoming = toDateStr(dUpcoming);

    await Goal.insertMany([
      { title: 'Upcoming Goal', user: user._id, status: 'ACTIVE', deadline: upcoming },
      { title: 'Tomorrow Goal', user: user._id, status: 'ACTIVE', deadline: tomorrow },
      { title: 'Overdue Goal', user: user._id, status: 'ACTIVE', deadline: yesterday },
      { title: 'Today Goal', user: user._id, status: 'ACTIVE', deadline: today },
      { title: 'Completed Goal', user: user._id, status: 'COMPLETED', deadline: today },
      { title: 'No Deadline Goal', user: user._id, status: 'ACTIVE' },
    ]);
  };

  it('should return the correct recommendation shape and 200 status', async () => {
    await setupGoals();

    const response = await request(app)
      .get('/api/v1/goals/recommended')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { status, data } = response.body;

    // Debugging why it returned Upcoming Goal
    if (data.goal.title !== 'Overdue Goal') {
      console.log('Returned Goal:', JSON.stringify(data.goal.deadlineInfo, null, 2));
      console.log('Lifecycle:', JSON.stringify(data.goal.lifecycle, null, 2));
    }

    expect(status).toBe('success');
    expect(data).toHaveProperty('goal');
    expect(data).toHaveProperty('reason');
    expect(data).toHaveProperty('strategy');
    expect(data).toHaveProperty('strategyVersion');

    expect(data.strategyVersion).toBe('v1');
    expect(data.goal.title).toBe('Overdue Goal');
    expect(data.goal.deadlineInfo.type).toBe('OVERDUE');
    expect(data.reason).toContain('Overdue');
  });

  it('should return null goal and reason when no goals exist', async () => {
    const response = await request(app)
      .get('/api/v1/goals/recommended')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { data } = response.body;
    expect(data.goal).toBeNull();
    expect(data.reason).toBeNull();
    expect(data.strategy).toBeDefined();
    expect(data.strategyVersion).toBe('v1');
  });

  it('should return null goal when all goals are completed', async () => {
    await Goal.create({ title: 'Done', user: user._id, status: 'COMPLETED' });

    const response = await request(app)
      .get('/api/v1/goals/recommended')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const { data } = response.body;
    expect(data.goal).toBeNull();
    expect(data.reason).toBeNull();
  });

  it('should require authentication', async () => {
    await request(app)
      .get('/api/v1/goals/recommended')
      .expect(401);
  });
});
