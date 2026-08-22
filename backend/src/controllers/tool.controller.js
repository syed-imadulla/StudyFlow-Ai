import { AnalyticsService } from '../services/analytics.service.js';
import { GoalService } from '../services/goal.service.js';
import { TaskService } from '../services/task.service.js';
import { logger } from '../utils/logger.js';

export class ToolController {
  /**
   * Reads analytics summary.
   * This is a STRICTLY READ-ONLY endpoint for AI agents.
   * Authentication is verified by the protect middleware.
   */
  static async getAnalyticsSummary(req, res) {
    try {
      const userId = req.user._id;
      const period = req.query.period || 'last7';
      
      const summary = await AnalyticsService.getSummary(userId, period);
      
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Tool API getAnalyticsSummary Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve analytics summary for tools.' });
    }
  }

  /**
   * Reads goals.
   * STRICTLY READ-ONLY endpoint for AI agents.
   */
  static async getGoals(req, res) {
    try {
      const userId = req.user._id;
      const goals = await GoalService.getGoals(userId, req.query);
      
      res.status(200).json({
        success: true,
        data: goals
      });
    } catch (error) {
      logger.error('Tool API getGoals Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve goals for tools.' });
    }
  }

  /**
   * Reads tasks.
   * STRICTLY READ-ONLY endpoint for AI agents.
   */
  static async getTasks(req, res) {
    try {
      const userId = req.user._id;
      const tasks = await TaskService.getTasks(userId, req.query);
      
      res.status(200).json({
        success: true,
        data: tasks
      });
    } catch (error) {
      logger.error('Tool API getTasks Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve tasks for tools.' });
    }
  }
}
