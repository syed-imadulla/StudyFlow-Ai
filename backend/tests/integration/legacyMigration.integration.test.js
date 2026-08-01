import mongoose from 'mongoose';
import { runMigration } from '../../scripts/migrations/migrationRunner.js';
import { GoalLifecycleService } from '../../src/services/goalLifecycle.service.js';
import { MilestoneLifecycleService } from '../../src/services/milestoneLifecycle.service.js';
import { DeadlineIntelligenceService } from '../../src/services/deadlineIntelligence.service.js';
import { GoalProgressService } from '../../src/services/goalProgress.service.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

describe('Legacy Migration & Intelligence Pipeline Idempotency', () => {
  const TEST_DB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/studyflow_test_migration';
  
  beforeAll(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
    await mongoose.connect(TEST_DB_URI);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
  });
  
  beforeEach(async () => {
    await mongoose.connection.db.collection('goals').deleteMany({});
    await mongoose.connection.db.collection('schema_migrations').deleteMany({});
  });

  it('safely migrates legacy document, runs through pipeline, and verifies idempotency', async () => {
    // 1. Insert Legacy Data
    const legacyGoalId = new mongoose.Types.ObjectId();
    const legacyMilestoneId = new mongoose.Types.ObjectId();
    
    await mongoose.connection.db.collection('goals').insertOne({
      _id: legacyGoalId,
      title: "Test Legacy Goal",
      subtasks: [
        {
          _id: legacyMilestoneId,
          title: "Complete Tomorrow",
          deadlineDisplay: "Tomorrow",
          completed: false
        }
      ],
      createdAt: new Date("2026-08-01T10:00:00Z")
    });

    // 2. First Execution (Production Mode)
    const run1 = await runMigration('001_migrate_deadlines.js', { 
      dryRun: false, 
      force: false,
      dbUrl: TEST_DB_URI
    });
    
    expect(run1.skipped).toBe(false);
    expect(run1.report.goalsUpdated).toBe(1);
    expect(run1.report.milestonesUpdated).toBe(1);
    
    // Verify Migration Record
    const history = await mongoose.connection.db.collection('schema_migrations').find({}).toArray();
    expect(history.length).toBe(1);
    expect(history[0].version).toBe('001_migrate_deadlines');
    expect(history[0].status).toBe('SUCCESS');
    
    // 3. Verify Database State
    const goalDoc = await mongoose.connection.db.collection('goals').findOne({ _id: legacyGoalId });
    const subtask = goalDoc.subtasks[0];
    
    expect(subtask.deadlineDisplay).toBeUndefined();
    expect(subtask.deadline).toBe('2026-08-02');
    expect(subtask.deadlineTime).toBeNull();
    
    // 4. Verify Intelligence Pipeline
    const goal = { ...goalDoc };
    goal.subtasks.forEach(s => {
      s.lifecycle = MilestoneLifecycleService.calculate(s);
      s.deadlineInfo = DeadlineIntelligenceService.calculate(goal, s.lifecycle);
    });
    const { progressSummary, goalHealth } = GoalProgressService.calculate(goal.subtasks, 0);
    goal.progressSummary = progressSummary;
    goal.goalHealth = goalHealth;
    goal.lifecycle = GoalLifecycleService.calculate(goal);
    
    const pipelineSubtask = goal.subtasks[0];
    expect(pipelineSubtask.lifecycle.hasDeadline).toBe(true);
    expect(pipelineSubtask.deadlineInfo.type).toBeDefined();
    expect(pipelineSubtask.deadlineInfo.type).not.toBe('NO_DEADLINE');
    
    // 5. Second Execution (Idempotency)
    const run2 = await runMigration('001_migrate_deadlines.js', {
      dryRun: false,
      force: false,
      dbUrl: TEST_DB_URI
    });
    
    expect(run2.skipped).toBe(true);
    
    // Ensure no new production execution was created
    const history2 = await mongoose.connection.db.collection('schema_migrations').find({}).toArray();
    expect(history2.length).toBe(1); // Still 1 record
    
    // 6. Force Execution (Idempotency override)
    const run3 = await runMigration('001_migrate_deadlines.js', {
      dryRun: false,
      force: true,
      dbUrl: TEST_DB_URI
    });
    
    expect(run3.skipped).toBe(false);
    expect(run3.report.goalsUpdated).toBe(0); // None to update because it's already migrated
    expect(run3.report.alreadyMigrated).toBe(1); 
    
    const history3 = await mongoose.connection.db.collection('schema_migrations').find({}).toArray();
    expect(history3.length).toBe(2); // Second record inserted for the forced run
  });
});
