const fixtures = require('../fixtures/goalFixtures');

describe('Discovery Regressions', () => {
  let FilterEngine;
  let SearchEngine;
  let Comparators;
  let SortEngine;

  beforeEach(() => {
    FilterEngine = window.SF_DISCOVERY.FilterEngine;
    SearchEngine = window.SF_DISCOVERY.SearchEngine;
    Comparators = window.SF_DISCOVERY.Comparators;
    SortEngine = window.SF_DISCOVERY.SortEngine;
  });

  const wrapGoals = (goals) => goals.map(g => ({ goal: g, matches: [] }));
  const unwrapGoals = (wrapped) => wrapped.map(w => w.goal);

  describe('Empty state crash (legacy filterType issue)', () => {
    // This is technically a UI issue, but we verify FilterEngine handles complex states gracefully
    // without relying on a single string filterType.
    it('processes full state objects without throwing', () => {
      const state = {
        filters: { health: ['HEALTHY'], deadline: ['OVERDUE'] }
      };
      const goals = wrapGoals([fixtures.activeHealthy, fixtures.overdueUrgent]);
      
      expect(() => FilterEngine.filter(goals, state.filters)).not.toThrow();
    });
  });

  describe('Search indexing bugs', () => {
    it('includes milestone titles', () => {
      const goals = [fixtures.withMilestones];
      const result = SearchEngine.search(goals, 'step 1');
      expect(result.length).toBe(1);
    });

    it('includes milestone descriptions', () => {
      const goals = [fixtures.withMilestones];
      const result = SearchEngine.search(goals, 'do that');
      expect(result.length).toBe(1);
    });

    it('includes AI source', () => {
      const goals = [fixtures.completedAI];
      const result = SearchEngine.search(goals, 'ai generated');
      expect(result.length).toBe(1);
    });
  });

  describe('Missing timestamps', () => {
    it('does not throw when sorting goals with missing createdAt / updatedAt', () => {
      const goals = wrapGoals([fixtures.missingTimestamps, fixtures.activeHealthy]);
      
      expect(() => SortEngine.sort(goals, 'RECENT_CREATED')).not.toThrow();
      expect(() => SortEngine.sort(goals, 'RECENT_UPDATED')).not.toThrow();
      
      const sorted = SortEngine.sort(goals, 'RECENT_CREATED');
      expect(sorted.length).toBe(2);
    });
  });

  describe('deadline.type and progress.percentage mapping', () => {
    it('FilterEngine correctly reads deadline.type', () => {
      const goals = wrapGoals([fixtures.dueTodayHigh, fixtures.overdueUrgent]);
      const result = FilterEngine.filter(goals, { deadline: ['TODAY'] });
      
      expect(result.length).toBe(1);
      expect(result[0].goal.id).toBe(fixtures.dueTodayHigh.id);
    });

    it('FilterEngine correctly reads progress.percentage', () => {
      const goals = wrapGoals([fixtures.completedAI, fixtures.activeHealthy]);
      const result = FilterEngine.filter(goals, { progress: ['COMPLETED'], completed: true });
      
      expect(result.length).toBe(1);
      expect(result[0].goal.id).toBe(fixtures.completedAI.id);
    });

    it('Comparators correctly read deadline.type', () => {
      expect(Comparators.deadline(fixtures.overdueUrgent, fixtures.dueTodayHigh)).toBeLessThan(0);
    });

    it('Comparators correctly read progress.percentage', () => {
      expect(Comparators.progress(fixtures.completedAI, fixtures.activeHealthy)).toBeLessThan(0);
    });
  });

  describe('Unknown priority fallback', () => {
    it('SortEngine falls back safely if priority is unknown', () => {
      const goals = wrapGoals([fixtures.unknownPriority, fixtures.activeHealthy]);
      
      // activeHealthy is MEDIUM (value 2). unknown is treated as 0. 
      // MEDIUM should sort before unknown
      const sorted = SortEngine.sort(goals, 'PRIORITY');
      expect(sorted[0].goal.id).toBe(fixtures.activeHealthy.id);
      expect(sorted[1].goal.id).toBe(fixtures.unknownPriority.id);
    });
  });

  describe('Empty dataset handling', () => {
    it('engines handle empty arrays seamlessly', () => {
      expect(SearchEngine.search([], 'test')).toEqual([]);
      expect(FilterEngine.filter([], { priority: ['HIGH'] })).toEqual([]);
      expect(SortEngine.sort([], 'PRIORITY')).toEqual([]);
    });
  });

});
