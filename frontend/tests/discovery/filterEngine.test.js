const fixtures = require('../fixtures/goalFixtures');

describe('FilterEngine', () => {
  let FilterEngine;

  beforeEach(() => {
    FilterEngine = window.SF_DISCOVERY.FilterEngine;
  });

  const wrapGoals = (goals) => goals.map(g => ({ goal: g, matches: [] }));
  const getGoals = () => wrapGoals(Object.values(fixtures).filter(f => f && typeof f === 'object' && f.id));

  describe('filter()', () => {
    it('returns all non-completed/non-archived goals if filters object is empty', () => {
      const goals = getGoals();
      const expectedLength = goals.filter(g => g.goal.rawStatus !== 'COMPLETED' && g.goal.rawStatus !== 'ARCHIVED').length;
      expect(FilterEngine.filter(goals, {}).length).toBe(expectedLength);
    });

    it('returns all original goals unfiltered if filters object is null or undefined', () => {
      const goals = getGoals();
      expect(FilterEngine.filter(goals, null).length).toBe(goals.length);
      expect(FilterEngine.filter(goals, undefined).length).toBe(goals.length);
    });

    it('returns empty array if input goals is invalid', () => {
      expect(FilterEngine.filter(null, {})).toEqual([]);
      expect(FilterEngine.filter(undefined, {})).toEqual([]);
    });

    it('filters by single priority', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { priority: ['HIGH'] });
      expect(result.length).toBeGreaterThan(0);
      result.forEach(wrapper => {
        expect(wrapper.goal.priority).toBe('HIGH');
      });
    });

    it('filters by multiple priorities (OR logic)', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { priority: ['HIGH', 'URGENT'] });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(wrapper => {
        expect(['HIGH', 'URGENT']).toContain(wrapper.goal.priority);
      });
    });

    it('filters by category', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { category: ['Study'] });
      
      expect(result.length).toBe(1);
      expect(result[0].goal.category).toBe('Study');
    });

    it('filters by status (lifecycle/urgency)', () => {
      const goals = getGoals();
      // Most goals have no lifecycle/urgency defined in fixtures, so they default to 'ACTIVE'
      const result = FilterEngine.filter(goals, { status: ['ACTIVE'] });
      
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].goal.id).toBeDefined();
    });

    it('filters by health', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { health: ['OVERDUE'] });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.goal.health.status).toBe('OVERDUE'));
    });

    it('filters by deadline type', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { deadline: ['TODAY'] });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.goal.deadline.type).toBe('TODAY'));
    });

    it('filters by completed flag', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { completed: true });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.goal.rawStatus).toBe('COMPLETED'));
    });

    it('filters by archived flag', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { archived: true });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.goal.rawStatus).toBe('ARCHIVED'));
    });

    it('filters by progress label', () => {
      const goals = getGoals();
      // Need completed: true because otherwise completed goals are explicitly excluded first
      const result = FilterEngine.filter(goals, { progress: ['COMPLETED'], completed: true });
      
      expect(result.length).toBeGreaterThan(0);
      result.forEach(w => expect(w.goal.progress.percentage).toBeGreaterThanOrEqual(100));
    });

    it('applies implicit AND logic across different groups', () => {
      const goals = getGoals();
      // Should find overdueUrgent
      const result = FilterEngine.filter(goals, { priority: ['URGENT'], category: ['University'] });
      
      expect(result.length).toBe(1);
      expect(result[0].goal.id).toBe(fixtures.overdueUrgent.id);
    });

    it('returns empty if AND logic fails to match', () => {
      const goals = getGoals();
      const result = FilterEngine.filter(goals, { priority: ['URGENT'], category: ['Study'] }); // No Urgent study goal
      expect(result.length).toBe(0);
    });
    
    it('handles empty filter arrays by ignoring them (acting as wildcard)', () => {
      const goals = getGoals();
      const expectedLength = goals.filter(g => g.goal.rawStatus !== 'COMPLETED' && g.goal.rawStatus !== 'ARCHIVED').length;
      const result = FilterEngine.filter(goals, { priority: [], category: [] });
      expect(result.length).toBe(expectedLength);
    });
  });

  describe('extractCategories()', () => {
    it('returns a sorted list of unique categories ignoring empty strings', () => {
      const goals = [
        { category: 'Work' },
        { category: 'Study' },
        { category: 'Work' },
        { category: '' },
        { category: 'Personal' },
        {} // Missing category
      ];
      
      const categories = FilterEngine.extractCategories(goals);
      expect(categories).toEqual(['Personal', 'Study', 'Work']); // Alphabetical
    });
    
    it('handles null/undefined safely', () => {
      expect(FilterEngine.extractCategories(null)).toEqual([]);
      expect(FilterEngine.extractCategories([])).toEqual([]);
    });
  });
});
