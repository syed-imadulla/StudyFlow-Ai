import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
import { GoalProgressService } from './src/services/goalProgress.service.js';
import { MilestoneLifecycleService } from './src/services/milestoneLifecycle.service.js';
import { GoalLifecycleService } from './src/services/goalLifecycle.service.js';

dotenv.config();

async function trace() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  // 1. Layer 1: MongoDB
  const goalDoc = await Goal.findOne({ 'subtasks.deadline': { $exists: true, $ne: null } });
  if (!goalDoc) {
     console.log("No milestone found with a deadline.");
     process.exit(0);
  }
  
  const subtaskDoc = goalDoc.subtasks.find(s => !s.completed && s.deadline);
  console.log("=== Layer 1: MongoDB ===");
  console.log({
    goalId: goalDoc._id.toString(),
    milestoneId: subtaskDoc._id.toString(),
    completed: subtaskDoc.completed,
    deadline: subtaskDoc.deadline,
    lifecycleStatus: subtaskDoc.lifecycle?.status,
    deadlineInfoLabel: subtaskDoc.deadlineInfo?.label
  });
  
  // 2. Layer 2: API JSON (GoalService)
  const goal = goalDoc.toJSON ? goalDoc.toJSON() : { ...goalDoc };
  if (goal.subtasks && goal.subtasks.length > 0) {
    goal.subtasks.forEach(subtask => {
      subtask.lifecycle = MilestoneLifecycleService.calculate(subtask);
    });
  }
  const { progressSummary, goalHealth } = GoalProgressService.calculate(goal.subtasks || [], 0);
  goal.progressSummary = progressSummary;
  goal.goalHealth = goalHealth;
  goal.progress = progressSummary.completionPercentage;
  goal.lifecycle = GoalLifecycleService.calculate(goal);
  
  const apiSubtask = goal.subtasks.find(s => s.id === subtaskDoc._id.toString());
  console.log("\n=== Layer 2: API JSON ===");
  console.log({
    goalId: goal.id,
    milestoneId: apiSubtask.id,
    completed: apiSubtask.completed,
    deadline: apiSubtask.deadline,
    lifecycleStatus: apiSubtask.lifecycle?.status,
    isDueToday: apiSubtask.lifecycle?.isDueToday,
    isDueSoon: apiSubtask.lifecycle?.isDueSoon,
    isOverdue: apiSubtask.lifecycle?.isOverdue,
    deadlineInfoLabel: apiSubtask.deadlineInfo?.label
  });

  // 3. Layer 3: SF_STORE
  // The frontend receives the exact JSON and puts it into state.items
  const storeItems = [goal];
  const storeSubtask = storeItems[0].subtasks.find(s => s.id === apiSubtask.id);
  console.log("\n=== Layer 3: SF_STORE ===");
  console.log({
    goalId: storeItems[0].id,
    milestoneId: storeSubtask.id,
    completed: storeSubtask.completed,
    deadline: storeSubtask.deadline,
    lifecycleStatus: storeSubtask.lifecycle?.status,
    isDueToday: storeSubtask.lifecycle?.isDueToday,
    isDueSoon: storeSubtask.lifecycle?.isDueSoon,
    isOverdue: storeSubtask.lifecycle?.isOverdue,
    deadlineInfoLabel: storeSubtask.deadlineInfo?.label
  });

  // 4. Layer 4: Dashboard
  let dashIncluded = false;
  storeItems.forEach(g => {
    if (g.status === 'COMPLETED') return;
    (g.subtasks || []).forEach(subCopy => {
      if (!subCopy.completed && subCopy.lifecycle && subCopy.deadlineInfo) {
        const isToday = subCopy.lifecycle.isDueToday;
        const isOverdue = subCopy.lifecycle.isOverdue;
        const isDueSoon = subCopy.lifecycle.isDueSoon;
        if (isToday || isOverdue || isDueSoon) {
          if (subCopy.id === storeSubtask.id) dashIncluded = true;
        }
      }
    });
  });
  console.log("\n=== Layer 4: Dashboard ===");
  console.log("Included in Dashboard allSubtasks?", dashIncluded);

  // 5. Layer 5: Planner
  let plannerIncluded = false;
  let milestones = [];
  storeItems.forEach(g => {
    if (g.archived || g.deleted || g.status === 'archived' || g.status === 'deleted') return;
    if (!g.subtasks) return;
    g.subtasks.forEach(sub => {
      if (sub.completed || !sub.title || sub.title.trim() === '') return;
      let dueObj = null;
      if (sub.deadline) {
        const parts = sub.deadline.split('-');
        if (parts.length === 3) {
          dueObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
      }
      if (!dueObj || isNaN(dueObj.getTime())) return;
      milestones.push({ ...sub, dueObj });
    });
  });
  
  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const visible = milestones.filter(m => m.dueObj.getTime() >= todayMidnight.getTime());
  plannerIncluded = visible.some(m => m.id === storeSubtask.id);
  
  console.log("\n=== Layer 5: Planner ===");
  console.log("Included in Planner visible upcoming milestones?", plannerIncluded);

  // 6. Layer 6: Workspace
  // Uses WorkspaceMapper
  const vm = {
    id: storeSubtask.id,
    deadline: storeSubtask.deadlineInfo ? storeSubtask.deadlineInfo.label : 'No deadline'
  };
  console.log("\n=== Layer 6: Workspace ===");
  console.log("Workspace mapped deadline:", vm.deadline);

  process.exit(0);
}
trace().catch(console.error);
