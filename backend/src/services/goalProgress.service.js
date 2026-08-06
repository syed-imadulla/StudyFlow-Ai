import { DeadlineIntelligenceService } from './deadlineIntelligence.service.js';

/**
 * Goal Progress Aggregation Engine
 * Derives the progressSummary and goalHealth from milestone lifecycles.
 */
export class GoalProgressService {
  /**
   * Calculates aggregated progress and health
   * @param {Array} milestones - Array of milestone objects (with lifecycle already attached)
   * @param {number} fallbackProgress - Existing progress logic value to use if no milestones
   * @returns {Object} { progressSummary, goalHealth }
   */
  static calculate(milestones, goalLifecycle, fallbackProgress = 0) {
    if (!milestones || milestones.length === 0) {
      let status = 'HEALTHY';
      if (goalLifecycle?.isCompleted) status = 'COMPLETED';
      else if (goalLifecycle?.isArchived) status = 'ARCHIVED';
      else if (goalLifecycle?.isOverdue) status = 'OVERDUE';
      else if (goalLifecycle?.isDueToday) status = 'DUE_TODAY';
      else if (goalLifecycle?.isDueSoon) status = 'AT_RISK';

      return {
        progressSummary: {
          totalMilestones: 0,
          completedMilestones: 0,
          activeMilestones: 0,
          dueSoonMilestones: 0,
          dueTodayMilestones: 0,
          overdueMilestones: 0,
          completedLateMilestones: 0,
          completionPercentage: fallbackProgress,
          remainingMilestones: 0,
          nextMilestone: null
        },
        goalHealth: {
          status,
          score: status === 'HEALTHY' ? 100 : (status === 'OVERDUE' ? 0 : 50)
        }
      };
    }

    let completed = 0;
    let active = 0;
    let dueSoon = 0;
    let dueToday = 0;
    let overdue = 0;
    let completedLate = 0;

    let highestPriorityMilestone = null;
    let highestPriorityScore = -1;

    // We will attach `isBlocking` to exactly one milestone later.
    let blockingMilestoneId = null;

    milestones.forEach(m => {
      if (m.completed) {
        completed++;
        if (m.lifecycle?.isCompletedLate) completedLate++;
      } else {
        const status = m.lifecycle?.status || 'ACTIVE';
        if (status === 'ACTIVE') active++;
        else if (status === 'DUE_SOON') dueSoon++;
        else if (status === 'DUE_TODAY') dueToday++;
        else if (status === 'OVERDUE') overdue++;

        // Determine next milestone priority
        // OVERDUE (4) > DUE_TODAY (3) > DUE_SOON (2) > ACTIVE (1)
        let priorityScore = 1;
        if (status === 'DUE_SOON') priorityScore = 2;
        if (status === 'DUE_TODAY') priorityScore = 3;
        if (status === 'OVERDUE') priorityScore = 4;

        if (priorityScore > highestPriorityScore) {
          highestPriorityScore = priorityScore;
          highestPriorityMilestone = m;
        } else if (priorityScore === highestPriorityScore && highestPriorityMilestone) {
           // tie-breaker: closest deadline
           if (m.lifecycle?.daysRemaining !== null && highestPriorityMilestone.lifecycle?.daysRemaining !== null) {
              if (m.lifecycle.daysRemaining < highestPriorityMilestone.lifecycle.daysRemaining) {
                 highestPriorityMilestone = m;
              }
           }
        }
      }
    });

    const total = milestones.length;
    const remaining = total - completed;
    const completionPercentage = (completed / total) * 100;

    if (highestPriorityMilestone) {
      blockingMilestoneId = highestPriorityMilestone.id || highestPriorityMilestone._id?.toString();
    }

    // Attach isBlocking and deadlineInfo to milestones
    milestones.forEach(m => {
      m.isBlocking = ((m.id || m._id?.toString()) === blockingMilestoneId) && !m.completed;
      if (m.lifecycle) {
         m.deadlineInfo = DeadlineIntelligenceService.calculate(m, m.lifecycle);
      }
    });

    let nextMilestone = null;
    if (highestPriorityMilestone) {
      nextMilestone = {
        id: highestPriorityMilestone.id || highestPriorityMilestone._id?.toString(),
        title: highestPriorityMilestone.title,
        deadline: highestPriorityMilestone.deadline,
        deadlineInfo: highestPriorityMilestone.deadlineInfo,
        lifecycle: highestPriorityMilestone.lifecycle
      };
    }

    // Goal Health Scoring Formula (Legacy, kept for backward compatibility if needed)
    let score = 100;
    score -= (overdue * 15);
    score -= (completedLate * 5);
    if (goalLifecycle?.isOverdue) score = 0;
    score = Math.max(0, Math.min(100, score));

    // Determine Health Status based on strict Hierarchy:
    // COMPLETED -> ARCHIVED -> OVERDUE -> DUE_TODAY -> AT_RISK -> HEALTHY
    let healthStatus = 'HEALTHY';
    if (goalLifecycle?.isCompleted) {
      healthStatus = 'COMPLETED';
    } else if (goalLifecycle?.isArchived) {
      healthStatus = 'ARCHIVED';
    } else if (goalLifecycle?.isOverdue) {
      healthStatus = 'OVERDUE';
    } else if (goalLifecycle?.isDueToday) {
      healthStatus = 'DUE_TODAY';
    } else if (goalLifecycle?.isDueSoon || overdue > 0) {
      healthStatus = 'AT_RISK';
    }

    return {
      progressSummary: {
        totalMilestones: total,
        completedMilestones: completed,
        activeMilestones: active,
        dueSoonMilestones: dueSoon,
        dueTodayMilestones: dueToday,
        overdueMilestones: overdue,
        completedLateMilestones: completedLate,
        completionPercentage,
        remainingMilestones: remaining,
        nextMilestone
      },
      goalHealth: {
        status: healthStatus,
        score
      }
    };
  }
}
