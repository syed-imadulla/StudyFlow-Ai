import express from 'express';
import { ToolController } from '../controllers/tool.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Require authentication for ALL tool routes
router.use(authenticate);

/**
 * @route   GET /api/v1/tools/analytics/summary
 * @desc    Get read-only analytics summary for AI agents
 * @access  Private (Agent via JWT passthrough)
 */
router.get('/analytics/summary', ToolController.getAnalyticsSummary);

/**
 * @route   GET /api/v1/tools/goals
 * @desc    Get read-only goals list for AI agents
 * @access  Private (Agent via JWT passthrough)
 */
router.get('/goals', ToolController.getGoals);

/**
 * @route   GET /api/v1/tools/tasks
 * @desc    Get read-only tasks list for AI agents
 * @access  Private (Agent via JWT passthrough)
 */
router.get('/tasks', ToolController.getTasks);

export default router;
