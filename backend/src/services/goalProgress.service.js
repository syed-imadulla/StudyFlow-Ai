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
  static calculate(milestones, fallbackProgress = 0) {
    if (!milestones || milestones.length === 0) {
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
          status: 'HEALTHY',
          score: 100
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

    // Goal Health Scoring Formula
    // Base 100
    // -15 per overdue milestone
    // -5 per completed late milestone
    // +5 per completed early milestone (not currently tracked at goalProgress level, but let's see if we can derive it)
    let score = 100;
    score -= (overdue * 15);
    score -= (completedLate * 5);
    
    // Additional minus if nextMilestone is overdue (already counted, but we can just use the counts)
    
    score = Math.max(0, Math.min(100, score));

    let healthStatus = 'HEALTHY';
    if (score >= 90) healthStatus = 'HEALTHY';
    else if (score >= 70) healthStatus = 'NEEDS_ATTENTION';
    else if (score >= 40) healthStatus = 'AT_RISK';
    else healthStatus = 'CRITICAL';

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
