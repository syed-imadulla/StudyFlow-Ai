/**
 * Shared mock models (ViewModels) matching the output from WorkspaceMapper.
 */

const baseGoal = {
  id: 'base-1',
  title: 'Base Goal',
  description: 'Base Description',
  rawStatus: 'ACTIVE',
  createdAt: 1000000000000,
  updatedAt: 1000000000000,
  priority: 'LOW',
  category: 'Uncategorized',
  source: 'MANUAL',
  metadata: {},
  searchText: 'base goal base description uncategorized manual',
  health: { status: 'HEALTHY', score: 100, label: 'Healthy', color: 'green' },
  deadline: { type: 'NO_DEADLINE', sortPriority: 0, urgencyLevel: 0 },
  progress: { percentage: 0, label: 'Not Started' },
  blockingMilestone: null,
  subtasks: [],
  _raw: {}
};

const createMock = (overrides = {}) => ({ ...baseGoal, ...overrides, _raw: { ...baseGoal._raw, ...(overrides._raw || {}) } });

module.exports = {
  createMock,
  activeHealthy: createMock({
    id: 'g-active-healthy',
    title: 'Learn Math',
    category: 'Study',
    searchText: 'learn math  study manual',
    priority: 'MEDIUM',
    progress: { percentage: 25, label: 'In Progress' }
  }),
  
  overdueUrgent: createMock({
    id: 'g-overdue-urgent',
    title: 'Finish Assignment',
    description: 'Calculus homework',
    category: 'University',
    searchText: 'finish assignment calculus homework university manual',
    priority: 'URGENT',
    health: { status: 'OVERDUE', score: 0, label: 'Overdue', color: 'red' },
    deadline: { type: 'OVERDUE', timestamp: 500000000000, sortPriority: 5, urgencyLevel: 5 },
    progress: { percentage: 90, label: 'Almost Done' }
  }),
  
  dueTodayHigh: createMock({
    id: 'g-due-today',
    title: 'Team Meeting',
    priority: 'HIGH',
    category: 'Work',
    searchText: 'team meeting  work manual',
    deadline: { type: 'TODAY', timestamp: 1500000000000, sortPriority: 4, urgencyLevel: 4 },
    health: { status: 'DUE_TODAY', score: 50, label: 'Due Today', color: 'yellow' }
  }),
  
  completedAI: createMock({
    id: 'g-completed-ai',
    title: 'Read Book',
    category: 'Personal',
    source: 'AI',
    searchText: 'read book  personal ai generated',
    rawStatus: 'COMPLETED',
    progress: { percentage: 100, label: 'Completed' },
    health: { status: 'COMPLETED', score: 100, label: 'Completed', color: 'green' },
    priority: 'LOW'
  }),
  
  archivedGoal: createMock({
    id: 'g-archived',
    title: 'Old Goal',
    rawStatus: 'ARCHIVED',
    health: { status: 'ARCHIVED', score: 0, label: 'Archived', color: 'gray' },
    searchText: 'old goal   manual',
    priority: 'LOW'
  }),
  
  missingTimestamps: createMock({
    id: 'g-missing-time',
    createdAt: null,
    updatedAt: undefined
  }),
  
  missingDeadline: createMock({
    id: 'g-missing-deadline',
    deadline: null
  }),
  
  unknownPriority: createMock({
    id: 'g-unknown-priority',
    priority: 'CRITICAL_BOGUS'
  }),
  
  unicodeContent: createMock({
    id: 'g-unicode',
    title: '学ぶ (Learn)',
    description: '日本語',
    searchText: '学ぶ (learn) 日本語  manual'
  }),
  
  withMilestones: createMock({
    id: 'g-with-milestones',
    title: 'Project',
    searchText: 'project   step 1 do this step 2 do that manual',
    subtasks: [
      { id: 's1', title: 'Step 1', description: 'Do this' },
      { id: 's2', title: 'Step 2', description: 'Do that' }
    ]
  }),
  
  emptyMilestones: createMock({
    id: 'g-empty-milestones',
    subtasks: []
  }),
  
  dueTomorrow: createMock({
    id: 'g-due-tomorrow',
    title: 'Tomorrow Goal',
    deadline: { type: 'TOMORROW', timestamp: 1600000000000 }
  }),
  
  upcoming: createMock({
    id: 'g-upcoming',
    title: 'Upcoming Goal',
    deadline: { type: 'UPCOMING', timestamp: 1700000000000 }
  })
};
