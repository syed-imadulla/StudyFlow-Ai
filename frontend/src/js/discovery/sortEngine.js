/**
 * sortEngine.js
 * 
 * Provides stable, deterministic sorting of search/filter results.
 */
window.SF_DISCOVERY = window.SF_DISCOVERY || {};

window.SF_DISCOVERY.SortEngine = {
  /**
   * Sorts the results based on the provided sort type.
   * Ensures deterministic stability via fallback chaining.
   * 
   * @param {Array} results - Array of { goal, matches } objects.
   * @param {string} sortType - e.g., 'PRIORITY', 'DEADLINE'
   * @returns {Array} A new sorted array.
   */
  sort: function(results, sortType) {
    if (!results || !Array.isArray(results) || results.length <= 1) {
      return results ? [...results] : [];
    }

    const { Comparators } = window.SF_DISCOVERY;
    
    // Create a shallow copy to sort without mutating the original array
    return [...results].sort((itemA, itemB) => {
      const a = itemA.goal;
      const b = itemB.goal;
      
      let primaryDiff = 0;
      
      switch (sortType) {
        case 'PRIORITY':
          primaryDiff = Comparators.priority(a, b);
          break;
        case 'DEADLINE':
          primaryDiff = Comparators.deadline(a, b);
          break;
        case 'PROGRESS':
          primaryDiff = Comparators.progress(a, b);
          break;
        case 'RECENT_CREATED':
          primaryDiff = Comparators.recentCreated(a, b);
          break;
        case 'RECENT_UPDATED':
          primaryDiff = Comparators.recentUpdated(a, b);
          break;
        case 'ALPHABETICAL':
          primaryDiff = Comparators.alphabetical(a, b);
          break;
        default:
          primaryDiff = Comparators.priority(a, b); // Default to PRIORITY
          break;
      }
      
      if (primaryDiff !== 0) return primaryDiff;

      // Stable Fallback Chain: Priority -> Deadline -> UpdatedAt -> CreatedAt -> Title
      const fallbackDiffs = [
        Comparators.priority(a, b),
        Comparators.deadline(a, b),
        Comparators.recentUpdated(a, b),
        Comparators.recentCreated(a, b),
        Comparators.alphabetical(a, b)
      ];

      for (let i = 0; i < fallbackDiffs.length; i++) {
        if (fallbackDiffs[i] !== 0) {
          return fallbackDiffs[i];
        }
      }
      
      return 0; // Completely identical for sorting purposes
    });
  }
};
