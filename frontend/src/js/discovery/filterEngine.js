/**
 * filterEngine.js
 * 
 * Provides pure, composable filtering for goals.
 */
window.SF_DISCOVERY = window.SF_DISCOVERY || {};

window.SF_DISCOVERY.FilterEngine = {
  /**
   * Filters an array of search results based on a composable filters object.
   * 
   * @param {Array} searchResults - Array of { goal, matches } objects.
   * @param {Object} filters - Unified state filters object.
   * @returns {Array} Filtered array of { goal, matches }.
   */
  filter: function(searchResults, filters) {
    if (!searchResults || !Array.isArray(searchResults)) return [];
    if (!filters) return searchResults;

    return searchResults.filter(({ goal }) => {
      // Archived: default behavior typically excludes archived unless explicitly requested.
      if (typeof filters.archived === 'boolean') {
        const isArchived = goal.lifecycle?.isArchived === true || goal.rawStatus === 'ARCHIVED';
        if (filters.archived !== isArchived) return false;
      } else {
        // If archived filter isn't set, explicitly filter out archived by default
        const isArchived = goal.lifecycle?.isArchived === true || goal.rawStatus === 'ARCHIVED';
        if (isArchived) return false;
      }

      // Completed: default behavior typically excludes completed unless explicitly requested.
      if (typeof filters.completed === 'boolean') {
        const isCompleted = goal.lifecycle?.isCompleted === true || goal.rawStatus === 'COMPLETED';
        if (filters.completed !== isCompleted) return false;
      } else {
         // If completed filter isn't set, explicitly filter out completed by default
         const isCompleted = goal.lifecycle?.isCompleted === true || goal.rawStatus === 'COMPLETED';
         if (isCompleted) return false;
      }

      // Priority
      if (Array.isArray(filters.priority) && filters.priority.length > 0) {
        if (!filters.priority.includes(goal.priority)) return false;
      }

      // Category
      if (Array.isArray(filters.category) && filters.category.length > 0) {
        if (!filters.category.includes(goal.category)) return false;
      }

      // Status (Lifecycle / Urgency)
      if (Array.isArray(filters.status) && filters.status.length > 0) {
        const status = goal.lifecycle?.status || goal.urgency || 'ACTIVE';
        if (!filters.status.includes(status)) return false;
      }

      // Health
      if (Array.isArray(filters.health) && filters.health.length > 0) {
        const h = goal.health?.status || 'UNKNOWN';
        if (!filters.health.includes(h)) return false;
      }

      // Deadline
      if (Array.isArray(filters.deadline) && filters.deadline.length > 0) {
        const dt = goal.deadline?.type || 'NO_DEADLINE';
        if (!filters.deadline.includes(dt)) return false;
      }

      // Progress (could be an enum like 'NOT_STARTED', 'IN_PROGRESS', 'ALMOST_DONE')
      if (Array.isArray(filters.progress) && filters.progress.length > 0) {
        const p = goal.progress?.percentage || 0;
        let pLabel = 'NOT_STARTED';
        if (p >= 100) pLabel = 'COMPLETED';
        else if (p > 75) pLabel = 'ALMOST_DONE';
        else if (p > 0) pLabel = 'IN_PROGRESS';
        
        if (!filters.progress.includes(pLabel)) return false;
      }

      // AI Generated vs Manual
      if (typeof filters.aiGenerated === 'boolean') {
        const isAI = !!(goal.metadata?.aiGenerated || goal.source === 'AI');
        if (filters.aiGenerated !== isAI) return false;
      }

      return true;
    });
  },

  /**
   * Dynamically extracts all unique categories from the provided goals array.
   * 
   * @param {Array} goals - Raw array of goals.
   * @returns {Array} Alphabetically sorted array of valid category strings.
   */
  extractCategories: function(goals) {
    if (!goals || !Array.isArray(goals)) return [];
    const categories = new Set();
    for (let i = 0; i < goals.length; i++) {
      const c = goals[i].category;
      if (c && typeof c === 'string' && c.trim() !== '') {
        categories.add(c.trim());
      }
    }
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  }
};
