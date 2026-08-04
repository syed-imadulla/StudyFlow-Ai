/**
 * Workspace State
 * Single source of truth for UI state in the Workspace.
 */
window.WorkspaceState = {
  filter: 'ALL', // 'ALL', 'HEALTHY', 'OVERDUE', 'DUE_TODAY', 'BLOCKING', 'COMPLETED', 'ARCHIVED'
  sort: 'PRIORITY', // 'PRIORITY', 'DEADLINE', 'HEALTH', 'PROGRESS', 'REMAINING'
  search: '',
  expandedGoals: [],
  selectedGoal: null,

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.listeners.forEach(fn => fn(this));
  },

  setFilter(filter) {
    this.filter = filter;
    this.notify();
  },

  setSort(sort) {
    this.sort = sort;
    this.notify();
  },

  setSearch(query) {
    this.search = query;
    this.notify();
  }
};
