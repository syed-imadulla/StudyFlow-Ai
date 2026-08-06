/**
 * discoveryPipeline.js
 * 
 * Orchestrates the Goal Discovery system.
 */
window.SF_DISCOVERY = window.SF_DISCOVERY || {};

window.SF_DISCOVERY.DiscoveryPipeline = {
  /**
   * Executes the full discovery pipeline: Search -> Filter -> Sort
   * 
   * @param {Array} goals - Raw array of goal objects.
   * @param {Object} state - The unified discovery state object.
   * @returns {Array} Array of final filtered and sorted goal objects.
   */
  execute: function(goals, state) {
    if (!goals || !Array.isArray(goals)) return [];
    
    // Fallback default state if none provided
    const safeState = state || {
      search: '',
      sort: 'PRIORITY',
      filters: {}
    };

    const { SearchEngine, FilterEngine, SortEngine } = window.SF_DISCOVERY;

    // 1. Search (Returns [{ goal, matches }])
    const searchResults = SearchEngine.search(goals, safeState.search);

    // 2. Filter (Filters the array of { goal, matches })
    const filteredResults = FilterEngine.filter(searchResults, safeState.filters);

    // 3. Sort (Sorts the array of { goal, matches })
    const sortedResults = SortEngine.sort(filteredResults, safeState.sort);

    // 4. Extract final goals array
    // (We strip out the matches metadata for now, keeping it transparent to the renderer)
    return sortedResults.map(res => res.goal);
  }
};
