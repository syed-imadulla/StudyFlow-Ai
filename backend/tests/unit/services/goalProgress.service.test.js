import { GoalProgressService } from '../../../src/services/goalProgress.service.js';

describe('GoalProgressService', () => {
  it('handles empty milestone list', () => {
    const { progressSummary, goalHealth } = GoalProgressService.calculate([], 25);
    
    expect(progressSummary.totalMilestones).toBe(0);
    expect(progressSummary.completionPercentage).toBe(25); // Uses fallback
    expect(progressSummary.remainingMilestones).toBe(0);
    expect(goalHealth.status).toBe('HEALTHY');
    expect(goalHealth.score).toBe(100);
  });

  it('aggregates mixed milestones correctly', () => {
    const milestones = [
      { id: '1', completed: true, lifecycle: { status: 'COMPLETED' } },
      { id: '2', completed: true, lifecycle: { status: 'COMPLETED_LATE', isCompletedLate: true } },
      { id: '3', completed: false, lifecycle: { status: 'OVERDUE' } },
      { id: '4', completed: false, lifecycle: { status: 'DUE_TODAY' } },
      { id: '5', completed: false, lifecycle: { status: 'DUE_SOON' } },
      { id: '6', completed: false, lifecycle: { status: 'ACTIVE' } },
      { id: '7', completed: false, lifecycle: { status: 'ACTIVE' } }
    ];

    const { progressSummary, goalHealth } = GoalProgressService.calculate(milestones, 0);

    expect(progressSummary.totalMilestones).toBe(7);
    expect(progressSummary.completedMilestones).toBe(2);
    expect(progressSummary.remainingMilestones).toBe(5);
    expect(progressSummary.activeMilestones).toBe(2);
    expect(progressSummary.dueSoonMilestones).toBe(1);
    expect(progressSummary.dueTodayMilestones).toBe(1);
    expect(progressSummary.overdueMilestones).toBe(1);
    expect(progressSummary.completedLateMilestones).toBe(1);
    expect(Math.round(progressSummary.completionPercentage)).toBe(29);
    
    // nextMilestone should be the OVERDUE one (id 3)
    expect(progressSummary.nextMilestone.id).toBe('3');

    // Health: 100 - (1 * 15) - (1 * 5) = 80
    expect(goalHealth.score).toBe(80);
    expect(goalHealth.status).toBe('NEEDS_ATTENTION');

    // Check blocking assignment
    const overdueMilestone = milestones.find(m => m.id === '3');
    expect(overdueMilestone.isBlocking).toBe(true);

    const activeMilestone = milestones.find(m => m.id === '6');
    expect(activeMilestone.isBlocking).toBe(false);
  });

  it('handles all completed milestones', () => {
    const milestones = [
      { id: '1', completed: true, lifecycle: { status: 'COMPLETED' } },
      { id: '2', completed: true, lifecycle: { status: 'COMPLETED' } }
    ];

    const { progressSummary, goalHealth } = GoalProgressService.calculate(milestones, 0);

    expect(progressSummary.completedMilestones).toBe(2);
    expect(progressSummary.remainingMilestones).toBe(0);
    expect(progressSummary.completionPercentage).toBe(100);
    expect(progressSummary.nextMilestone).toBeNull();
    
    expect(goalHealth.score).toBe(100);
  });
});
