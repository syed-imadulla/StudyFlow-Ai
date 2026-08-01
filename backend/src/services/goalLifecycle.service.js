import { GOAL_STATUS } from '../constants/index.js';

const GOAL_DUE_SOON_DAYS = 3;

/**
 * Goal Lifecycle Engine
 * Derives the lifecycle state of a goal dynamically from immutable data.
 */
export class GoalLifecycleService {
  /**
   * Calculates the full lifecycle object for a goal
   * @param {Object} goal - The goal document/object
   * @returns {Object} The computed lifecycle object
   */
  static calculate(goal) {
    const lifecycle = {
      status: 'ACTIVE',
      hasDeadline: false,
      isCompleted: !!goal.completed,
      isCompletedLate: false,
      isDueSoon: false,
      isDueToday: false,
      isOverdue: false,
      daysRemaining: null,
      overdueDays: null,
      completedEarlyBy: null,
      completedLateBy: null
    };

    if (!goal.deadline) {
      if (lifecycle.isCompleted) {
        lifecycle.status = 'COMPLETED';
      }
      return lifecycle;
    }

    lifecycle.hasDeadline = true;

    const now = new Date();
    // Parse deadline
    // handle case where deadline is ISO string vs YYYY-MM-DD
    let deadlineDateStr = goal.deadline;
    if (deadlineDateStr.includes('T')) {
      deadlineDateStr = deadlineDateStr.split('T')[0];
    }
    
    let deadlineStr = `${deadlineDateStr}T${goal.deadlineTime || '23:59:59'}`;
    const parsedDeadline = new Date(deadlineStr);
    
    // If parsing failed for some reason, fallback to active
    if (isNaN(parsedDeadline.getTime())) {
       if (lifecycle.isCompleted) {
         lifecycle.status = 'COMPLETED';
       }
       return lifecycle;
    }

    if (lifecycle.isCompleted) {
      // Use completedAt, fallback to updatedAt or now
      const completionTime = goal.completedAt ? new Date(goal.completedAt) : (goal.updatedAt ? new Date(goal.updatedAt) : new Date());
      
      const diffMs = completionTime.getTime() - parsedDeadline.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      
      if (completionTime.getTime() <= parsedDeadline.getTime()) {
        lifecycle.status = 'COMPLETED';
        lifecycle.completedEarlyBy = Math.abs(diffDays);
        lifecycle.completedLateBy = null;
      } else {
        lifecycle.status = 'COMPLETED_LATE';
        lifecycle.isCompletedLate = true;
        lifecycle.completedLateBy = diffDays;
        lifecycle.completedEarlyBy = null;
      }
      return lifecycle;
    }

    // Not completed
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    
    // To properly calculate DUE_TODAY and OVERDUE, we compare against today
    const deadlineDay = new Date(parsedDeadline);
    deadlineDay.setHours(0, 0, 0, 0);

    const timeDiffMs = deadlineDay.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiffMs / (1000 * 60 * 60 * 24));
    
    // Exact timestamp comparison for OVERDUE if it has time
    if (parsedDeadline.getTime() < now.getTime()) {
      lifecycle.status = 'OVERDUE';
      lifecycle.isOverdue = true;
      
      // Recompute overdueDays strictly based on current time
      const exactDiffMs = now.getTime() - parsedDeadline.getTime();
      lifecycle.overdueDays = Math.max(1, Math.ceil(exactDiffMs / (1000 * 60 * 60 * 24)));
      
    } else if (daysDiff === 0) {
      lifecycle.status = 'DUE_TODAY';
      lifecycle.isDueToday = true;
      lifecycle.daysRemaining = 0;
    } else if (daysDiff > 0 && daysDiff <= GOAL_DUE_SOON_DAYS) {
      lifecycle.status = 'DUE_SOON';
      lifecycle.isDueSoon = true;
      lifecycle.daysRemaining = daysDiff;
    } else {
      lifecycle.status = 'ACTIVE';
      lifecycle.daysRemaining = daysDiff;
    }

    return lifecycle;
  }
}
