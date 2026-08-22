import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Goal } from '../../src/models/Goal.js';
import { Task } from '../../src/models/Task.js';
import { GOAL_STATUS, TASK_STATUS, TASK_PRIORITY } from '../../src/constants/index.js';
import { generateAccessToken } from '../../src/utils/jwt.js';

describe('Tool API Integration Tests', () => {
  let user1Token, user2Token, user1Id, user2Id;

  beforeEach(async () => {
    // Setup users
    const user1 = await User.create({
      name: 'User One',
      email: 'user1@example.com',
      password: 'password123',
    });
    const user2 = await User.create({
      name: 'User Two',
      email: 'user2@example.com',
      password: 'password123',
    });
    user1Id = user1._id;
    user2Id = user2._id;

    user1Token = generateAccessToken(user1Id);
    user2Token = generateAccessToken(user2Id);
  });

  describe('GET /api/v1/tools/goals', () => {
    it('should return unauthenticated if no token provided', async () => {
      const res = await request(app).get('/api/v1/tools/goals');
      expect(res.statusCode).toBe(401);
    });

    it('should return empty goals if user has no goals', async () => {
      const res = await request(app)
        .get('/api/v1/tools/goals')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return goals for authenticated user and isolate from other users', async () => {
      await Goal.create({
        user: user1Id,
        title: 'User 1 Goal',
        status: GOAL_STATUS.IN_PROGRESS
      });
      await Goal.create({
        user: user2Id,
        title: 'User 2 Goal',
        status: GOAL_STATUS.IN_PROGRESS
      });

      const res1 = await request(app)
        .get('/api/v1/tools/goals')
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.length).toBe(1);
      expect(res1.body.data[0].title).toBe('User 1 Goal');

      const res2 = await request(app)
        .get('/api/v1/tools/goals')
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.length).toBe(1);
      expect(res2.body.data[0].title).toBe('User 2 Goal');
    });
  });

  describe('GET /api/v1/tools/tasks', () => {
    it('should return unauthenticated if no token provided', async () => {
      const res = await request(app).get('/api/v1/tools/tasks');
      expect(res.statusCode).toBe(401);
    });

    it('should return empty tasks if user has no tasks', async () => {
      const res = await request(app)
        .get('/api/v1/tools/tasks')
        .set('Authorization', `Bearer ${user1Token}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(0);
    });

    it('should return tasks for authenticated user and isolate from other users', async () => {
      await Task.create({
        user: user1Id,
        title: 'User 1 Task',
        priority: TASK_PRIORITY.HIGH
      });
      await Task.create({
        user: user2Id,
        title: 'User 2 Task',
        priority: TASK_PRIORITY.LOW
      });

      const res1 = await request(app)
        .get('/api/v1/tools/tasks')
        .set('Authorization', `Bearer ${user1Token}`);
      
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.length).toBe(1);
      expect(res1.body.data[0].title).toBe('User 1 Task');

      const res2 = await request(app)
        .get('/api/v1/tools/tasks')
        .set('Authorization', `Bearer ${user2Token}`);
      
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.length).toBe(1);
      expect(res2.body.data[0].title).toBe('User 2 Task');
    });
  });
});
