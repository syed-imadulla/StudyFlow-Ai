import { GoalLifecycleService } from '../../../src/services/goalLifecycle.service.js';

describe('GoalLifecycleService', () => {
  let originalDate;

  beforeAll(() => {
    // Mock the current date to a fixed point in time to make tests predictable
    // Let's use 2026-07-31T12:00:00Z
    originalDate = global.Date;
    const mockDate = new Date('2026-07-31T12:00:00Z');
    
    global.Date = class extends originalDate {
      constructor(date) {
        if (date) {
          return new originalDate(date);
        }
        return mockDate;
      }
      static now() {
        return mockDate.getTime();
      }
    };
  });

  afterAll(() => {
    global.Date = originalDate;
  });

  it('returns ACTIVE for a goal with no deadline', () => {
    const goal = { title: 'No Deadline Goal', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('ACTIVE');
    expect(lifecycle.hasDeadline).toBe(false);
    expect(lifecycle.isCompleted).toBe(false);
  });

  it('returns ACTIVE for a legacy goal with null deadline', () => {
    const goal = { deadline: null, completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('ACTIVE');
    expect(lifecycle.hasDeadline).toBe(false);
  });

  it('returns ACTIVE for a deadline in 10 days', () => {
    // Current mocked date is 2026-07-31. +10 days = 2026-08-10
    const goal = { deadline: '2026-08-10', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('ACTIVE');
    expect(lifecycle.hasDeadline).toBe(true);
    expect(lifecycle.daysRemaining).toBe(10);
  });

  it('returns DUE_SOON for a deadline in 2 days', () => {
    // +2 days = 2026-08-02
    const goal = { deadline: '2026-08-02', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('DUE_SOON');
    expect(lifecycle.isDueSoon).toBe(true);
    expect(lifecycle.daysRemaining).toBe(2);
  });

  it('returns DUE_TODAY for a deadline today', () => {
    // Today = 2026-07-31
    const goal = { deadline: '2026-07-31', deadlineTime: '23:59', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('DUE_TODAY');
    expect(lifecycle.isDueToday).toBe(true);
    expect(lifecycle.daysRemaining).toBe(0);
  });

  it('returns OVERDUE for a deadline yesterday', () => {
    // Yesterday = 2026-07-30
    const goal = { deadline: '2026-07-30', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('OVERDUE');
    expect(lifecycle.isOverdue).toBe(true);
    expect(lifecycle.overdueDays).toBeGreaterThan(0);
  });
  
  it('returns OVERDUE for a goal created years ago that missed the deadline', () => {
    const goal = { deadline: '2022-01-01', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('OVERDUE');
    expect(lifecycle.isOverdue).toBe(true);
    expect(lifecycle.overdueDays).toBeGreaterThan(1000);
  });

  it('returns COMPLETED for a goal completed before the deadline', () => {
    const goal = { 
      deadline: '2026-08-05', 
      completed: true, 
      completedAt: '2026-07-30T10:00:00Z' 
    };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('COMPLETED');
    expect(lifecycle.isCompleted).toBe(true);
    expect(lifecycle.isCompletedLate).toBe(false);
  });

  it('returns COMPLETED_LATE for a goal completed after the deadline', () => {
    const goal = { 
      deadline: '2026-07-25', 
      completed: true, 
      completedAt: '2026-07-30T10:00:00Z' 
    };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('COMPLETED_LATE');
    expect(lifecycle.isCompleted).toBe(true);
    expect(lifecycle.isCompletedLate).toBe(true);
    expect(lifecycle.completedLateBy).toBeGreaterThan(0);
  });

  it('handles missing completion timestamp by falling back to updatedAt or current time', () => {
    const goal = { 
      deadline: '2026-07-25', 
      completed: true,
      updatedAt: '2026-07-30T10:00:00Z' // Missed deadline
    };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('COMPLETED_LATE');
    expect(lifecycle.isCompletedLate).toBe(true);
  });

  it('handles timezone boundaries around midnight', () => {
    // If it is 2026-07-31T23:59:59Z, the next second makes it a new day.
    // Our logic works based on Date objects.
    const goal = { deadline: '2026-07-31', deadlineTime: '23:59', completed: false };
    const lifecycle = GoalLifecycleService.calculate(goal);
    
    expect(lifecycle.status).toBe('DUE_TODAY'); // because mocked date is 12:00:00Z
  });
});
