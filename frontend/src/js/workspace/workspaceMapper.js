/**
 * Workspace Mapper
 * Converts raw backend API goals into safe, presentation-ready ViewModels.
 * Completely isolates the UI from the backend schema and business logic.
 */
window.WorkspaceMapper = {
  /**
   * Maps a raw goal object to a WorkspaceCardModel
   * @param {Object} goal Raw goal from backend
   * @returns {Object} Safe ViewModel for rendering
   */
  toCardModel(goal) {
    if (!goal) return null;

    // Parse canonical deadline for sorting
    const timestamp = goal.deadline ? new Date(goal.deadline).getTime() : Infinity;
    
    // Subtasks mapping
    const rawSubtasks = Array.isArray(goal.subtasks) ? goal.subtasks : [];
    const subtasks = rawSubtasks.map(sub => this.toSubtaskModel(sub, goal.id)).sort((a, b) => {
      // Completed goals to the bottom
      if (a.completed && !b.completed) return 1;
      if (!a.completed && b.completed) return -1;
      
      // Sort by urgency priority (higher is more urgent)
      if (a.deadline.sortPriority !== b.deadline.sortPriority) {
        return b.deadline.sortPriority - a.deadline.sortPriority;
      }
      
      // Tie-breaker: closest timestamp
      return a.deadline.timestamp - b.deadline.timestamp;
    });
    
    // Determine blocking milestone if any
    const blockingSubtask = rawSubtasks.find(s => s.isBlocking);
    const blockingMilestone = blockingSubtask ? {
      title: blockingSubtask.title,
      deadlineLabel: blockingSubtask.deadlineInfo?.shortLabel || 'No deadline'
    } : null;

    return {
      id: goal.id || goal._id,
      title: goal.title || 'Untitled Goal',
      description: goal.description || 'AI Goal Blueprint',
      
      rawStatus: goal.status,
      createdAt: goal.createdAt || Date.now(),
      updatedAt: goal.updatedAt || Date.now(),
      
      // Discovery Pipeline Fields
      priority: goal.priority || 'LOW',
      category: goal.category || 'Uncategorized',
      source: goal.source || 'MANUAL',
      metadata: goal.metadata || {},
      searchText: `${goal.title || ''} ${goal.description || ''} ${goal.category || ''} ${rawSubtasks.map(s => `${s.title || ''} ${s.description || ''}`).join(' ')} ${goal.source === 'AI' || goal.metadata?.aiGenerated ? 'AI Generated' : 'Manual'}`.toLowerCase(),
      
      // Health mapping
      health: goal.goalHealth ? {
        status: goal.goalHealth.status,
        score: goal.goalHealth.score,
        label: this._getHealthLabel(goal.goalHealth.status),
        color: this._getHealthColor(goal.goalHealth.status)
      } : {
        status: 'UNKNOWN',
        score: 100,
        label: 'Healthy',
        color: 'success'
      },
      
      // Progress mapping
      progress: {
        percentage: goal.progressSummary?.completionPercentage !== undefined ? Math.round(goal.progressSummary.completionPercentage * 100) / 100 : 0,
        completed: goal.progressSummary?.completedMilestones || 0,
        total: goal.progressSummary?.totalMilestones || 0,
        remaining: goal.progressSummary?.remainingMilestones || 0,
        label: `${goal.progressSummary?.completedMilestones || 0} / ${goal.progressSummary?.totalMilestones || 0} Completed`
      },
      
      // Deadline Intelligence mapping
      deadline: {
        type: goal.deadlineInfo?.type,
        label: goal.deadlineInfo?.label,
        shortLabel: goal.deadlineInfo?.shortLabel,
        color: goal.deadlineInfo?.color,
        badge: goal.deadlineInfo?.badge,
        icon: goal.deadlineInfo?.icon,
        sortPriority: goal.deadlineInfo?.sortPriority || 0,
        timestamp: timestamp,
        isUrgent: goal.deadlineInfo?.urgencyLevel >= 2
      },
      
      // Lifecycle mapping (for filtering)
      lifecycle: {
        status: goal.lifecycle?.status,
        isOverdue: goal.lifecycle?.isOverdue,
        isDueToday: goal.lifecycle?.isDueToday,
        isDueSoon: goal.lifecycle?.isDueSoon,
        isCompleted: goal.lifecycle?.isCompleted,
        isArchived: goal.lifecycle?.isArchived
      },
      
      blockingMilestone,
      subtasks,
      
      // Keep original goal reference just in case for legacy components
      _raw: goal
    };
  },
  
  /**
   * Maps a raw subtask object to a SubtaskCardModel
   */
  toSubtaskModel(sub, goalId) {
    if (!sub) return null;
    
    const timestamp = sub.deadline ? new Date(sub.deadline).getTime() : Infinity;
    
    return {
      id: sub.id || sub._id,
      goalId: goalId,
      title: sub.title || 'Untitled Task',
      completed: !!sub.completed,
      priority: sub.priority || window.SF_COMPONENTS.PRIORITY.MEDIUM,
      isBlocking: !!sub.isBlocking,
      deadline: sub.deadlineInfo ? {
        type: sub.deadlineInfo.type,
        label: sub.deadlineInfo.label,
        shortLabel: sub.deadlineInfo.shortLabel,
        color: sub.deadlineInfo.color,
        badge: sub.deadlineInfo.badge,
        icon: sub.deadlineInfo.icon,
        sortPriority: sub.deadlineInfo.sortPriority || 0,
        urgencyLevel: sub.deadlineInfo.urgencyLevel || 0,
        timestamp: timestamp
      } : { type: 'NO_DEADLINE', sortPriority: 0, urgencyLevel: 0 },
      
      lifecycle: sub.lifecycle || { status: 'ACTIVE' },
      
      _raw: sub
    };
  },
  
  _getHealthLabel(status) {
    const map = {
      'COMPLETED': 'Completed',
      'ARCHIVED': 'Archived',
      'OVERDUE': 'Overdue',
      'DUE_TODAY': 'Due Today',
      'AT_RISK': 'At Risk',
      'HEALTHY': 'Healthy'
    };
    return map[status] || 'Healthy';
  },

  _getHealthColor(status) {
    const map = {
      'COMPLETED': 'green',
      'ARCHIVED': 'gray',
      'OVERDUE': 'red',
      'DUE_TODAY': 'yellow',
      'AT_RISK': 'orange',
      'HEALTHY': 'green'
    };
    return map[status] || 'green';
  }
};
