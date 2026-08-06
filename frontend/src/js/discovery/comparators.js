/**
 * comparators.js
 * 
 * Reusable comparators for Goal sorting.
 */
window.SF_DISCOVERY = window.SF_DISCOVERY || {};

const PRIORITY_VALUES = {
  'URGENT': 4,
  'HIGH': 3,
  'MEDIUM': 2,
  'LOW': 1
};

const DEADLINE_VALUES = {
  'OVERDUE': 100,
  'TODAY': 90,
  'TOMORROW': 70,
  'UPCOMING': 50,
  'NO_DEADLINE': 0
};

window.SF_DISCOVERY.Comparators = {
  /**
   * Sorts by Priority: URGENT -> HIGH -> MEDIUM -> LOW
   * @returns {number} Negative if a > b, positive if a < b (descending)
   */
  priority: function(a, b) {
    const valA = PRIORITY_VALUES[a.priority] || 0;
    const valB = PRIORITY_VALUES[b.priority] || 0;
    return valB - valA;
  },

  /**
   * Sorts by Deadline: OVERDUE -> TODAY -> TOMORROW -> UPCOMING -> NO_DEADLINE
   * Falls back to timestamp if types match.
   */
  deadline: function(a, b) {
    const valA = DEADLINE_VALUES[a.deadline?.type] || 0;
    const valB = DEADLINE_VALUES[b.deadline?.type] || 0;
    
    if (valA !== valB) {
      return valB - valA; // Descending urgency (100 -> 0)
    }
    
    // If same type, sort by actual timestamp ascending (closer deadline first)
    // Only applies if timestamp exists
    const tA = a.deadline?.timestamp || a.deadlineInfo?.timestamp || Infinity;
    const tB = b.deadline?.timestamp || b.deadlineInfo?.timestamp || Infinity;
    if (tA === tB) return 0;
    return tA - tB;
  },

  /**
   * Sorts by Progress: 100% -> 0%
   */
  progress: function(a, b) {
    const valA = a.progress?.percentage || 0;
    const valB = b.progress?.percentage || 0;
    return valB - valA;
  },

  /**
   * Sorts alphabetically by title: A -> Z
   */
  alphabetical: function(a, b) {
    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB);
  },

  /**
   * Sorts by Created Date: Newest -> Oldest
   */
  recentCreated: function(a, b) {
    const tA = new Date(a.createdAt || 0).getTime();
    const tB = new Date(b.createdAt || 0).getTime();
    return tB - tA;
  },

  /**
   * Sorts by Updated Date: Newest -> Oldest
   */
  recentUpdated: function(a, b) {
    const tA = new Date(a.updatedAt || 0).getTime();
    const tB = new Date(b.updatedAt || 0).getTime();
    return tB - tA;
  }
};
