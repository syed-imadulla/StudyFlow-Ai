const fixtures = require('../fixtures/goalFixtures');

describe('Comparators', () => {
  let Comparators;

  beforeEach(() => {
    Comparators = window.SF_DISCOVERY.Comparators;
  });

  describe('priority()', () => {
    it('sorts URGENT before HIGH before MEDIUM before LOW', () => {
      const { overdueUrgent, dueTodayHigh, activeHealthy, archivedGoal } = fixtures;
      
      expect(Comparators.priority(overdueUrgent, dueTodayHigh)).toBeLessThan(0);
      expect(Comparators.priority(dueTodayHigh, activeHealthy)).toBeLessThan(0);
      expect(Comparators.priority(activeHealthy, archivedGoal)).toBeLessThan(0);
      expect(Comparators.priority(archivedGoal, overdueUrgent)).toBeGreaterThan(0);
    });

    it('returns 0 for equal priorities', () => {
      expect(Comparators.priority(fixtures.dueTodayHigh, fixtures.dueTodayHigh)).toBe(0);
    });

    it('handles unknown priorities safely (treats as 0)', () => {
      expect(Comparators.priority(fixtures.unknownPriority, fixtures.archivedGoal)).toBeGreaterThan(0); // 0 vs 1 (LOW) -> 1 - 0 = 1 > 0
    });
  });

  describe('deadline()', () => {
    it('sorts OVERDUE before TODAY before TOMORROW before UPCOMING', () => {
      const { overdueUrgent, dueTodayHigh, dueTomorrow, upcoming, archivedGoal } = fixtures;
      
      expect(Comparators.deadline(overdueUrgent, dueTodayHigh)).toBeLessThan(0);
      expect(Comparators.deadline(dueTodayHigh, dueTomorrow)).toBeLessThan(0);
      expect(Comparators.deadline(dueTomorrow, upcoming)).toBeLessThan(0);
      expect(Comparators.deadline(upcoming, archivedGoal)).toBeLessThan(0); // archived has NO_DEADLINE
    });

    it('sorts by timestamp when deadline types match', () => {
      const d1 = fixtures.createMock({ deadline: { type: 'TODAY', timestamp: 100 } });
      const d2 = fixtures.createMock({ deadline: { type: 'TODAY', timestamp: 200 } });
      
      // Closer deadline first
      expect(Comparators.deadline(d1, d2)).toBeLessThan(0);
      expect(Comparators.deadline(d2, d1)).toBeGreaterThan(0);
    });

    it('returns 0 for exact match in type and timestamp', () => {
      expect(Comparators.deadline(fixtures.overdueUrgent, fixtures.overdueUrgent)).toBe(0);
    });

    it('safely handles missing deadline object', () => {
      const m1 = fixtures.missingDeadline;
      const m2 = fixtures.missingDeadline;
      // NaN bug was fixed in production code, this should safely evaluate to 0
      expect(Comparators.deadline(m1, m2)).toBe(0); 
    });
  });

  describe('progress()', () => {
    it('sorts higher progress first', () => {
      const { completedAI, overdueUrgent, activeHealthy } = fixtures;
      
      expect(Comparators.progress(completedAI, overdueUrgent)).toBeLessThan(0); // 100 vs 90
      expect(Comparators.progress(overdueUrgent, activeHealthy)).toBeLessThan(0); // 90 vs 25
    });

    it('safely handles missing progress', () => {
      const missing = fixtures.createMock({ progress: null });
      expect(Comparators.progress(fixtures.activeHealthy, missing)).toBeLessThan(0); // 25 vs 0
    });
  });

  describe('alphabetical()', () => {
    it('sorts A before Z case-insensitive via localeCompare', () => {
      const a = fixtures.createMock({ title: 'Apple' });
      const z = fixtures.createMock({ title: 'Zebra' });
      
      expect(Comparators.alphabetical(a, z)).toBeLessThan(0);
      expect(Comparators.alphabetical(z, a)).toBeGreaterThan(0);
    });

    it('safely handles missing titles', () => {
      const missing1 = fixtures.createMock({ title: null });
      const missing2 = fixtures.createMock({ title: undefined });
      const a = fixtures.createMock({ title: 'A' });
      
      expect(Comparators.alphabetical(missing1, missing2)).toBe(0);
      expect(Comparators.alphabetical(a, missing1)).toBe(1); // 'A' vs '' -> localeCompare can be 1
    });
  });

  describe('recentCreated()', () => {
    it('sorts newer dates before older dates', () => {
      const oldG = fixtures.createMock({ createdAt: 1000 });
      const newG = fixtures.createMock({ createdAt: 2000 });
      
      expect(Comparators.recentCreated(newG, oldG)).toBeLessThan(0);
    });

    it('handles missing createdAt safely', () => {
      expect(Comparators.recentCreated(fixtures.missingTimestamps, fixtures.missingTimestamps)).toBe(0);
    });
  });

  describe('recentUpdated()', () => {
    it('sorts newer dates before older dates', () => {
      const oldG = fixtures.createMock({ updatedAt: 1000 });
      const newG = fixtures.createMock({ updatedAt: 2000 });
      
      expect(Comparators.recentUpdated(newG, oldG)).toBeLessThan(0);
    });

    it('handles missing updatedAt safely', () => {
      expect(Comparators.recentUpdated(fixtures.missingTimestamps, fixtures.missingTimestamps)).toBe(0);
    });
  });
});
