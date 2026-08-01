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

    // Use safe fallbacks for backward compatibility
    const fallbackDeadline = goal.finalDeadlineDisplay || 'No deadline';
    const fallbackStatus = goal.urgency || 'ACTIVE';
    
    // Subtasks mapping
    const rawSubtasks = Array.isArray(goal.subtasks) ? goal.subtasks : [];
    const subtasks = rawSubtasks.map(sub => this.toSubtaskModel(sub, goal.id));
    
    // Determine blocking milestone if any
    const blockingSubtask = rawSubtasks.find(s => s.isBlocking);
    const blockingMilestone = blockingSubtask ? {
      title: blockingSubtask.title,
      deadlineLabel: blockingSubtask.deadlineInfo?.shortLabel || blockingSubtask.deadlineDisplay || 'Overdue'
    } : null;

    return {
      id: goal.id || goal._id,
      title: goal.title || 'Untitled Goal',
      description: goal.description || 'AI Goal Blueprint',
      
      // Fallback for older goals without lifecycle
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
      progress: goal.progressSummary ? {
        percentage: goal.progressSummary.completionPercentage !== undefined ? Math.round(goal.progressSummary.completionPercentage) : 0,
        completed: goal.progressSummary.completedMilestones || 0,
        total: goal.progressSummary.totalMilestones || 0,
        remaining: goal.progressSummary.remainingMilestones || 0,
        label: `${goal.progressSummary.completedMilestones || 0} / ${goal.progressSummary.totalMilestones || 0} Completed`
      } : {
        // Fallback progress calculation ONLY if backend doesn't provide it
        percentage: rawSubtasks.length > 0 ? Math.round((rawSubtasks.filter(s => s.completed).length / rawSubtasks.length) * 100) : 0,
        completed: rawSubtasks.filter(s => s.completed).length,
        total: rawSubtasks.length,
        remaining: rawSubtasks.filter(s => !s.completed).length,
        label: `${rawSubtasks.filter(s => s.completed).length} / ${rawSubtasks.length} Completed`
      },
      
      // Deadline Intelligence mapping
      deadline: goal.deadlineInfo ? {
        type: goal.deadlineInfo.type,
        label: goal.deadlineInfo.label,
        shortLabel: goal.deadlineInfo.shortLabel,
        color: goal.deadlineInfo.color,
        badge: goal.deadlineInfo.badge,
        icon: goal.deadlineInfo.icon,
        sortPriority: goal.deadlineInfo.sortPriority || 0,
        isUrgent: goal.deadlineInfo.urgencyLevel >= 2
      } : {
        type: fallbackStatus,
        label: fallbackDeadline,
        shortLabel: fallbackDeadline,
        color: fallbackStatus === 'OVERDUE' ? 'danger' : 'neutral',
        badge: fallbackStatus === 'OVERDUE' ? 'danger' : 'neutral',
        icon: 'calendar',
        sortPriority: 0,
        isUrgent: fallbackStatus === 'OVERDUE' || fallbackStatus === 'DUE_TODAY'
      },
      
      // Lifecycle mapping (for filtering)
      lifecycle: goal.lifecycle ? {
        status: goal.lifecycle.status,
        isOverdue: goal.lifecycle.isOverdue,
        isDueToday: goal.lifecycle.isDueToday,
        isDueSoon: goal.lifecycle.isDueSoon,
        isCompleted: goal.lifecycle.isCompleted
      } : {
        status: fallbackStatus,
        isOverdue: fallbackStatus === 'OVERDUE',
        isDueToday: fallbackStatus === 'DUE_TODAY',
        isDueSoon: false,
        isCompleted: goal.status === 'COMPLETED' || goal.completed
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
    
    return {
      id: sub.id || sub._id,
      goalId: goalId,
      title: sub.title || 'Untitled Task',
      completed: !!sub.completed,
      priority: sub.priority || 'Medium',
      isBlocking: !!sub.isBlocking,
      
      // Fallback handling
      priorityColor: sub.priority === 'High' ? 'danger' : sub.priority === 'Medium' ? 'warning' : 'success',
      
      deadline: sub.deadlineInfo ? {
        type: sub.deadlineInfo.type,
        label: sub.deadlineInfo.label,
        shortLabel: sub.deadlineInfo.shortLabel,
        color: sub.deadlineInfo.color
      } : {
        type: 'UNKNOWN',
        label: sub.deadlineDisplay || 'No deadline',
        shortLabel: sub.deadlineDisplay || 'No deadline',
        color: 'neutral'
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
