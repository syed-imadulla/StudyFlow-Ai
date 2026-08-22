import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Goal } from '../../src/models/Goal.js';
import { Task } from '../../src/models/Task.js';
import { Planner } from '../../src/models/Planner.js';
import { FocusSession } from '../../src/models/FocusSession.js';
import { GOAL_STATUS, TASK_STATUS, TASK_PRIORITY, FOCUS_SESSION_STATUS, FOCUS_SESSION_TYPE } from '../../src/constants/index.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

describe('Tool API Integration Tests (Phase 6.2.3 Granular Endpoints)', () => {
  let user1Token, user2Token, user1Id, user2Id;

  beforeEach(async () => {
    const user1 = await User.create({ name: 'User One', email: 'user1@example.com', password: 'password123' });
    const user2 = await User.create({ name: 'User Two', email: 'user2@example.com', password: 'password123' });
    user1Id = user1._id;
    user2Id = user2._id;
    user1Token = generateAccessToken(user1Id);
    user2Token = generateAccessToken(user2Id);
  });

  afterEach(async () => {
    await User.deleteMany({});
    await Goal.deleteMany({});
    await Task.deleteMany({});
    await Planner.deleteMany({});
    await FocusSession.deleteMany({});
  });

  describe('GET /api/v1/tools/goals/active', () => {
    it('should return unauthenticated if no token provided', async () => {
      const res = await request(app).get('/api/v1/tools/goals/active');
      expect(res.statusCode).toBe(401);
    });

    it('should enforce 10 record limit and isolate users', async () => {
      // Create 12 active goals for user 1
      for (let i = 0; i < 12; i++) {
        await Goal.create({ user: user1Id, title: `Goal ${i}`, status: GOAL_STATUS.ACTIVE });
      }
      // Create 1 active goal for user 2
      await Goal.create({ user: user2Id, title: 'User 2 Goal', status: GOAL_STATUS.ACTIVE });

      const res1 = await request(app).get('/api/v1/tools/goals/active').set('Authorization', `Bearer ${user1Token}`);
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.length).toBe(10); // Enforced limit

      const res2 = await request(app).get('/api/v1/tools/goals/active').set('Authorization', `Bearer ${user2Token}`);
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.length).toBe(1);
      expect(res2.body.data[0].title).toBe('User 2 Goal');
    });
  });

  describe('GET /api/v1/tools/tasks/today', () => {
    it('should return tasks due today with a limit of 10 and isolate users', async () => {
      const today = new Date();
      // Create 12 tasks due today for user 1
      for (let i = 0; i < 12; i++) {
        await Task.create({ user: user1Id, title: `Task ${i}`, dueDate: today, priority: TASK_PRIORITY.HIGH });
      }
      // Create 1 task due tomorrow for user 1
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      await Task.create({ user: user1Id, title: 'Tomorrow Task', dueDate: tomorrow, priority: TASK_PRIORITY.HIGH });

      // Create 1 task due today for user 2
      await Task.create({ user: user2Id, title: 'User 2 Task', dueDate: today, priority: TASK_PRIORITY.LOW });

      const res1 = await request(app).get('/api/v1/tools/tasks/today').set('Authorization', `Bearer ${user1Token}`);
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.length).toBe(10); // Limit enforced

      const res2 = await request(app).get('/api/v1/tools/tasks/today').set('Authorization', `Bearer ${user2Token}`);
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.length).toBe(1);
    });
  });

  describe('GET /api/v1/tools/planner/today', () => {
    it('should return planner events for today isolated by user', async () => {
      const today = new Date();
      await Planner.create({
        user: user1Id,
        title: 'User 1 Study',
        startTime: today.toISOString(),
        endTime: new Date(today.getTime() + 3600000).toISOString()
      });
      await Planner.create({
        user: user2Id,
        title: 'User 2 Study',
        startTime: today.toISOString(),
        endTime: new Date(today.getTime() + 3600000).toISOString()
      });

      const res1 = await request(app).get('/api/v1/tools/planner/today').set('Authorization', `Bearer ${user1Token}`);
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.length).toBe(1);
      expect(res1.body.data[0].title).toBe('User 1 Study');
    });
  });

  describe('GET /api/v1/tools/focus/recent', () => {
    it('should return recent focus sessions isolated by user', async () => {
      await FocusSession.create({
        user: user1Id,
        status: FOCUS_SESSION_STATUS.COMPLETED,
        type: FOCUS_SESSION_TYPE.POMODORO,
        duration: 1500,
        startTime: new Date()
      });

      const res1 = await request(app).get('/api/v1/tools/focus/recent').set('Authorization', `Bearer ${user1Token}`);
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.length).toBe(1);
      expect(res1.body.data[0].duration).toBe(1500);

      const res2 = await request(app).get('/api/v1/tools/focus/recent').set('Authorization', `Bearer ${user2Token}`);
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.length).toBe(0);
    });
  });
});

