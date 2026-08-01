import { LifecycleEngine } from '../../../src/services/shared/lifecycle.engine.js';

describe('LifecycleEngine', () => {
  let originalDate;

  beforeAll(() => {
    originalDate = global.Date;
    const mockDate = new Date('2026-08-01T12:00:00Z');
    
    global.Date = class extends originalDate {
      constructor(...args) {
        if (args.length > 0) {
          return new originalDate(...args);
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

  it('handles no deadline', () => {
    const entity = {};
    const lifecycle = LifecycleEngine.calculate(entity);
    
    expect(lifecycle.status).toBe('ACTIVE');
    expect(lifecycle.hasDeadline).toBe(false);
  });

  it('handles DUE_TODAY', () => {
    const entity = {
      deadline: '2026-08-01',
      deadlineTime: '23:59:59'
    };
    const lifecycle = LifecycleEngine.calculate(entity);
    
    expect(lifecycle.status).toBe('DUE_TODAY');
    expect(lifecycle.isDueToday).toBe(true);
    expect(lifecycle.daysRemaining).toBe(0);
  });

  it('handles DUE_SOON', () => {
    const entity = {
      deadline: '2026-08-02'
    };
    const lifecycle = LifecycleEngine.calculate(entity);
    
    expect(lifecycle.status).toBe('DUE_SOON');
    expect(lifecycle.isDueSoon).toBe(true);
    expect(lifecycle.daysRemaining).toBe(1);
  });

  it('handles OVERDUE', () => {
    const entity = {
      deadline: '2026-07-31',
      deadlineTime: '23:59:59'
    };
    const lifecycle = LifecycleEngine.calculate(entity);
    
    expect(lifecycle.status).toBe('OVERDUE');
    expect(lifecycle.isOverdue).toBe(true);
    expect(lifecycle.overdueDays).toBe(1);
  });

  it('handles COMPLETED on time', () => {
    const entity = {
      deadline: '2026-08-01',
      completed: true,
      completedAt: new Date(2026, 7, 1, 10, 0, 0)
    };
    const lifecycle = LifecycleEngine.calculate(entity);
    
    expect(lifecycle.status).toBe('COMPLETED');
    expect(lifecycle.isCompleted).toBe(true);
    expect(lifecycle.isCompletedLate).toBe(false);
  });

  it('handles COMPLETED_LATE', () => {
    const entity = {
      deadline: '2026-07-31',
      completed: true,
      completedAt: new Date(2026, 7, 1, 10, 0, 0)
    };
    const lifecycle = LifecycleEngine.calculate(entity);
    
    expect(lifecycle.status).toBe('COMPLETED_LATE');
    expect(lifecycle.isCompletedLate).toBe(true);
    expect(lifecycle.completedLateBy).toBe(1);
  });
});
