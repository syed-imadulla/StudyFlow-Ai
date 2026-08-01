import mongoose from 'mongoose';
import { Goal } from './src/models/Goal.js';
import dotenv from 'dotenv';
import { GoalProgressService } from './src/services/goalProgress.service.js';
import { MilestoneLifecycleService } from './src/services/milestoneLifecycle.service.js';
import { GoalLifecycleService } from './src/services/goalLifecycle.service.js';

dotenv.config();

async function check() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/studyflow');
  
  const goalsDocs = await Goal.find({});
  const goals = goalsDocs.map(goalDoc => {
      const goal = goalDoc.toJSON ? goalDoc.toJSON() : { ...goalDoc };
      
      const fallbackProgress = 0;
      if (goal.subtasks && goal.subtasks.length > 0) {
        goal.subtasks.forEach(subtask => {
          subtask.lifecycle = MilestoneLifecycleService.calculate(subtask);
        });
      }

      const { progressSummary, goalHealth } = GoalProgressService.calculate(goal.subtasks || [], fallbackProgress);
      goal.progressSummary = progressSummary;
      goal.goalHealth = goalHealth;
      goal.progress = progressSummary.completionPercentage;
      goal.lifecycle = GoalLifecycleService.calculate(goal);
      return goal;
  });

  let milestones = [];
  goals.forEach(goal => {
    if (goal.archived || goal.deleted || goal.status === 'archived' || goal.status === 'deleted') return;
    if (!goal.subtasks) return;
    goal.subtasks.forEach((sub, originalIndex) => {
        if (sub.completed || !sub.title || sub.title.trim() === '') return;

        let dueObj = null;
        if (sub.deadline) {
          const parts = sub.deadline.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10) - 1;
            const d = parseInt(parts[2], 10);
            dueObj = new Date(y, m, d);
          }
        }
        if (!dueObj || isNaN(dueObj.getTime())) return;

        milestones.push({
          ...sub,
          goalTitle: goal.title,
          dueObj: dueObj
        });
    });
  });

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const visible = milestones.filter(m => m.dueObj.getTime() >= todayMidnight.getTime());

  console.log("Planner milestones parsed:", milestones.length);
  console.log("Planner upcoming visible:", visible.length);

  // Now test Dashboard logic
  let dashTasks = [];
  goals.forEach(g => {
    if (g.status === 'COMPLETED') return;
    (g.subtasks || []).forEach(subCopy => {
      if (!subCopy.completed && subCopy.lifecycle && subCopy.deadlineInfo) {
        const isToday = subCopy.lifecycle.isDueToday;
        const isOverdue = subCopy.lifecycle.isOverdue;
        const isDueSoon = subCopy.lifecycle.isDueSoon;
        if (isToday || isOverdue || isDueSoon) {
          dashTasks.push(subCopy);
        }
      }
    });
  });
  console.log("Dashboard visible tasks:", dashTasks.length);

  process.exit(0);
}
check().catch(console.error);
