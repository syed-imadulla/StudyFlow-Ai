import express from 'express';
import { ToolController } from '../controllers/tool.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Require authentication for ALL tool routes
router.use(authenticate);

// Analytics
router.get('/analytics/summary', ToolController.getAnalyticsSummary);

// Goals
router.get('/goals/active', ToolController.getActiveGoals);
router.get('/goals/:id', ToolController.getGoalDetails);

// Tasks
router.get('/tasks/today', ToolController.getTodaysTasks);
router.get('/tasks/goal/:goalId', ToolController.getGoalTasks);

// Planner
router.get('/planner/today', ToolController.getTodaysSchedule);
router.get('/planner/upcoming', ToolController.getUpcomingSchedule);

// Focus
router.get('/focus/today', ToolController.getTodaysFocus);
router.get('/focus/recent', ToolController.getRecentFocus);

export default router;
