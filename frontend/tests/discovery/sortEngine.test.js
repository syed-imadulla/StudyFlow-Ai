const fixtures = require('../fixtures/goalFixtures');

describe('SortEngine', () => {
  let SortEngine;

  beforeEach(() => {
    SortEngine = window.SF_DISCOVERY.SortEngine;
  });

  const wrapGoals = (goals) => goals.map(g => ({ goal: g, matches: [] }));

  it('handles null/undefined/empty gracefully', () => {
    expect(SortEngine.sort(null, 'PRIORITY')).toEqual([]);
    expect(SortEngine.sort(undefined, 'PRIORITY')).toEqual([]);
    expect(SortEngine.sort([], 'PRIORITY')).toEqual([]);
  });

  it('sorts by primary mode (e.g. ALPHABETICAL)', () => {
    const goals = wrapGoals([
      fixtures.createMock({ title: 'Zebra' }),
      fixtures.createMock({ title: 'Apple' }),
      fixtures.createMock({ title: 'Mango' })
    ]);
    
    const sorted = SortEngine.sort(goals, 'ALPHABETICAL');
    
    expect(sorted[0].goal.title).toBe('Apple');
    expect(sorted[1].goal.title).toBe('Mango');
    expect(sorted[2].goal.title).toBe('Zebra');
  });

  it('sorts by RECENT_CREATED', () => {
    const goals = wrapGoals([
      fixtures.createMock({ title: 'Old', createdAt: 1000 }),
      fixtures.createMock({ title: 'New', createdAt: 2000 })
    ]);
    
    const sorted = SortEngine.sort(goals, 'RECENT_CREATED');
    
    expect(sorted[0].goal.title).toBe('New');
    expect(sorted[1].goal.title).toBe('Old');
  });
  
  it('sorts by RECENT_UPDATED', () => {
    const goals = wrapGoals([
      fixtures.createMock({ title: 'Old', updatedAt: 1000 }),
      fixtures.createMock({ title: 'New', updatedAt: 2000 })
    ]);
    
    const sorted = SortEngine.sort(goals, 'RECENT_UPDATED');
    
    expect(sorted[0].goal.title).toBe('New');
    expect(sorted[1].goal.title).toBe('Old');
  });
  
  it('sorts by PROGRESS', () => {
    const goals = wrapGoals([
      fixtures.createMock({ title: 'Start', progress: { percentage: 0 } }),
      fixtures.createMock({ title: 'Done', progress: { percentage: 100 } })
    ]);
    
    const sorted = SortEngine.sort(goals, 'PROGRESS');
    
    expect(sorted[0].goal.title).toBe('Done');
    expect(sorted[1].goal.title).toBe('Start');
  });

  describe('Stable Fallback Chain (PRIORITY)', () => {
    it('sorts by Priority -> Deadline -> UpdatedAt -> CreatedAt -> Title', () => {
      const goals = wrapGoals([
        // Both HIGH priority, same deadline, same updated, different created
        fixtures.createMock({ title: 'B', priority: 'HIGH', deadline: { type: 'TODAY', timestamp: 100 }, updatedAt: 500, createdAt: 100 }),
        fixtures.createMock({ title: 'A', priority: 'HIGH', deadline: { type: 'TODAY', timestamp: 100 }, updatedAt: 500, createdAt: 200 }),
        // URGENT, should be first
        fixtures.createMock({ title: 'C', priority: 'URGENT', deadline: { type: 'UPCOMING', timestamp: 800 }, updatedAt: 0, createdAt: 0 }),
        // Both HIGH, different deadlines
        fixtures.createMock({ title: 'D', priority: 'HIGH', deadline: { type: 'OVERDUE', timestamp: 50 }, updatedAt: 0, createdAt: 0 })
      ]);
      
      const sorted = SortEngine.sort(goals, 'PRIORITY');
      
      // Expected Order:
      // 1. C (URGENT)
      // 2. D (HIGH, OVERDUE)
      // 3. A (HIGH, TODAY, createdAt: 200) -> newer creation
      // 4. B (HIGH, TODAY, createdAt: 100)
      
      expect(sorted[0].goal.title).toBe('C');
      expect(sorted[1].goal.title).toBe('D');
      expect(sorted[2].goal.title).toBe('A');
      expect(sorted[3].goal.title).toBe('B');
    });

    it('falls back all the way to alphabetical title if everything is tied', () => {
      const goals = wrapGoals([
        fixtures.createMock({ title: 'Zebra', priority: 'LOW', deadline: null, updatedAt: 0, createdAt: 0 }),
        fixtures.createMock({ title: 'Apple', priority: 'LOW', deadline: null, updatedAt: 0, createdAt: 0 })
      ]);
      
      const sorted = SortEngine.sort(goals, 'PRIORITY');
      expect(sorted[0].goal.title).toBe('Apple');
      expect(sorted[1].goal.title).toBe('Zebra');
    });
    
    it('uses PRIORITY as default sort mode if missing', () => {
      const goals = wrapGoals([
        fixtures.createMock({ title: 'Zebra', priority: 'LOW' }),
        fixtures.createMock({ title: 'Apple', priority: 'URGENT' })
      ]);
      
      const sorted = SortEngine.sort(goals, null);
      expect(sorted[0].goal.title).toBe('Apple');
    });
  });

});
