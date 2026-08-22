import { AnalyticsService } from '../services/analytics.service.js';
import { GoalService } from '../services/goal.service.js';
import { TaskService } from '../services/task.service.js';
import { PlannerService } from '../services/planner.service.js';
import { FocusService } from '../services/focus.service.js';
import { logger } from '../utils/logger.js';
import { GOAL_STATUS } from '../constants/index.js';

export class ToolController {
  
  static async getAnalyticsSummary(req, res) {
    try {
      const summary = await AnalyticsService.getSummary(req.user._id, req.query.period || 'last7');
      res.status(200).json({ success: true, data: summary });
    } catch (error) {
      logger.error('Tool API getAnalyticsSummary Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve analytics.' });
    }
  }

  static async getActiveGoals(req, res) {
    try {
      const goals = await GoalService.getGoals(req.user._id, { status: GOAL_STATUS.ACTIVE, limit: 10 });
      // Strip metadata
      const stripped = goals.map(g => ({
        id: g._id || g.id,
        title: g.title,
        progress: g.progress,
        deadline: g.deadline,
        urgency: g.urgency
      }));
      res.status(200).json({ success: true, data: stripped });
    } catch (error) {
      logger.error('Tool API getActiveGoals Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve active goals.' });
    }
  }

  static async getGoalDetails(req, res) {
    try {
      const goal = await GoalService.getGoalById(req.user._id, req.params.id);
      res.status(200).json({
        success: true,
        data: {
          id: goal._id || goal.id,
          title: goal.title,
          progress: goal.progress,
          deadline: goal.deadline,
          status: goal.status,
          subtasks: goal.subtasks ? goal.subtasks.map(s => ({ id: s._id, title: s.title, completed: s.completed, status: s.status })) : []
        }
      });
    } catch (error) {
      logger.error('Tool API getGoalDetails Error:', error);
      if (error.statusCode === 404) return res.status(404).json({ success: false, message: 'Goal not found' });
      res.status(500).json({ success: false, message: 'Failed to retrieve goal details.' });
    }
  }

  static async getTodaysTasks(req, res) {
    try {
      const now = new Date();
      const startOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
      const endOfDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999));
      
      const tasks = await TaskService.getTasks(req.user._id, { 
        dueDateStart: startOfDay.toISOString(), 
        dueDateEnd: endOfDay.toISOString(), 
        limit: 10 
      });
      const stripped = tasks.map(t => ({ id: t._id || t.id, title: t.title, completed: t.completed, status: t.status }));
      res.status(200).json({ success: true, data: stripped });
    } catch (error) {
      logger.error('Tool API getTodaysTasks Error:', error);
      res.status(500).json({ success: false, message: "Failed to retrieve today's tasks." });
    }
  }

  static async getGoalTasks(req, res) {
    try {
      const tasks = await TaskService.getTasks(req.user._id, { goalId: req.params.goalId, limit: 10 });
      const stripped = tasks.map(t => ({ id: t._id || t.id, title: t.title, completed: t.completed, status: t.status }));
      res.status(200).json({ success: true, data: stripped });
    } catch (error) {
      logger.error('Tool API getGoalTasks Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve goal tasks.' });
    }
  }

  static async getTodaysSchedule(req, res) {
    try {
      const events = await PlannerService.getTodayEvents(req.user._id);
      const stripped = events.slice(0, 10).map(e => ({ id: e.id || e._id, title: e.title, startTime: e.startTime, endTime: e.endTime, completed: e.completed }));
      res.status(200).json({ success: true, data: stripped });
    } catch (error) {
      logger.error('Tool API getTodaysSchedule Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve schedule.' });
    }
  }

  static async getUpcomingSchedule(req, res) {
    try {
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const events = await PlannerService.getEventsByRange(req.user._id, now.toISOString(), nextWeek.toISOString());
      const stripped = events.slice(0, 10).map(e => ({ id: e.id || e._id, title: e.title, startTime: e.startTime, endTime: e.endTime, completed: e.completed }));
      res.status(200).json({ success: true, data: stripped });
    } catch (error) {
      logger.error('Tool API getUpcomingSchedule Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve upcoming schedule.' });
    }
  }

  static async getRecentFocus(req, res) {
    try {
      const sessions = await FocusService.getSessions(req.user._id, { limit: 10, sort: '-startTime' });
      const stripped = sessions.map(s => ({ id: s._id, startTime: s.startTime, duration: s.duration, status: s.status, interruptions: s.interruptions }));
      res.status(200).json({ success: true, data: stripped });
    } catch (error) {
      logger.error('Tool API getRecentFocus Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve recent focus.' });
    }
  }

  static async getTodaysFocus(req, res) {
    try {
      const stats = await PlannerService.getWeeklyStats(req.user._id);
      // stats returns focusHours string like "2.5h"
      res.status(200).json({ success: true, data: { focusHours: stats.focusHours } });
    } catch (error) {
      logger.error('Tool API getTodaysFocus Error:', error);
      res.status(500).json({ success: false, message: "Failed to retrieve today's focus." });
    }
  }
}
