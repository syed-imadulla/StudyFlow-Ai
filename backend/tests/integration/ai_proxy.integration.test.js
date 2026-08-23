import request from 'supertest';
import app from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { generateAccessToken } from '../../src/utils/jwt.js';
import { jest } from '@jest/globals';

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

describe('AI Proxy Routes Integration', () => {
  let userToken, userId;

  beforeEach(async () => {
    const user = await User.create({
      name: 'Proxy Test User',
      email: 'proxy_test@example.com',
      password: 'password123',
    });
    userId = user._id;
    userToken = generateAccessToken(userId);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/v1/agent/chat', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/v1/agent/chat').send({ prompt: 'hello' });
      expect(res.status).toBe(401);
    });

    it('should proxy authenticated request to python AI and return response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Hi there' })
      });

      const res = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ prompt: 'hello', thread_id: 'thread_123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Hi there');
      expect(global.fetch).toHaveBeenCalledWith(`${PYTHON_AI_URL}/api/v1/agent/insight`, expect.any(Object));
    });

    it('should handle python AI failure gracefully', async () => {
      jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Connection refused'));

      const res = await request(app)
        .post('/api/v1/agent/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ prompt: 'hello', thread_id: 'thread_123' });

      expect(res.status).toBe(502);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('offline or unreachable');
    });
  });

  describe('POST /api/v1/agent/action/resume', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await request(app).post('/api/v1/agent/action/resume').send({ thread_id: 'thread_123', approved: true });
      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/api/v1/agent/action/resume')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ approved: true }); // Missing thread_id
      
      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Missing');
    });

    it('should proxy resume request to python AI and return response', async () => {
      jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, message: 'Action rejected.' })
      });

      const res = await request(app)
        .post('/api/v1/agent/action/resume')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ thread_id: 'thread_123', approved: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Action rejected.');
      expect(global.fetch).toHaveBeenCalledWith(`${PYTHON_AI_URL}/api/v1/agent/action/resume`, expect.any(Object));
    });
  });
});

