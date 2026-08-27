import { Goal } from '../models/Goal.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS, GOAL_STATUS, ERROR_CODES } from '../constants/index.js';
import { logger } from '../utils/logger.js';
import { PlannerService } from './planner.service.js';
import { GoalLifecycleService } from './goalLifecycle.service.js';
import { MilestoneLifecycleService } from './milestoneLifecycle.service.js';
import { GoalProgressService } from './goalProgress.service.js';
import { DeadlineIntelligenceService } from './deadlineIntelligence.service.js';
import { GoalRecommendationService } from './goalRecommendation.service.js';

/**
 * Helper to compute dynamic progress from subtasks
 */
const attachDynamicProgress = (goalDoc) => {
  if (!goalDoc) return null;
  const goal = goalDoc.toJSON ? goalDoc.toJSON() : { ...goalDoc };
  
  // Backwards compatible fallback progress
  const total = goal.subtasks?.length || 0;
  const done = goal.subtasks?.filter(s => s.completed).length || 0;
  const fallbackProgress = total > 0 ? Math.round((done / total) * 100) : (goal.completed ? 100 : 0);
  
  if (goal.subtasks && goal.subtasks.length > 0) {
    goal.subtasks.forEach(subtask => {
      subtask.lifecycle = MilestoneLifecycleService.calculate(subtask);
    });
  }

  goal.lifecycle = GoalLifecycleService.calculate(goal);
  goal.deadlineInfo = DeadlineIntelligenceService.calculate(goal, goal.lifecycle);

  const { progressSummary, goalHealth } = GoalProgressService.calculate(goal.subtasks || [], goal.lifecycle, fallbackProgress);
  goal.progressSummary = progressSummary;
  goal.goalHealth = goalHealth;
  goal.progress = progressSummary.completionPercentage;

  return goal;
};

/**
 * Process the structured deadline request object into persistence fields
 */
const processDeadline = (data) => {
  if (data.deadline && typeof data.deadline === 'object') {
    const { mode: rawMode, date, time, value, unit } = data.deadline;
    const mode = String(rawMode).toUpperCase();
    
    if (mode === 'NONE') {
      data.deadline = null;
      data.deadlineTime = null;
    } else if (mode === 'SPECIFIC_DATE') {
      data.deadline = date;
      data.deadlineTime = time || null;
    } else if (mode === 'DURATION') {
      const targetDate = new Date();
      
      if (unit === 'days') {
        targetDate.setDate(targetDate.getDate() + value);
      } else if (unit === 'weeks') {
        targetDate.setDate(targetDate.getDate() + (value * 7));
      } else if (unit === 'months') {
        targetDate.setMonth(targetDate.getMonth() + value);
      }
      
      const yyyy = targetDate.getFullYear();
      const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(targetDate.getDate()).padStart(2, '0');
      
      data.deadline = `${yyyy}-${mm}-${dd}`;
      data.deadlineTime = null;
    }
  }
  return data;
};

export class GoalService {
  /**
   * Fetch all goals belonging to user with sorting, filtering, and pagination
   */
  static async getGoals(userId, query = {}) {
    const filter = { user: userId };
    if (query.urgency) filter.urgency = query.urgency;
    if (query.status) filter.status = query.status.toUpperCase();
    if (query.completed !== undefined) {
      const isCompleted = query.completed === 'true' || query.completed === true;
      if (isCompleted) {
        filter.status = GOAL_STATUS.COMPLETED;
      } else {
        filter.status = { $ne: GOAL_STATUS.COMPLETED };
      }
    }
    
    if (query.archived !== undefined) {
      filter.archived = query.archived === 'true' || query.archived === true;
    }

    const sort = query.sort || '-createdAt';
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const goals = await Goal.find(filter).sort(sort).skip(skip).limit(limit);
    return goals.map(attachDynamicProgress);
  }

  /**
   * Returns the recommended active goal for the current user.
   *
   * Delegates to GoalRecommendationService which owns the selection algorithm.
   * Enriches each goal DTO once via getGoals(), then passes the collection
   * to the recommendation service — no duplicate DTO generation or progress
   * recalculation occurs.
   *
   * Returns an enriched object: { goal, reason, strategy, strategyVersion }
   * so the API response is self-describing and future-proof.
   *
   * @param {string} userId
   * @returns {Promise<{ goal: Object|null, reason: string|null, strategy: string }>}
   */
  static async getRecommendedGoal(userId) {
    const allGoals = await GoalService.getGoals(userId);
    return GoalRecommendationService.selectRecommendation(allGoals);
  }

  /**
   * Get single goal by ID
   */
  static async getGoalById(userId, goalId) {
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError('Goal not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }
    return attachDynamicProgress(goal);
  }

  /**
   * Create new goal
   */
  static async createGoal(userId, payload) {
    let data = { ...payload };
    
    // Server-side AI Milestone Breakdown
    if (data.subtasks && Array.isArray(data.subtasks) && data.subtasks.length > 0) {
      let totalDays = 7;
      if (data.deadline && typeof data.deadline === 'object') {
        const { mode, date, value, unit } = data.deadline;
        const uMode = mode ? String(mode).toUpperCase() : '';
        if (uMode === 'DURATION') {
          totalDays = value || 7;
          if (unit === 'weeks') totalDays *= 7;
          if (unit === 'months') totalDays *= 30;
        } else if (mode === 'SPECIFIC_DATE' && date) {
          const ms = new Date(date) - new Date();
          totalDays = Math.max(1, Math.round(ms / 86400000));
        }
      }

      data.subtasks = data.subtasks.map((task, idx) => {
        const stepDays = Math.max(1, Math.round(((idx + 1) / data.subtasks.length) * totalDays));
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + stepDays);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        
        return {
          title: task.title || `Task ${idx + 1}`,
          description: task.description || '',
          estimate: task.estimate || `Sprint ${idx + 1} • 1.5h`,
          priority: task.priority || 'MEDIUM',
          deadline: task.deadline || `${yyyy}-${mm}-${dd}`,
          deadlineTime: task.deadlineTime || null,
          completed: false,
          status: 'TODO'
        };
      });
      delete data.rawDump;
    } else if (data.rawDump) {
      let totalDays = 7;
      if (data.deadline && typeof data.deadline === 'object') {
        const { mode, date, value, unit } = data.deadline;
        const uMode = mode ? String(mode).toUpperCase() : '';
        if (uMode === 'DURATION') {
          totalDays = value || 7;
          if (unit === 'weeks') totalDays *= 7;
          if (unit === 'months') totalDays *= 30;
        } else if (mode === 'SPECIFIC_DATE' && date) {
          const ms = new Date(date) - new Date();
          totalDays = Math.max(1, Math.round(ms / 86400000));
        }
      }

      let lines = data.rawDump.split('\n').map(l => l.replace(/^[-*•\d.]+\s*/, '').trim()).filter(Boolean);
      if (lines.length === 0) {
        lines = ['Complete Milestone 1', 'Complete Milestone 2', 'Final Review'];
      }

      const priorities = ['HIGH', 'HIGH', 'MEDIUM', 'LOW'];
      data.subtasks = lines.map((line, idx) => {
        const stepDays = Math.max(1, Math.round(((idx + 1) / lines.length) * totalDays));
        
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + stepDays);
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        
        return {
          title: line,
          estimate: `Sprint ${idx + 1} • 1.5h`,
          priority: priorities[idx % priorities.length],
          deadline: `${yyyy}-${mm}-${dd}`,
          deadlineTime: null,
          completed: false,
          status: 'TODO'
        };
      });
      delete data.rawDump;
    }

    data = processDeadline(data);
    if (data.status && typeof data.status === 'string') {
      data.status = data.status.toUpperCase().trim();
    }
    if (data.completed === true || data.completed === 'true' || data.urgency === 'COMPLETED') {
      data.status = GOAL_STATUS.COMPLETED;
      data.completed = true;
      data.completedAt = new Date();
    } else if (data.status === GOAL_STATUS.COMPLETED) {
      data.completed = true;
      data.completedAt = new Date();
    }

    const goal = await Goal.create({
      ...data,
      user: userId
    });
    return attachDynamicProgress(goal);
  }

  /**
   * Update existing goal
   */
  static async updateGoal(userId, goalId, patch) {
    let data = { ...patch };
    data = processDeadline(data);
    if (data.status && typeof data.status === 'string') {
      data.status = data.status.toUpperCase().trim();
    }
    if (data.completed === true || data.completed === 'true' || data.urgency === 'COMPLETED') {
      data.status = GOAL_STATUS.COMPLETED;
      data.completed = true;
      if (!data.completedAt) data.completedAt = new Date();
    } else if (data.status === GOAL_STATUS.COMPLETED) {
      data.completed = true;
      if (!data.completedAt) data.completedAt = new Date();
    } else if (data.completed === false || data.completed === 'false') {
      if (!data.status) data.status = GOAL_STATUS.ACTIVE;
      data.completedAt = null;
    }

    if (data.archived === true || data.archived === 'true') {
      data.archived = true;
      if (!data.archivedAt) data.archivedAt = new Date();
      data.status = GOAL_STATUS.COMPLETED;
      data.completed = true;
      if (!data.completedAt) data.completedAt = new Date();
    } else if (data.archived === false || data.archived === 'false') {
      data.archived = false;
      data.archivedAt = null;
    }

    const goal = await Goal.findOneAndUpdate(
      { _id: goalId, user: userId },
      { $set: data },
      { new: true, runValidators: true }
    );
    if (!goal) {
      throw new AppError('Goal not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    const needsLifecycleRecalc = 
      'deadline' in data || 
      'deadlineTime' in data || 
      'subtasks' in data || 
      'completed' in data || 
      'status' in data || 
      'archived' in data;

    if (needsLifecycleRecalc) {
      return attachDynamicProgress(goal);
    } else {
      return goal.toJSON ? goal.toJSON() : goal;
    }
  }

  /**
   * Delete goal
   */
  static async deleteGoal(userId, goalId) {
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError('Goal not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    let deletedBlocks = [];
    try {
      // Clean up associated Planner blocks first
      deletedBlocks = await PlannerService.deleteEventsByGoalId(userId, goalId);

      // Delete the Goal itself
      await Goal.deleteOne({ _id: goalId, user: userId });
    } catch (error) {
      // If anything fails, rollback any deleted planner blocks
      if (deletedBlocks && deletedBlocks.length > 0) {
        try {
          await PlannerService.restoreEvents(deletedBlocks);
        } catch (rollbackError) {
          logger.error(rollbackError, '[GoalService] Rollback of planner blocks failed');
        }
      }
      throw error;
    }
  }

  /**
   * Toggle completion status of a specific subtask inside a goal
   */
  static async toggleSubtask(userId, goalId, subtaskId, completedStatus) {
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError('Goal not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    const subtask = goal.subtasks.id(subtaskId);
    if (!subtask) {
      throw new AppError('Subtask not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.MILESTONE_NOT_FOUND);
    }

    subtask.completed = completedStatus !== undefined ? completedStatus : !subtask.completed;
    
    // Check if all subtasks are completed to update goal status
    const allCompleted = goal.subtasks.length > 0 && goal.subtasks.every(s => s.completed);
    if (allCompleted) {
      goal.status = GOAL_STATUS.COMPLETED;
      goal.completed = true;
      if (!goal.completedAt) goal.completedAt = new Date();
    } else {
      if (goal.completed) {
         goal.status = GOAL_STATUS.ACTIVE;
         goal.completed = false;
         goal.completedAt = null;
      }
    }

    await goal.save();

    return attachDynamicProgress(goal);
  }

  /**
   * Bulk save or overwrite user goals (used by frontend drag/drop reordering)
   */
  static async bulkSaveGoals(userId, goalsArray) {
    if (!Array.isArray(goalsArray)) {
      throw new AppError('Payload must be an array of goals', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.BAD_REQUEST);
    }

    // Delete existing and replace with new array while maintaining ownership
    await Goal.deleteMany({ user: userId });
    const formatted = goalsArray.map(g => {
      const isCompleted = (g.completed || g.status === 'COMPLETED' || g.urgency === 'COMPLETED');
      return {
        ...g,
        user: userId,
        status: isCompleted ? GOAL_STATUS.COMPLETED : (g.status ? g.status.toUpperCase() : GOAL_STATUS.ACTIVE),
        completed: isCompleted,
        completedAt: isCompleted ? (g.completedAt || new Date()) : null
      };
    });

    if (formatted.length > 0) {
      await Goal.insertMany(formatted);
    }

    return this.getGoals(userId);
  }
}
