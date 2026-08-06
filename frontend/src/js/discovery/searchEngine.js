/**
 * searchEngine.js
 * 
 * Provides pure, immutable text search over pre-indexed goals.
 */
window.SF_DISCOVERY = window.SF_DISCOVERY || {};

window.SF_DISCOVERY.SearchEngine = {
  /**
   * Searches the goals array based on the query.
   * Relies on goal.searchText being pre-populated by the WorkspaceMapper.
   * 
   * @param {Array} goals - Array of goal objects.
   * @param {string} query - The search query.
   * @returns {Array} Array of objects: { goal, matches: [] }
   */
  search: function(goals, query) {
    if (!goals || !Array.isArray(goals)) return [];
    
    // If no query, wrap all goals with empty matches
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return goals.map(g => ({ goal: g, matches: [] }));
    }

    const normalizedQuery = query.trim().toLowerCase();
    const results = [];
    
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];
      // Assume goal.searchText has been populated by the mapper/store
      const searchText = goal.searchText || '';
      
      if (searchText.toLowerCase().includes(normalizedQuery)) {
        // Future enhancement: populate matches with actual highlighted regions
        results.push({ goal, matches: [] });
      }
    }
    
    return results;
  }
};
