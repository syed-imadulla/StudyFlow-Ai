/**
 * Workspace Actions
 * Stable action layer for UI interactions.
 */
window.WorkspaceActions = {
  searchTimeout: null,
  debouncedSearch(value) {
    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      window.WorkspaceState.setSearch(value);
      const announcer = document.getElementById('search-announcer');
      if (announcer) {
         const resultsCount = window.WorkspaceState.pipelineResults ? window.WorkspaceState.pipelineResults.length : 0;
         announcer.textContent = `${resultsCount} goal${resultsCount !== 1 ? 's' : ''} found.`;
      }
    }, 250);
  },

  openGoal(id) {
    window.location.href = `idealab.html?goalId=${id}`;
  },

  createGoal() {
    if (typeof window.openAddItemModal === 'function') {
      window.openAddItemModal('goalsDynamicContainer', false);
    }
  },

  editGoal(id) {
    if (typeof window.openEditGoalModal === 'function') {
      window.openEditGoalModal(id);
    }
  },

  deleteGoal(id, event) {
    if (typeof window.confirmDeleteGoal === 'function') {
      window.confirmDeleteGoal(id, event);
    }
  },

  completeGoal(id) {
    // Dispatch to store if supported, or via specific modal/action
  },
  
  archiveGoal(id) {
    if (window.SF_STORE) {
      window.SF_STORE.dispatch('goals/UPDATE', { goalId: id, patch: { archived: true } });
    }
  },

  restoreGoal(id) {
    if (window.SF_STORE) {
      window.SF_STORE.dispatch('goals/UPDATE', { goalId: id, patch: { archived: false } });
    }
  },

  toggleSubtask(goalId, subtaskId) {
    if (window.SF_STORE) {
      window.SF_STORE.dispatch('goals/TOGGLE_SUBTASK', { goalId, subtaskId });
    }
  },
  
  openSubtaskIdeaLab(goalId, subtaskId) {
    if (typeof window.openSubtaskIdeaLab === 'function') {
      window.openSubtaskIdeaLab(goalId, subtaskId);
    }
  },

  scheduleMilestone(goalId, subtaskId) {
    if (typeof window.openScheduleMilestoneModal === 'function') {
      window.openScheduleMilestoneModal(goalId, subtaskId);
    }
  },
  
  viewInPlanner() {
    window.location.href = 'planner.html';
  },
  
  startFocus() {
    window.location.href = 'focus.html';
  },

  expandGoal(id) {
    const { expandedGoals } = window.WorkspaceState;
    if (!expandedGoals.includes(id)) {
      window.WorkspaceState.expandedGoals.push(id);
      window.WorkspaceState.notify();
    }
  },
  
  collapseGoal(id) {
    const { expandedGoals } = window.WorkspaceState;
    const index = expandedGoals.indexOf(id);
    if (index > -1) {
      expandedGoals.splice(index, 1);
      window.WorkspaceState.notify();
    }
  },
  
  toggleGoalActionMenu(goalId, event) {
    if (typeof window.toggleGoalActionMenu === 'function') {
      window.toggleGoalActionMenu(goalId, event);
    }
  },
  
  setFilter(filter) {
    window.WorkspaceState.setFilter(filter);
  },
  
  setSort(sort) {
    window.WorkspaceState.setSort(sort);
  }
};
