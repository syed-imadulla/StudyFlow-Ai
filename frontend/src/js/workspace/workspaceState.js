/**
 * Workspace State
 * Single source of truth for UI state in the Workspace.
 */
window.WorkspaceState = {
  // --- Discovery Unified State ---
  search: '',
  sort: 'PRIORITY',
  filters: {
    status: [],
    priority: [],
    category: [],
    health: [],
    deadline: [],
    progress: [],
    archived: false,
    completed: false,
    aiGenerated: null
  },

  // --- Discovery Pipeline Results Cache ---
  filteredGoals: [],
  resultCount: 0,
  hasSearch: false,
  hasFilters: false,

  // --- UI State ---
  expandedGoals: [],
  selectedGoal: null,

  listeners: [],

  subscribe(listener) {
    this.listeners.push(listener);
  },

  notify() {
    this.listeners.forEach(fn => fn(this));
  },

  // State Setters

  setSearch(query) {
    this.search = query || '';
    this.hasSearch = this.search.trim().length > 0;
    this.notify();
  },

  setSort(sortType) {
    this.sort = sortType || 'PRIORITY';
    this.notify();
  },

  setFilters(newFilters) {
    this.filters = { ...this.filters, ...newFilters };
    this.hasFilters = this._computeHasFilters();
    this.notify();
  },

  clearFilters() {
    this.filters = {
      status: [],
      priority: [],
      category: [],
      health: [],
      deadline: [],
      progress: [],
      archived: false,
      completed: false,
      aiGenerated: null
    };
    this.hasFilters = false;
    this.notify();
  },

  setPipelineResults(goals) {
    this.filteredGoals = goals || [];
    this.resultCount = this.filteredGoals.length;
    // We intentionally do NOT call this.notify() here, as this setter is called 
    // by the renderer after it executes the pipeline, to avoid infinite render loops.
  },

  _computeHasFilters() {
    const f = this.filters;
    if (f.status.length > 0 || f.priority.length > 0 || f.category.length > 0 || 
        f.health.length > 0 || f.deadline.length > 0 || f.progress.length > 0) return true;
    if (f.archived || f.completed || f.aiGenerated !== null) return true;
    return false;
  },

  // Legacy compatibility: Maps old string-based single filters to the new unified filters
  setFilter(filterString) {
    this.clearFilters(); // old behavior was single-select
    if (filterString === 'ALL') {
      // already cleared
    } else if (filterString === 'HEALTHY') {
      this.filters.health = ['HEALTHY'];
    } else if (filterString === 'OVERDUE') {
      this.filters.deadline = ['OVERDUE'];
    } else if (filterString === 'DUE_TODAY') {
      this.filters.deadline = ['TODAY'];
    } else if (filterString === 'BLOCKING') {
      this.filters.status = ['BLOCKING'];
    } else if (filterString === 'COMPLETED') {
      this.filters.completed = true;
    } else if (filterString === 'ARCHIVED') {
      this.filters.archived = true;
    }
    this.hasFilters = this._computeHasFilters();
    this.notify();
  }
};
