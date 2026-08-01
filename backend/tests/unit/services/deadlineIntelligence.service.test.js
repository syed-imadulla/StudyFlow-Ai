import { DeadlineIntelligenceService } from '../../../src/services/deadlineIntelligence.service.js';

describe('DeadlineIntelligenceService', () => {
  it('handles no deadline', () => {
    const goal = {};
    const lifecycle = {
      hasDeadline: false,
      status: 'ACTIVE'
    };
    
    const info = DeadlineIntelligenceService.calculate(goal, lifecycle);
    
    expect(info.type).toBe('NO_DEADLINE');
    expect(info.label).toBe('No deadline');
    expect(info.color).toBe('neutral');
    expect(info.urgencyLevel).toBe(0);
    expect(info.sortPriority).toBe(0);
  });

  it('handles DUE_TODAY', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'DUE_TODAY',
      daysRemaining: 0
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('TODAY');
    expect(info.label).toBe('Today');
    expect(info.color).toBe('orange');
    expect(info.badge).toBe('warning');
    expect(info.urgencyLevel).toBe(3);
    expect(info.sortPriority).toBe(90);
  });

  it('handles DUE_SOON (Tomorrow)', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'DUE_SOON',
      daysRemaining: 1
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('TOMORROW');
    expect(info.label).toBe('Tomorrow');
    expect(info.color).toBe('warning');
    expect(info.badge).toBe('warning');
    expect(info.urgencyLevel).toBe(2);
    expect(info.sortPriority).toBe(70);
  });

  it('handles DUE_SOON (In X days)', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'DUE_SOON',
      daysRemaining: 3
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('UPCOMING');
    expect(info.label).toBe('In 3 days');
    expect(info.color).toBe('warning');
  });

  it('handles OVERDUE (Yesterday)', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'OVERDUE',
      overdueDays: 1
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('OVERDUE');
    expect(info.label).toBe('Yesterday');
    expect(info.color).toBe('danger');
    expect(info.badge).toBe('danger');
    expect(info.urgencyLevel).toBe(4);
    expect(info.sortPriority).toBe(100);
  });

  it('handles OVERDUE (Multiple days)', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'OVERDUE',
      overdueDays: 5
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.label).toBe('Overdue by 5 days');
  });

  it('handles COMPLETED (Exactly on time)', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'COMPLETED',
      completedEarlyBy: 0
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('COMPLETED_TODAY');
    expect(info.label).toBe('Completed today');
    expect(info.color).toBe('success');
    expect(info.urgencyLevel).toBe(0);
    expect(info.sortPriority).toBe(20);
  });

  it('handles COMPLETED (Early)', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'COMPLETED',
      completedEarlyBy: 2
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('COMPLETED_EARLY');
    expect(info.label).toBe('Completed 2 days early');
    expect(info.color).toBe('success');
  });

  it('handles COMPLETED_LATE', () => {
    const lifecycle = {
      hasDeadline: true,
      status: 'COMPLETED_LATE',
      completedLateBy: 3
    };
    
    const info = DeadlineIntelligenceService.calculate({}, lifecycle);
    
    expect(info.type).toBe('COMPLETED_LATE');
    expect(info.label).toBe('Completed 3 days late');
    expect(info.color).toBe('purple');
    expect(info.badge).toBe('info');
    expect(info.urgencyLevel).toBe(0);
    expect(info.sortPriority).toBe(10);
  });

  it('handles ACTIVE (In X days vs In X weeks)', () => {
    const lifecycleDays = {
      hasDeadline: true,
      status: 'ACTIVE',
      daysRemaining: 10
    };
    const infoDays = DeadlineIntelligenceService.calculate({}, lifecycleDays);
    expect(infoDays.label).toBe('In 10 days');
    expect(infoDays.color).toBe('neutral');

    const lifecycleWeeks = {
      hasDeadline: true,
      status: 'ACTIVE',
      daysRemaining: 14
    };
    const infoWeeks = DeadlineIntelligenceService.calculate({}, lifecycleWeeks);
    expect(infoWeeks.label).toBe('In 2 weeks');
  });
});
