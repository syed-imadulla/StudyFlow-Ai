import express from 'express';
import { AiController } from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// Require authentication for ALL AI routes
router.use(authenticate);

// AI Chat interface
router.post('/chat', AiController.chat);

// HITL Action approval/rejection
router.post('/action/resume', AiController.resumeAction);

export default router;
