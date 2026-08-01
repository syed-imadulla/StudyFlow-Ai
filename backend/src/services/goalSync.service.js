import { Goal } from '../models/Goal.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS, ERROR_CODES } from '../constants/index.js';

/**
 * GoalSyncService
 * 
 * Internal domain service responsible for synchronizing state
 * between the Planner domain and the Goal domain.
 */
export class GoalSyncService {
  /**
   * Synchronize state when a planner block is scheduled for a milestone.
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   */
  static async handlePlannerScheduled(userId, goalId, milestoneId) {
    // 1. Validate Goal exists
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError(`Goal ${goalId} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    // 2. Validate Milestone exists
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) {
      throw new AppError(`Milestone ${milestoneId} not found in goal ${goalId}`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.MILESTONE_NOT_FOUND);
    }

    // 3. Verify milestone status
    if (milestone.status === 'COMPLETED') {
      throw new AppError('Cannot schedule a completed milestone', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.ALREADY_COMPLETED);
    }

    if (milestone.status === 'SCHEDULED') {
      // Idempotent: Do nothing
      return goal;
    }

    // 4. Update milestone status (TODO -> SCHEDULED)
    if (milestone.status === 'TODO' || !milestone.status) {
      milestone.status = 'SCHEDULED';
      milestone.completed = false; // Rule 1: Never change completed to true during scheduling
      
      // 5. Save Goal
      await goal.save();
      return goal;
    }
  }

  /**
   * Synchronize state when a planner block is marked as completed.
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   */
  static async handlePlannerCompleted(userId, goalId, milestoneId) {
    // 1. Validate Goal exists
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError(`Goal ${goalId} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    // 2. Validate Milestone exists
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) {
      throw new AppError(`Milestone ${milestoneId} not found in goal ${goalId}`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.MILESTONE_NOT_FOUND);
    }

    // 3. Idempotent check
    if (milestone.status === 'COMPLETED' && milestone.completed === true) {
      return goal;
    }

    // 4. Validate transition
    if (milestone.status === 'TODO' || !milestone.status) {
      throw new AppError('Cannot complete a milestone that has not been scheduled', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TRANSITION);
    }

    // 5. Update state (SCHEDULED -> COMPLETED)
    if (milestone.status === 'SCHEDULED') {
      milestone.status = 'COMPLETED';
      milestone.completed = true;

      // 6. Recalculate Goal Progress
      GoalSyncService._recalculateGoalProgress(goal);

      // 7. Save Goal
      await goal.save();
      return goal;
    }
    
    throw new AppError(`Invalid milestone status transition from ${milestone.status}`, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TRANSITION);
  }

  /**
   * Synchronize state when a planner block associated with a milestone is deleted.
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   */
  static async handlePlannerDeleted(userId, goalId, milestoneId) {
    // 1. Validate Goal exists
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError(`Goal ${goalId} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    // 2. Validate Milestone exists
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) {
      throw new AppError(`Milestone ${milestoneId} not found in goal ${goalId}`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.MILESTONE_NOT_FOUND);
    }

    // 3. Reject invalid state transitions
    if (milestone.status === 'COMPLETED' || milestone.completed === true) {
      throw new AppError('Cannot implicitly delete a planner block for a completed milestone', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TRANSITION);
    }

    if (milestone.status === 'TODO' && milestone.completed === false) {
      // Idempotent: Do nothing
      return goal;
    }

    // 4. Update state (SCHEDULED -> TODO)
    milestone.status = 'TODO';
    milestone.completed = false;

    // 5. Recalculate Goal Progress
    GoalSyncService._recalculateGoalProgress(goal);

    // 6. Save Goal
    await goal.save();
    return goal;
  }

  /**
   * Rollback state when planner completion fails.
   * Restores the milestone back to SCHEDULED and completed=false.
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   */
  static async rollbackPlannerCompleted(userId, goalId, milestoneId) {
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) return null;
    
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) return null;

    milestone.status = 'SCHEDULED';
    milestone.completed = false;

    GoalSyncService._recalculateGoalProgress(goal);
    await goal.save();
    return goal;
  }

  /**
   * Rollback state when planner deletion fails after goal sync.
   * Restores the milestone back to SCHEDULED.
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   */
  static async rollbackPlannerDeleted(userId, goalId, milestoneId) {
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) return null;
    
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) return null;

    milestone.status = 'SCHEDULED';
    milestone.completed = false;

    GoalSyncService._recalculateGoalProgress(goal);
    await goal.save();
    return goal;
  }

  /**
   * Rollback state when planner rescheduling fails.
   * Restores scheduling metadata (if it was mutated).
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   * @param {Object} originalMetadata - Original scheduling metadata
   */
  static async rollbackPlannerRescheduled(userId, goalId, milestoneId, originalMetadata = {}) {
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) return null;
    
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) return null;

    // Only revert deadline if it was mutated
    if (originalMetadata.deadline) {
      milestone.deadline = originalMetadata.deadline;
    }
    if (originalMetadata.deadlineTime !== undefined) {
      milestone.deadlineTime = originalMetadata.deadlineTime;
    }

    await goal.save();
    return goal;
  }
  /**
   * Synchronize state when a planner block is rescheduled (time/date changed).
   * 
   * @param {string} userId - User ID
   * @param {string} goalId - Goal ID
   * @param {string} milestoneId - Subtask/Milestone ID
   * @param {Object} metadata - Optional scheduling metadata
   */
  static async handlePlannerRescheduled(userId, goalId, milestoneId, metadata = {}) {
    // 1. Validate Goal exists
    const goal = await Goal.findOne({ _id: goalId, user: userId });
    if (!goal) {
      throw new AppError(`Goal ${goalId} not found`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.GOAL_NOT_FOUND);
    }

    // 2. Validate Milestone exists
    const milestone = goal.subtasks.id(milestoneId);
    if (!milestone) {
      throw new AppError(`Milestone ${milestoneId} not found in goal ${goalId}`, HTTP_STATUS.NOT_FOUND, ERROR_CODES.MILESTONE_NOT_FOUND);
    }

    // 3. Relationship validation - if the milestone is completely unscheduled
    // wait, if status is TODO, rescheduling shouldn't happen natively, but we ensure we don't mutate state.
    if (milestone.status === 'TODO' && milestone.completed === false) {
      throw new AppError('Cannot reschedule a milestone that is not scheduled', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.INVALID_TRANSITION);
    }

    // Update scheduling metadata if applicable
    if (metadata.deadline) {
      milestone.deadline = metadata.deadline;
    }
    if (metadata.deadlineTime !== undefined) {
      milestone.deadlineTime = metadata.deadlineTime;
    }

    // Note: status, completed, and goal.progress remain unchanged during rescheduling.

    // 5. Save Goal
    await goal.save();
    return goal;
  }

  /**
   * Internal helper to recalculate goal progress based on subtask completion.
   * Goal Progress must NEVER be manually edited.
   * 
   * @param {Object} goal - Goal document
   */
  static _recalculateGoalProgress(goal) {
    const total = goal.subtasks.length;
    if (total > 0) {
      const done = goal.subtasks.filter(s => s.completed).length;
      goal.progress = Math.round((done / total) * 100);
    } else {
      goal.progress = 0;
    }
  }
}
