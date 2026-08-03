/**
 * StudyFlow AI – Goals Domain Mock Data
 * Isolated seed datasets for Goals + Subtasks.
 */

export const SEED_GOALS = [
  {
    id: 'goal-1',
    title: 'DBMS Mini Project',
    urgency: 'URGENT',
    description: 'Complete end-to-end database schema design and frontend integration.',
    finalDeadline: '2026-07-01',
    finalDeadlineDisplay: 'In 4 days',
    progress: 50,
    progressSummary: {
      totalMilestones: 4,
      completedMilestones: 2,
      completionPercentage: 50
    },
    deadlineInfo: {
      type: 'UPCOMING',
      label: 'In 4 days',
      shortLabel: '4d',
      color: 'warning',
      urgencyLevel: 2,
      sortPriority: 60
    },
    lifecycle: {
      status: 'ACTIVE'
    },
    goalHealth: 'ON_TRACK',
    subtasks: [
      { id: 'sub-101', title: 'Design E-R Diagram for University System',   estimate: 'Module 1 • 2h',    priority: 'High',   deadline: '2026-07-17', completed: true, status: 'COMPLETED' },
      { id: 'sub-102', title: 'Normalize relational tables to 3NF',          estimate: 'Module 2 • 1.5h',  priority: 'High',   deadline: '2026-07-18', completed: true, status: 'COMPLETED' },
      { id: 'sub-103', title: 'Write SQL DDL scripts & triggers',            estimate: 'Module 3 • 3h',    priority: 'Medium', deadline: '2026-07-19', completed: false, status: 'TODO' },
      { id: 'sub-104', title: 'Connect Express API & verify endpoints',      estimate: 'Integration • 2h', priority: 'High',   deadline: '2026-07-21', completed: false, status: 'TODO' }
    ]
  },
  {
    id: 'goal-2',
    title: 'OS Lab Assessment',
    urgency: 'UPCOMING',
    description: 'Prepare CPU scheduling algorithms simulation in C++.',
    finalDeadline: '2026-07-05',
    finalDeadlineDisplay: 'In 8 days',
    progress: 33,
    progressSummary: {
      totalMilestones: 3,
      completedMilestones: 1,
      completionPercentage: 33
    },
    deadlineInfo: {
      type: 'UPCOMING',
      label: 'In 8 days',
      shortLabel: '8d',
      color: 'neutral',
      urgencyLevel: 1,
      sortPriority: 70
    },
    lifecycle: {
      status: 'ACTIVE'
    },
    goalHealth: 'ON_TRACK',
    subtasks: [
      { id: 'sub-201', title: 'Code FCFS & SJF algorithms',                   estimate: 'Lab 4 • 2h', priority: 'High',   deadline: '2026-07-26', completed: true, status: 'COMPLETED' },
      { id: 'sub-202', title: 'Implement Round Robin with quantum 4',          estimate: 'Lab 5 • 3h', priority: 'High',   deadline: '2026-07-27', completed: false, status: 'TODO' },
      { id: 'sub-203', title: 'Prepare simulation viva flashcards',            estimate: 'Review • 1h', priority: 'Medium', deadline: '2026-07-28', completed: false, status: 'TODO' }
    ]
  }
];
