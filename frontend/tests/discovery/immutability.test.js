const fixtures = require('../fixtures/goalFixtures');

describe('Immutability Guarantees', () => {
  let DiscoveryPipeline;
  let SearchEngine;
  let FilterEngine;
  let SortEngine;

  beforeEach(() => {
    DiscoveryPipeline = window.SF_DISCOVERY.DiscoveryPipeline;
    SearchEngine = window.SF_DISCOVERY.SearchEngine;
    FilterEngine = window.SF_DISCOVERY.FilterEngine;
    SortEngine = window.SF_DISCOVERY.SortEngine;
  });

  const getGoals = () => [
    JSON.parse(JSON.stringify(fixtures.activeHealthy)),
    JSON.parse(JSON.stringify(fixtures.dueTodayHigh)),
    JSON.parse(JSON.stringify(fixtures.overdueUrgent))
  ];

  it('SearchEngine does not mutate original array or objects', () => {
    const goals = getGoals();
    const originalRef = goals;
    const clone = JSON.parse(JSON.stringify(goals));

    const result = SearchEngine.search(goals, 'math');
    
    // Result is a new array
    expect(result).not.toBe(originalRef);
    
    // Original array elements are identical
    expect(goals).toEqual(clone);
  });

  it('FilterEngine does not mutate original array or objects', () => {
    const goals = getGoals().map(g => ({ goal: g, matches: [] }));
    const originalRef = goals;
    const clone = JSON.parse(JSON.stringify(goals));

    const result = FilterEngine.filter(goals, { priority: ['HIGH'] });
    
    expect(result).not.toBe(originalRef);
    expect(goals).toEqual(clone);
  });

  it('SortEngine does not mutate original array or objects', () => {
    const goals = getGoals().map(g => ({ goal: g, matches: [] }));
    const originalRef = goals;
    const clone = JSON.parse(JSON.stringify(goals));

    const result = SortEngine.sort(goals, 'PRIORITY');
    
    expect(result).not.toBe(originalRef);
    
    // Check that original array order did NOT change
    expect(goals[0].goal.id).toBe(clone[0].goal.id);
    expect(goals[1].goal.id).toBe(clone[1].goal.id);
    expect(goals[2].goal.id).toBe(clone[2].goal.id);
    expect(goals).toEqual(clone);
  });

  it('DiscoveryPipeline does not mutate original array or objects', () => {
    const goals = getGoals();
    const originalRef = goals;
    const clone = JSON.parse(JSON.stringify(goals));

    const result = DiscoveryPipeline.execute(goals, {
      search: 'm',
      filters: { priority: ['HIGH'] },
      sort: 'PRIORITY'
    });
    
    expect(result).not.toBe(originalRef);
    expect(goals).toEqual(clone);
  });
});
