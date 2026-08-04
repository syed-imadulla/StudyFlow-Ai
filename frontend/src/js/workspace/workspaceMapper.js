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
      priority: sub.priority || 'Medium',
      isBlocking: !!sub.isBlocking,
      
      // Legacy fallback handling for priority
      priorityColor: sub.priority === 'High' ? 'danger' : sub.priority === 'Medium' ? 'warning' : sub.priority === 'URGENT' ? 'danger' : 'success',
      
      deadline: {
        type: sub.deadlineInfo?.type,
        label: sub.deadlineInfo?.label,
        shortLabel: sub.deadlineInfo?.shortLabel,
        color: sub.deadlineInfo?.color,
        badge: sub.deadlineInfo?.badge,
        icon: sub.deadlineInfo?.icon,
        sortPriority: sub.deadlineInfo?.sortPriority || 0,
        urgencyLevel: sub.deadlineInfo?.urgencyLevel || 0,
        timestamp: timestamp
      },
      
      lifecycle: sub.lifecycle || { status: 'ACTIVE' },
      
      _raw: sub
    };
  },
  
  _getHealthLabel(status) {
    switch(status) {
      case 'HEALTHY': return 'Healthy';
      case 'NEEDS_ATTENTION': return 'Needs Attention';
      case 'AT_RISK': return 'At Risk';
      case 'CRITICAL': return 'Critical';
      default: return 'Unknown';
    }
  },
  
  _getHealthColor(status) {
    switch(status) {
      case 'HEALTHY': return 'success';
      case 'NEEDS_ATTENTION': return 'warning';
      case 'AT_RISK': return 'orange'; // Can map to a specific tailwind color
      case 'CRITICAL': return 'danger';
      default: return 'neutral';
    }
  }
};
