/**
 * Core Lifecycle Algorithm
 * Derives lifecycle state generically from factual entity data.
 */
const GOAL_DUE_SOON_DAYS = 3;

export class LifecycleEngine {
  /**
   * Calculates the full lifecycle object for any entity with factual date constraints.
   * @param {Object} entity - The factual entity
   * @param {string} [entity.deadline] - 'YYYY-MM-DD'
   * @param {string} [entity.deadlineTime] - 'HH:MM'
   * @param {boolean} [entity.completed] - is the entity completed
   * @param {Date|string} [entity.completedAt] - when was it completed
   * @param {Date|string} [entity.updatedAt] - fallback timestamp
   * @returns {Object} The computed lifecycle object
   */
  static calculate(entity) {
    const lifecycle = {
      status: 'ACTIVE',
      hasDeadline: false,
      isCompleted: !!entity.completed,
      isCompletedLate: false,
      isDueSoon: false,
      isDueToday: false,
      isOverdue: false,
      isArchived: false,
      daysRemaining: null,
      overdueDays: null,
      completedEarlyBy: null,
      completedLateBy: null
    };

    if (!entity.deadline) {
      if (lifecycle.isCompleted) {
        lifecycle.status = 'COMPLETED';
        if (entity.archived) {
          lifecycle.isArchived = true;
        }
      }
      return lifecycle;
    }

    lifecycle.hasDeadline = true;

    const now = new Date();
    
    // Parse deadline
    let deadlineDateStr = entity.deadline;
    if (deadlineDateStr.includes('T')) {
      deadlineDateStr = deadlineDateStr.split('T')[0];
    }
    
    let deadlineStr = `${deadlineDateStr}T${entity.deadlineTime || '23:59:59'}`;
    const parsedDeadline = new Date(deadlineStr);
    
    // If parsing failed for some reason, fallback to active
    if (isNaN(parsedDeadline.getTime())) {
       if (lifecycle.isCompleted) {
         lifecycle.status = 'COMPLETED';
         if (entity.archived) {
           lifecycle.isArchived = true;
         }
       }
       return lifecycle;
    }

    if (lifecycle.isCompleted) {
      // Use completedAt, fallback to updatedAt or now
      const completionTime = entity.completedAt ? new Date(entity.completedAt) : (entity.updatedAt ? new Date(entity.updatedAt) : new Date());
      
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
      
      if (entity.archived) {
        lifecycle.isArchived = true;
      }
      return lifecycle;
    }

    // Not completed
    const today = new Date();
    today.setHours(0, 0, 0, 0); // start of today
    
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
