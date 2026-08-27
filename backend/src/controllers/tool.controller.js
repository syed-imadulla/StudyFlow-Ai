import { AnalyticsService } from '../services/analytics.service.js';
import { GoalService } from '../services/goal.service.js';
import { TaskService } from '../services/task.service.js';
import { PlannerService } from '../services/planner.service.js';
import { FocusService } from '../services/focus.service.js';
import { logger } from '../utils/logger.js';
import { GOAL_STATUS } from '../constants/index.js';
import { User } from '../models/User.js';

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

  // --- PHASE 6.2.4 ACTION TOOLS ---
  
  static async createGoal(req, res) {
    try {
      if (!req.body.title) {
        return res.status(400).json({ success: false, message: "Title is required for a new goal." });
      }
      const goal = await GoalService.createGoal(req.user._id, req.body);
      
      // Non-blocking webhook dispatcher for n8n (Phase E)
      if (process.env.N8N_WEBHOOK_URL) {
        fetch(process.env.N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                event: 'goal_created', 
                userId: req.user._id, 
                goalId: goal._id || goal.id, 
                title: goal.title 
            })
        }).catch(err => logger.error(`N8n Webhook failed: ${err.message}`));
      }

      res.status(201).json({ success: true, data: { id: goal._id || goal.id, title: goal.title } });
    } catch (error) {
      console.error('---- ACTUAL ERROR ----', error);
      logger.error('Tool API createGoal Error:', error);
      res.status(500).json({ success: false, message: 'Failed to create goal.' });
    }
  }

  static async scheduleTask(req, res) {
    try {
      if (!req.body.title || !req.body.goalId) {
        return res.status(400).json({ success: false, message: "Title and goalId are required to schedule a task." });
      }
      
      // Verify goal ownership before creating task linked to it
      await GoalService.getGoalById(req.user._id, req.body.goalId);
      
      const task = await TaskService.createTask(req.user._id, req.body);
      res.status(201).json({ success: true, data: { id: task._id || task.id, title: task.title } });
    } catch (error) {
      logger.error('Tool API scheduleTask Error:', error);
      if (error.statusCode === 404) {
        return res.status(404).json({ success: false, message: "Goal not found or does not belong to the user." });
      }
      res.status(500).json({ success: false, message: 'Failed to schedule task.' });
    }
  }
  static async getPreferences(req, res) {
    try {
      const user = await User.findById(req.user._id).select('ai_preferences');
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      res.status(200).json({ success: true, data: { ai_preferences: user.ai_preferences || "" } });
    } catch (error) {
      logger.error('Tool API getPreferences Error:', error);
      res.status(500).json({ success: false, message: 'Failed to retrieve user preferences.' });
    }
  }

  static async updatePreferences(req, res) {
    try {
      if (req.body.ai_preferences === undefined) {
        return res.status(400).json({ success: false, message: "ai_preferences is required." });
      }
      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: { ai_preferences: req.body.ai_preferences } },
        { new: true, runValidators: true }
      ).select('ai_preferences');
      
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }
      res.status(200).json({ success: true, data: { ai_preferences: user.ai_preferences } });
    } catch (error) {
      logger.error('Tool API updatePreferences Error:', error);
      res.status(500).json({ success: false, message: 'Failed to update user preferences.' });
    }
  }
}
