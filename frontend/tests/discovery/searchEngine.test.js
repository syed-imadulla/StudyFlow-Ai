const fixtures = require('../fixtures/goalFixtures');

describe('SearchEngine', () => {
  let SearchEngine;

  beforeEach(() => {
    SearchEngine = window.SF_DISCOVERY.SearchEngine;
  });

  const getGoals = () => Object.values(fixtures).filter(f => f && typeof f === 'object' && f.id);

  it('returns all goals wrapped with matches array for empty query', () => {
    const goals = getGoals();
    const result = SearchEngine.search(goals, '');
    
    expect(result.length).toBe(goals.length);
    expect(result[0]).toHaveProperty('goal');
    expect(result[0]).toHaveProperty('matches');
  });

  it('returns all goals wrapped for whitespace-only query', () => {
    const goals = getGoals();
    const result = SearchEngine.search(goals, '   ');
    expect(result.length).toBe(goals.length);
  });

  it('handles null/undefined/empty datasets safely', () => {
    expect(SearchEngine.search(null, 'test')).toEqual([]);
    expect(SearchEngine.search(undefined, 'test')).toEqual([]);
    expect(SearchEngine.search([], 'test')).toEqual([]);
  });

  it('matches exactly based on title', () => {
    const goals = [fixtures.activeHealthy, fixtures.overdueUrgent];
    const result = SearchEngine.search(goals, 'math');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.activeHealthy.id);
  });

  it('matches exactly based on description', () => {
    const goals = [fixtures.activeHealthy, fixtures.overdueUrgent];
    const result = SearchEngine.search(goals, 'calculus');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.overdueUrgent.id);
  });

  it('matches exactly based on category', () => {
    const goals = [fixtures.activeHealthy, fixtures.dueTodayHigh];
    const result = SearchEngine.search(goals, 'study');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.activeHealthy.id);
  });

  it('matches exactly based on milestone titles and descriptions', () => {
    const goals = [fixtures.withMilestones, fixtures.emptyMilestones];
    const result = SearchEngine.search(goals, 'step 2');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.withMilestones.id);
  });

  it('matches exactly based on AI source', () => {
    const goals = [fixtures.completedAI, fixtures.activeHealthy];
    const result = SearchEngine.search(goals, 'ai generated');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.completedAI.id);
  });

  it('is case-insensitive and trims input', () => {
    const goals = [fixtures.activeHealthy];
    const result = SearchEngine.search(goals, '   MaTh   ');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.activeHealthy.id);
  });

  it('returns empty array when no matches found', () => {
    const result = SearchEngine.search(getGoals(), 'nonexistentgibberish');
    expect(result.length).toBe(0);
  });

  it('supports unicode searches', () => {
    const goals = [fixtures.unicodeContent, fixtures.activeHealthy];
    const result = SearchEngine.search(goals, '学ぶ');
    
    expect(result.length).toBe(1);
    expect(result[0].goal.id).toBe(fixtures.unicodeContent.id);
  });
});
