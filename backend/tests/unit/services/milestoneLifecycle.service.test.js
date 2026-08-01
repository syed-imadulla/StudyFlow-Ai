import { MilestoneLifecycleService } from '../../../src/services/milestoneLifecycle.service.js';

describe('MilestoneLifecycleService', () => {
  let originalDate;

  beforeAll(() => {
    originalDate = global.Date;
    const mockDate = new Date('2026-08-01T12:00:00Z'); // Aug 1, 2026
    
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

  it('calculates lifecycle for a milestone', () => {
    const milestone = {
      deadline: '2026-08-01',
      completed: false
    };
    const lifecycle = MilestoneLifecycleService.calculate(milestone);
    
    expect(lifecycle.status).toBe('DUE_TODAY');
    expect(lifecycle.isDueToday).toBe(true);
  });
});
