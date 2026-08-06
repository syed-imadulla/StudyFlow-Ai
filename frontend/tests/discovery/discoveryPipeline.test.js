const fixtures = require('../fixtures/goalFixtures');

describe('DiscoveryPipeline', () => {
  let DiscoveryPipeline;
  let SearchEngine;
  let FilterEngine;
  let SortEngine;

  beforeEach(() => {
    DiscoveryPipeline = window.SF_DISCOVERY.DiscoveryPipeline;
    SearchEngine = window.SF_DISCOVERY.SearchEngine;
    FilterEngine = window.SF_DISCOVERY.FilterEngine;
    SortEngine = window.SF_DISCOVERY.SortEngine;
    
    // Spy on the engines to assert call order
    jest.spyOn(SearchEngine, 'search');
    jest.spyOn(FilterEngine, 'filter');
    jest.spyOn(SortEngine, 'sort');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const getGoals = () => Object.values(fixtures).filter(f => f && typeof f === 'object' && f.id);

  it('executes exactly in order: Search -> Filter -> Sort', () => {
    const goals = getGoals();
    const state = {
      search: 'test',
      filters: { priority: ['HIGH'] },
      sort: 'PRIORITY'
    };

    DiscoveryPipeline.execute(goals, state);

    // Get mock invocation order
    const searchOrder = SearchEngine.search.mock.invocationCallOrder[0];
    const filterOrder = FilterEngine.filter.mock.invocationCallOrder[0];
    const sortOrder = SortEngine.sort.mock.invocationCallOrder[0];

    expect(searchOrder).toBeLessThan(filterOrder);
    expect(filterOrder).toBeLessThan(sortOrder);
  });

  it('handles null state safely', () => {
    const goals = getGoals();
    const result = DiscoveryPipeline.execute(goals, null);
    
    // Default filters out completed and archived, so 13 - 2 = 11
    expect(result.length).toBe(11);
    // The result should just be the goals stripped of the matches wrapper
    expect(result[0]).not.toHaveProperty('matches');
    expect(result[0].id).toBeDefined(); // Returns unwrapped goals
  });

  it('handles empty datasets safely', () => {
    const result = DiscoveryPipeline.execute([], { search: 'x' });
    expect(result).toEqual([]);
    
    const resultNull = DiscoveryPipeline.execute(null, { search: 'x' });
    expect(resultNull).toEqual([]);
  });

  it('strips the internal wrapper structure and returns raw ViewModels', () => {
    const goals = getGoals();
    const result = DiscoveryPipeline.execute(goals, {});
    
    expect(result.length).toBe(goals.length);
    result.forEach(goal => {
      // Must not be { goal: ..., matches: ... }
      expect(goal).not.toHaveProperty('goal');
      expect(goal).not.toHaveProperty('matches');
      expect(goal).toHaveProperty('id');
    });
  });

  it('performs end-to-end discovery correctly', () => {
    const goals = [
      fixtures.activeHealthy, // math, MEDIUM
      fixtures.dueTodayHigh, // meeting, HIGH, TODAY
      fixtures.overdueUrgent // calculus, URGENT, OVERDUE
    ];
    
    const state = {
      search: 'm', // matches math, meeting, homework (wait, does overdueUrgent match 'm'? homework has 'm')
      filters: { priority: ['HIGH', 'URGENT'] },
      sort: 'DEADLINE'
    };
    
    const result = DiscoveryPipeline.execute(goals, state);
    
    // overdueUrgent (URGENT, OVERDUE) and dueTodayHigh (HIGH, TODAY) both match 'm' in searchText
    // activeHealthy matches 'm' but is MEDIUM priority (filtered out)
    expect(result.length).toBe(2);
    
    // Sort is DEADLINE. OVERDUE is more urgent than TODAY.
    expect(result[0].id).toBe(fixtures.overdueUrgent.id);
    expect(result[1].id).toBe(fixtures.dueTodayHigh.id);
  });
});
