const fixtures = require('../fixtures/goalFixtures');

describe('Performance Benchmarks', () => {
  let DiscoveryPipeline;

  beforeEach(() => {
    DiscoveryPipeline = window.SF_DISCOVERY.DiscoveryPipeline;
  });

  const generateMockGoals = (count) => {
    const goals = [];
    const base = fixtures.activeHealthy;
    
    for (let i = 0; i < count; i++) {
      goals.push({
        ...base,
        id: `mock-${i}`,
        title: `Goal ${i}`,
        searchText: `goal ${i} math study manual`,
        priority: i % 2 === 0 ? 'HIGH' : 'LOW',
        createdAt: 1000000 + i,
        updatedAt: 1000000 + i
      });
    }
    return goals;
  };

  it('completes DiscoveryPipeline for 1000 goals well within threshold (200ms)', () => {
    const goals = generateMockGoals(1000);
    const state = {
      search: 'goal',
      filters: { priority: ['HIGH'] }, // roughly 500 will match
      sort: 'RECENT_UPDATED' // will trigger timestamp fallback parsing
    };
    
    const start = performance.now();
    
    const result = DiscoveryPipeline.execute(goals, state);
    
    const end = performance.now();
    const duration = end - start;
    
    // Test logic guarantees
    expect(result.length).toBe(500);
    
    // Performance guarantee (very conservative max for CI environments)
    expect(duration).toBeLessThan(200); 
    
    // Generally it should take <10ms in Node, but 200ms is a safe threshold to prevent flaky CI failures
  });
});
