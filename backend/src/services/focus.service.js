import { FocusSession } from '../models/FocusSession.js';
import { Goal } from '../models/Goal.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS, FOCUS_SESSION_TYPE, FOCUS_SESSION_STATUS, ERROR_CODES } from '../constants/index.js';
import { GoalLifecycleService } from './goalLifecycle.service.js';

export class FocusService {
  /**
   * Create a new focus session
   */
  static async createSession(userId, payload) {
    return FocusSession.create({
      ...payload,
      user: userId,
      startTime: payload.startTime ? new Date(payload.startTime) : new Date()
    });
  }

  /**
   * Get all focus sessions with sorting, filtering, and pagination
   */
  static async getSessions(userId, query = {}) {
    const filter = { user: userId };

    if (query.status && typeof query.status === 'string') {
      const upper = query.status.toUpperCase();
      if (Object.values(FOCUS_SESSION_STATUS).includes(upper)) {
        filter.status = upper;
      } else {
        filter.status = query.status;
      }
    } else if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true' || query.completed === true;
      if (isCompleted) {
        filter.status = FOCUS_SESSION_STATUS.COMPLETED;
      } else {
        filter.status = { $ne: FOCUS_SESSION_STATUS.COMPLETED };
      }
    }

    if (query.goalId) filter.goalId = query.goalId;
    if (query.taskId) filter.taskId = query.taskId;

    if (query.type && typeof query.type === 'string') {
      const upper = query.type.toUpperCase();
      if (Object.values(FOCUS_SESSION_TYPE).includes(upper)) {
        filter.type = upper;
      } else {
        filter.type = query.type;
      }
    }

    const sort = query.sort || '-startTime';
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    return FocusSession.find(filter).sort(sort).skip(skip).limit(limit);
  }

  /**
   * Get single focus session by ID
   */
  static async getSessionById(userId, sessionId) {
    const session = await FocusSession.findOne({ _id: sessionId, user: userId });
    if (!session) {
      throw new AppError('Focus session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.FOCUS_SESSION_NOT_FOUND);
    }
    return session;
  }

  /**
   * Update focus session
   */
  static async updateSession(userId, sessionId, patch = {}) {
    const session = await FocusSession.findOneAndUpdate(
      { _id: sessionId, user: userId },
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!session) {
      throw new AppError('Focus session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.FOCUS_SESSION_NOT_FOUND);
    }
    return session;
  }

  /**
   * Delete focus session
   */
  static async deleteSession(userId, sessionId) {
    const result = await FocusSession.findOneAndDelete({ _id: sessionId, user: userId });
    if (!result) {
      throw new AppError('Focus session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.FOCUS_SESSION_NOT_FOUND);
    }
  }

  // Backward compatible methods
  static async startSession(userId, payload) {
    return this.createSession(userId, payload);
  }

  static async endSession(userId, sessionId, patch = {}) {
    const session = await FocusSession.findOne({ _id: sessionId, user: userId });
    if (!session) {
      throw new AppError('Focus session not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.FOCUS_SESSION_NOT_FOUND);
    }

    session.endTime = new Date();
    if (patch.duration !== undefined) session.duration = patch.duration;
    if (patch.interruptions !== undefined) session.interruptions = patch.interruptions;
    if (patch.pauseCount !== undefined) session.pauseCount = patch.pauseCount;
    if (patch.notes !== undefined) session.notes = patch.notes;
    session.status = FOCUS_SESSION_STATUS.COMPLETED;

    await session.save();
    return session;
  }

  static async getHistory(userId, query = {}) {
    return this.getSessions(userId, query);
  }

  /**
   * Get active sprint task by inspecting top user goals for uncompleted subtasks
   */
  static async getActiveSprintTask(userId, goalIdParam, subtaskIdParam) {
    const goals = await Goal.find({ user: userId, completed: false }).sort('-createdAt');
    if (goals.length === 0) return null;

    let targetGoal = goalIdParam ? goals.find(g => g._id.toString() === goalIdParam) : goals[0];
    if (!targetGoal) targetGoal = goals[0];

    let targetSub = subtaskIdParam ? targetGoal.subtasks.id(subtaskIdParam) : targetGoal.subtasks.find(s => !s.completed);
    if (!targetSub) targetSub = targetGoal.subtasks[0];
    if (!targetSub) return null;

    return {
      id: targetSub._id.toString(),
      title: targetSub.title,
      goalTitle: targetGoal.title,
      milestone: targetSub.estimate || 'Sprint Task',
      urgency: GoalLifecycleService.calculate(targetGoal).status,
      checklist: [
        { id: 'chk-1', text: `Review requirements for ${targetSub.title}`, completed: targetSub.completed },
        { id: 'chk-2', text: 'Execute core focus steps', completed: false },
        { id: 'chk-3', text: 'Verify output against deadline', completed: false }
      ]
    };
  }

  /**
   * Get dynamic AI focus suggestion
   */
  static async getAISuggestion(userId) {
    const sessions = await FocusSession.find({ user: userId, status: FOCUS_SESSION_STATUS.COMPLETED }).sort('-startTime').limit(20);
    const count = sessions.length;
    if (count === 0) {
      return { message: 'Start your first Pomodoro sprint to allow StudyFlow AI to analyze your cognitive flow patterns.' };
    }
    const totalSec = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgMin = Math.round((totalSec / count) / 60);
    return {
      message: `You have completed ${count} focus sessions averaging ${avgMin || 25}m. Your cognitive velocity peaks during steady uninterrupted blocks.`
    };
  }

  /**
   * Get weekly distraction history formatted for UI compatibility
   */
  static async getDistractionHistory(userId) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const sessions = await FocusSession.find({ user: userId, startTime: { $gte: sevenDaysAgo } });

    // Calculate interruptions per day of week (0=Sun, 1=Mon... 6=Sat)
    const dayCounts = [0, 0, 0, 0, 0, 0, 0];
    sessions.forEach(s => {
      const dayIdx = new Date(s.startTime).getDay();
      dayCounts[dayIdx] += (s.interruptions || 0) * 10;
    });

    // Map to Monday-first array ['M', 'T', 'W', 'T', 'F', 'S', 'S']
    const values = [
      Math.min(100, dayCounts[1] || 15),
      Math.min(100, dayCounts[2] || 20),
      Math.min(100, dayCounts[3] || 10),
      Math.min(100, dayCounts[4] || 25),
      Math.min(100, dayCounts[5] || 15),
      Math.min(100, dayCounts[6] || 10),
      Math.min(100, dayCounts[0] || 5)
    ];

    const currentDay = now.getDay(); // 0=Sun, 1=Mon...
    const activeDay = currentDay === 0 ? 6 : currentDay - 1;

    return {
      days: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
      values,
      activeDay
    };
  }
}
