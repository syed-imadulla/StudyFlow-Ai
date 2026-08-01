const LABELS = {
  TODAY: "Today",
  TOMORROW: "Tomorrow",
  YESTERDAY: "Yesterday",
  NO_DEADLINE: "No deadline",
  COMPLETED_TODAY: "Completed today"
};

const TYPES = {
  NO_DEADLINE: "NO_DEADLINE",
  TODAY: "TODAY",
  TOMORROW: "TOMORROW",
  UPCOMING: "UPCOMING",
  OVERDUE: "OVERDUE",
  COMPLETED_TODAY: "COMPLETED_TODAY",
  COMPLETED_EARLY: "COMPLETED_EARLY",
  COMPLETED_LATE: "COMPLETED_LATE"
};

/**
 * Deadline Intelligence Engine
 * Converts lifecycle information into human-readable deadline information.
 */
export class DeadlineIntelligenceService {
  /**
   * Calculates presentation-ready deadline information from a goal and its lifecycle
   * @param {Object} goal - The goal object
   * @param {Object} lifecycle - The computed lifecycle object from GoalLifecycleService
   * @returns {Object} Presentation-ready deadlineInfo object
   */
  static calculate(goal, lifecycle) {
    if (!lifecycle.hasDeadline) {
      return {
        type: TYPES.NO_DEADLINE,
        label: LABELS.NO_DEADLINE,
        shortLabel: LABELS.NO_DEADLINE,
        description: "No deadline set",
        color: "neutral",
        badge: "neutral",
        icon: "calendar",
        urgencyLevel: 0,
        sortPriority: 0,
        daysRemaining: null,
        overdueDays: null,
        completedEarlyBy: null,
        completedLateBy: null
      };
    }

    let type = TYPES.UPCOMING;
    let label = '';
    let shortLabel = '';
    let description = '';
    let color = 'neutral';
    let badge = 'neutral';
    let icon = 'calendar';
    let urgencyLevel = 1;
    let sortPriority = 50;

    if (lifecycle.status === 'COMPLETED') {
      color = 'success';
      badge = 'success';
      icon = 'check';
      urgencyLevel = 0;
      sortPriority = 20;

      if (lifecycle.completedEarlyBy === 0) {
        type = TYPES.COMPLETED_TODAY;
        label = LABELS.COMPLETED_TODAY;
        shortLabel = LABELS.COMPLETED_TODAY;
        description = "Completed on time";
      } else {
        type = TYPES.COMPLETED_EARLY;
        label = `Completed ${lifecycle.completedEarlyBy} day${lifecycle.completedEarlyBy === 1 ? '' : 's'} early`;
        shortLabel = `${lifecycle.completedEarlyBy}d early`;
        description = `Completed early by ${lifecycle.completedEarlyBy} day${lifecycle.completedEarlyBy === 1 ? '' : 's'}`;
      }
    } else if (lifecycle.status === 'COMPLETED_LATE') {
      type = TYPES.COMPLETED_LATE;
      color = 'purple';
      badge = 'info';
      icon = 'check-circle';
      urgencyLevel = 0;
      sortPriority = 10;
      label = `Completed ${lifecycle.completedLateBy} day${lifecycle.completedLateBy === 1 ? '' : 's'} late`;
      shortLabel = `${lifecycle.completedLateBy}d late`;
      description = `Completed late by ${lifecycle.completedLateBy} day${lifecycle.completedLateBy === 1 ? '' : 's'}`;
    } else if (lifecycle.status === 'OVERDUE') {
      type = TYPES.OVERDUE;
      color = 'danger';
      badge = 'danger';
      icon = 'alert';
      urgencyLevel = 4;
      sortPriority = 100;
      if (lifecycle.overdueDays === 1) {
        label = LABELS.YESTERDAY;
        shortLabel = LABELS.YESTERDAY;
        description = "Overdue by 1 day";
      } else {
        label = `Overdue by ${lifecycle.overdueDays} days`;
        shortLabel = `${lifecycle.overdueDays}d overdue`;
        description = `Overdue by ${lifecycle.overdueDays} days`;
      }
    } else if (lifecycle.status === 'DUE_TODAY') {
      type = TYPES.TODAY;
      color = 'orange';
      badge = 'warning';
      icon = 'alert';
      urgencyLevel = 3;
      sortPriority = 90;
      label = LABELS.TODAY;
      shortLabel = LABELS.TODAY;
      description = "Due today";
    } else if (lifecycle.status === 'DUE_SOON') {
      color = 'warning';
      badge = 'warning';
      icon = 'clock';
      urgencyLevel = 2;
      sortPriority = 70;
      if (lifecycle.daysRemaining === 1) {
        type = TYPES.TOMORROW;
        label = LABELS.TOMORROW;
        shortLabel = LABELS.TOMORROW;
        description = "Due tomorrow";
      } else {
        type = TYPES.UPCOMING;
        label = `In ${lifecycle.daysRemaining} days`;
        shortLabel = `${lifecycle.daysRemaining}d left`;
        description = `Due in ${lifecycle.daysRemaining} days`;
      }
    } else {
      // ACTIVE
      type = TYPES.UPCOMING;
      color = 'neutral';
      badge = 'neutral';
      icon = 'calendar';
      urgencyLevel = 1;
      sortPriority = 50;
      const days = lifecycle.daysRemaining;
      
      if (days % 7 === 0) {
        const weeks = days / 7;
        label = `In ${weeks} week${weeks === 1 ? '' : 's'}`;
        shortLabel = `${weeks}w left`;
        description = `Due in ${weeks} week${weeks === 1 ? '' : 's'}`;
      } else {
        label = `In ${days} days`;
        shortLabel = `${days}d left`;
        description = `Due in ${days} days`;
      }
    }

    return {
      type,
      label,
      shortLabel,
      description,
      color,
      badge,
      icon,
      urgencyLevel,
      sortPriority,
      daysRemaining: lifecycle.daysRemaining,
      overdueDays: lifecycle.overdueDays,
      completedEarlyBy: lifecycle.completedEarlyBy,
      completedLateBy: lifecycle.completedLateBy
    };
  }
}
