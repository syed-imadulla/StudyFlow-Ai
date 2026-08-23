import express from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import goalRoutes from './goal.routes.js';
import taskRoutes from './task.routes.js';
import plannerRoutes from './planner.routes.js';
import focusRoutes from './focus.routes.js';
import analyticsRoutes from './analytics.routes.js';
import toolRoutes from './tool.routes.js';
import aiRoutes from './ai.routes.js';

const router = express.Router();

// Mount API v1 sub-routers
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/goals', goalRoutes);
router.use('/tasks', taskRoutes);
router.use('/planner', plannerRoutes);
router.use('/focus', focusRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/tools', toolRoutes);
router.use('/agent', aiRoutes);

export default router;
