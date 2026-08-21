import express from 'express';
import { FocusController } from '../controllers/focus.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateCreateFocusSession, validateUpdateFocusSession } from '../validators/focus.validator.js';

const router = express.Router();

router.use(authenticate); // Require authentication for all focus endpoints

// UI compatibility routes (mounted before /:id)
router.get('/sprint-task', FocusController.getSprintTask);
router.get('/ai-suggestion', FocusController.getAISuggestion);
router.get('/distraction-history', FocusController.getDistractionHistory);

// Lifecycle routes
router.get('/active', (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  next();
}, FocusController.getActiveSession);
router.post('/start', validateCreateFocusSession, FocusController.startSession);
router.post('/:id/pause', validateUpdateFocusSession, FocusController.pauseSession);
router.post('/:id/resume', validateUpdateFocusSession, FocusController.resumeSession);
router.post('/:id/complete', validateUpdateFocusSession, FocusController.endSession);
router.post('/:id/abort', validateUpdateFocusSession, FocusController.abortSession);

// Standard CRUD routes
router.route('/')
  .get(FocusController.getSessions)
  .post(validateCreateFocusSession, FocusController.createSession);

router.route('/:id')
  .get(validateUpdateFocusSession, FocusController.getSessionById)
  .patch(validateUpdateFocusSession, FocusController.updateSession)
  .delete(validateUpdateFocusSession, FocusController.deleteSession);

export default router;
