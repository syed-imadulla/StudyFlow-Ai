import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../src/app.js';
import { User } from '../../src/models/User.js';
import { Goal } from '../../src/models/Goal.js';
import { Planner } from '../../src/models/Planner.js';
import { FocusSession } from '../../src/models/FocusSession.js';
import { FOCUS_SESSION_STATUS, ERROR_CODES } from '../../src/constants/index.js';
import { generateAccessToken } from '../../src/utils/jwt.js';



if (process.env.NODE_ENV !== 'test') {
  throw new Error('SAFETY GUARD: Refusing to run tests outside of test environment. Ensure NODE_ENV=test.');
}

describe('Focus API Integration Tests', () => {
  let token;
  let userId;
  let testSessionIds = [];

  beforeEach(async () => {
    // Create an isolated test user before each test, as setup.js wipes DB
    const testEmail = `test_focus_${Date.now()}_${Math.random()}@example.test`;
    const user = await User.create({
      name: 'Focus API Test User',
      email: testEmail,
      password: 'password123'
    });
    userId = user._id;
    token = generateAccessToken(user._id, 'USER', 0);
  });



  describe('Focus Session ID validation', () => {
    test('does not validate an ID for /start', async () => {
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() });

      expect(response.status).not.toBe(400);
      expect(response.body?.error?.message).not.toBe('Invalid Focus Session ID format');
    });

    test('rejects malformed IDs only on ID-based endpoints', async () => {
      const response = await request(app)
        .post('/api/v1/focus/not-a-valid-id/pause')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error.message).toMatch(/Invalid Focus Session ID format/i);
    });
  });

  describe('POST /api/v1/focus/start', () => {
    test('starts a session without requiring a Focus Session ID', async () => {
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() });

      expect(response.status).toBe(201);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.status).toBe(FOCUS_SESSION_STATUS.IN_PROGRESS);
      expect(response.body.data._id).toBeDefined();
    });

    test('rejects a second active session without modifying the first', async () => {
      await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() });

      const second = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() });

      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('ERR_DUPLICATE_ACTIVE_SESSION');

      const active = await request(app)
        .get('/api/v1/focus/active')
        .set('Authorization', `Bearer ${token}`);

      expect(active.body.data.status).toBe(FOCUS_SESSION_STATUS.IN_PROGRESS);
    });
  });

  describe('Lifecycle operations', () => {
    let activeSessionId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() });
      activeSessionId = res.body.data._id;
    });

    test('PAUSE - valid ID pauses session', async () => {
      const res = await request(app)
        .post(`/api/v1/focus/${activeSessionId}/pause`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
        
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(FOCUS_SESSION_STATUS.PAUSED);
      expect(res.body.data.lastPausedAt).toBeDefined();
      expect(res.body.data.pauseCount).toBe(1);
    });

    test('RESUME - valid ID resumes session', async () => {
      // Pause it first
      await request(app).post(`/api/v1/focus/${activeSessionId}/pause`).set('Authorization', `Bearer ${token}`).send({});
      
      // Wait a moment so duration accumulates
      await new Promise(r => setTimeout(r, 150));
      const res = await request(app)
        .post(`/api/v1/focus/${activeSessionId}/resume`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
        
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(FOCUS_SESSION_STATUS.IN_PROGRESS);
      expect(res.body.data.totalPausedTime).toBeGreaterThanOrEqual(0);
    });

    test('COMPLETE - valid ID completes session', async () => {
      const res = await request(app)
        .post(`/api/v1/focus/${activeSessionId}/complete`)
        .set('Authorization', `Bearer ${token}`)
        .send({ notes: 'Test completion' });
        
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(FOCUS_SESSION_STATUS.COMPLETED);
      expect(res.body.data.endTime).toBeDefined();
      expect(res.body.data.duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ABORT and Invalid Transitions', () => {
    let sessionToAbort;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() });
      sessionToAbort = res.body.data._id;
    });

    test('ABORT - valid ID aborts session', async () => {
      const res = await request(app)
        .post(`/api/v1/focus/${sessionToAbort}/abort`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
        
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe(FOCUS_SESSION_STATUS.ABORTED);
    });

    test('COMPLETED cannot pause', async () => {
      await request(app).post(`/api/v1/focus/${sessionToAbort}/complete`).set('Authorization', `Bearer ${token}`).send({});
      const res = await request(app)
        .post(`/api/v1/focus/${sessionToAbort}/pause`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400); // Invalid transition
    });

    test('ABORTED cannot resume', async () => {
      const res = await request(app)
        .post(`/api/v1/focus/${sessionToAbort}/resume`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Invalid IDs', () => {
    test('Valid but nonexistent ID returns 404', async () => {
      const randomId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post(`/api/v1/focus/${randomId}/pause`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Free Focus', () => {
    test('start without goalId and taskId', async () => {
      const res = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({ startTime: new Date().toISOString() }); // goalId and taskId omitted
        
      expect(res.status).toBe(201);
      
      const abortRes = await request(app)
        .post(`/api/v1/focus/${res.body.data._id}/abort`)
        .set('Authorization', `Bearer ${token}`);
      expect(abortRes.status).toBe(200);
    });
  });

  describe('Phase 3.2 Goal & Milestone Validation', () => {
    let testGoal;
    
    beforeEach(async () => {
      // Create a test goal with a milestone
      testGoal = await Goal.create({
        user: userId,
        title: 'Phase 3.2 Test Goal',
        subtasks: [
          { title: 'Test Milestone' }
        ]
      });
    });

    test('TEST 1: Start Goal Focus (valid goalId, milestoneId null)', async () => {
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalId: testGoal._id.toString(),
          milestoneId: null,
          startTime: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.data.goalId).toBe(testGoal._id.toString());
      expect(response.body.data.milestoneId).toBe(null);
    });

    test('TEST 2: Start Milestone Focus (valid goalId, valid milestoneId)', async () => {
      const milestoneId = testGoal.subtasks[0]._id.toString();
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalId: testGoal._id.toString(),
          milestoneId: milestoneId,
          startTime: new Date().toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.data.goalId).toBe(testGoal._id.toString());
      expect(response.body.data.milestoneId).toBe(milestoneId);
    });

    test('TEST 3: Invalid milestone for valid Goal', async () => {
      const randomMilestoneId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalId: testGoal._id.toString(),
          milestoneId: randomMilestoneId,
          startTime: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ERR_MILESTONE_NOT_FOUND');
    });

    test('TEST 4: Milestone belonging to another Goal', async () => {
      const anotherGoal = await Goal.create({
        user: userId,
        title: 'Another Goal',
        subtasks: [{ title: 'Another Milestone' }]
      });
      const anotherMilestoneId = anotherGoal.subtasks[0]._id.toString();

      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalId: testGoal._id.toString(),
          milestoneId: anotherMilestoneId,
          startTime: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ERR_MILESTONE_NOT_FOUND');
    });

    test('TEST 5: Goal belonging to another user', async () => {
      const anotherUser = await User.create({
        name: 'Another User',
        email: 'another@example.test',
        password: 'password'
      });
      const anotherGoal = await Goal.create({
        user: anotherUser._id,
        title: 'Another User Goal',
        subtasks: []
      });

      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          goalId: anotherGoal._id.toString(),
          startTime: new Date().toISOString()
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ERR_GOAL_NOT_FOUND');
    });
    
    test('TEST 6: milestoneId without goalId is rejected', async () => {
      const milestoneId = testGoal.subtasks[0]._id.toString();
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          milestoneId: milestoneId,
          startTime: new Date().toISOString()
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ERR_INVALID_PAYLOAD');
    });
  });

  describe('Phase 3.3 Planner to Focus Integration', () => {
    let testGoal, testPlanner, genericPlanner;
    
    beforeEach(async () => {
      testGoal = await Goal.create({
        user: userId,
        title: 'Phase 3.3 Goal',
        subtasks: [{ title: 'P3.3 Milestone' }]
      });
      
      testPlanner = await Planner.create({
        user: userId,
        title: 'Planner with Goal',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'STUDY',
        goalId: testGoal._id,
        milestoneId: testGoal.subtasks[0]._id
      });
      
      genericPlanner = await Planner.create({
        user: userId,
        title: 'Generic Planner',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'STUDY'
      });
    });

    test('TEST 1: Valid Planner Focus (plannerId + goalId + milestoneId)', async () => {
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          plannerId: testPlanner._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.data.plannerId).toBe(testPlanner._id.toString());
      expect(response.body.data.goalId).toBe(testGoal._id.toString());
      expect(response.body.data.milestoneId).toBe(testGoal.subtasks[0]._id.toString());
    });

    test('TEST 2: Valid generic Planner (plannerId only)', async () => {
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          plannerId: genericPlanner._id.toString()
        });

      expect(response.status).toBe(201);
      expect(response.body.data.plannerId).toBe(genericPlanner._id.toString());
      expect(response.body.data.goalId).toBeNull();
      expect(response.body.data.milestoneId).toBeNull();
    });

    test('TEST 3: Planner A + Malicious Goal B inherits Planner A relationships', async () => {
      const fakeGoalId = new mongoose.Types.ObjectId().toString();
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          plannerId: testPlanner._id.toString(),
          goalId: fakeGoalId
        });

      expect(response.status).toBe(201);
      expect(response.body.data.goalId).toBe(testGoal._id.toString());
      expect(response.body.data.goalId).not.toBe(fakeGoalId);
    });

    test('TEST 4: Planner belonging to another user returns 404', async () => {
      const anotherUser = await User.create({
        name: 'Another User 33',
        email: 'another33@example.test',
        password: 'password'
      });
      const anotherPlanner = await Planner.create({
        user: anotherUser._id,
        title: 'Other Planner',
        startTime: new Date(),
        endTime: new Date(Date.now() + 3600000),
        type: 'STUDY'
      });

      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          plannerId: anotherPlanner._id.toString()
        });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe('ERR_PLANNER_NOT_FOUND');
    });
    
    test('TEST 5: Invalid plannerId format returns validation error', async () => {
      const response = await request(app)
        .post('/api/v1/focus/start')
        .set('Authorization', `Bearer ${token}`)
        .send({
          plannerId: 'invalid-id'
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('ERR_VALIDATION');
    });
  });
});
