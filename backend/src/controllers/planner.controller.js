import mongoose from 'mongoose';
import { catchAsync } from '../utils/asyncWrapper.js';
import { PlannerService } from '../services/planner.service.js';
import { FocusSession } from '../models/FocusSession.js';
import { HTTP_STATUS, FOCUS_SESSION_STATUS } from '../constants/index.js';
import { logger } from '../utils/logger.js';

export class PlannerController {
  /**
   * Helper to aggregate FocusSession durations per plannerId and attach to events
   */
  static async _attachActualDurations(userId, events) {
    if (!events) return events;
    const isArray = Array.isArray(events);
    const eventList = isArray ? events : [events];
    if (eventList.length === 0) return events;

    const plannerIds = eventList
      .map(e => {
        const id = e._id ? e._id.toString() : e.id;
        // Handle composite recurrence IDs by extracting the base ObjectId
        return id && id.includes('::') ? id.split('::')[0] : id;
      })
      .filter(id => id && mongoose.Types.ObjectId.isValid(id));

    if (plannerIds.length === 0) {
      return isArray ? eventList.map(e => {
        const obj = typeof e.toJSON === 'function' ? e.toJSON() : (typeof e === 'object' ? { ...e } : e);
        obj.actualDuration = 0;
        return obj;
      }) : { ...(typeof eventList[0].toJSON === 'function' ? eventList[0].toJSON() : eventList[0]), actualDuration: 0 };
    }

    const objectIds = plannerIds.map(id => new mongoose.Types.ObjectId(id));

    const aggregations = await FocusSession.aggregate([
      { 
        $match: { 
          user: userId, 
          plannerId: { $in: objectIds },
          status: FOCUS_SESSION_STATUS.COMPLETED
        }
      },
      {
        $group: {
          _id: '$plannerId',
          actualDuration: { $sum: '$duration' }
        }
      }
    ]);

    const durationMap = {};
    aggregations.forEach(agg => {
      durationMap[agg._id.toString()] = agg.actualDuration;
    });

    const result = eventList.map(e => {
      const obj = typeof e.toJSON === 'function' ? e.toJSON() : (typeof e === 'object' ? { ...e } : e);
      const rawId = obj.id || (obj._id ? obj._id.toString() : null);
      const baseId = rawId && rawId.includes('::') ? rawId.split('::')[0] : rawId;
      obj.actualDuration = durationMap[baseId] || 0;
      return obj;
    });

    return isArray ? result : result[0];
  }
  static getEvents = catchAsync(async (req, res) => {
    const events = await PlannerService.getEvents(req.user._id, req.query);
    const enrichedEvents = await PlannerController._attachActualDurations(req.user._id, events);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvents
    });
  });

  static getEventById = catchAsync(async (req, res) => {
    const event = await PlannerService.getEventById(req.user._id, req.params.id);
    const enrichedEvent = await PlannerController._attachActualDurations(req.user._id, event);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvent
    });
  });

  static createEvent = catchAsync(async (req, res) => {
    const event = await PlannerService.createEvent(req.user._id, req.body);
    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      data: event
    });
  });

  static scheduleMilestone = catchAsync(async (req, res) => {
    const event = await PlannerService.scheduleMilestone(req.user._id, req.body);
    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      data: event
    });
  });

  static updateEvent = catchAsync(async (req, res) => {
    const event = await PlannerService.updateEvent(req.user._id, req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: event
    });
  });

  static deleteEvent = catchAsync(async (req, res) => {
    await PlannerService.deleteEvent(req.user._id, req.params.id, req.query);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      message: 'Planner event deleted successfully'
    });
  });

  static getToday = catchAsync(async (req, res) => {
    const events = await PlannerService.getTodayEvents(req.user._id);
    const enrichedEvents = await PlannerController._attachActualDurations(req.user._id, events);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvents
    });
  });

  static getWeek = catchAsync(async (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const date = now.getDate();
    const day = now.getDay();
    const startOfWeek = new Date(Date.UTC(year, month, date - day, 0, 0, 0));
    const endOfWeek = new Date(Date.UTC(year, month, date - day + 6, 23, 59, 59, 999));
    const events = await PlannerService.getEventsByRange(req.user._id, startOfWeek.toISOString(), endOfWeek.toISOString());
    const enrichedEvents = await PlannerController._attachActualDurations(req.user._id, events);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvents
    });
  });

  static getMonth = catchAsync(async (req, res) => {
    const now = new Date();
    const year = now.getFullYear();
    const monthIndex = now.getMonth();
    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const startOfMonth = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, monthIndex, daysInMonth, 23, 59, 59, 999));
    const events = await PlannerService.getEventsByRange(req.user._id, startOfMonth.toISOString(), endOfMonth.toISOString());
    const enrichedEvents = await PlannerController._attachActualDurations(req.user._id, events);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvents
    });
  });

  // UI compatibility endpoints
  static getDailyBlocks = catchAsync(async (req, res) => {
    logger.debug({ date: req.query.date, reqId: req.id, userId: req.user?._id }, '[AUDIT: Controller] GET /planner/daily called with query date');
    const events = req.query.date
      ? await PlannerService.getEventsForDate(req.user._id, req.query.date)
      : await PlannerService.getTodayEvents(req.user._id);
    const enrichedEvents = await PlannerController._attachActualDurations(req.user._id, events);
    logger.debug({ eventsCount: events ? events.length : 0, reqId: req.id, userId: req.user?._id }, '[AUDIT: Controller] GET /planner/daily returning events count');
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvents
    });
  });

  static getUpcomingDeadlines = catchAsync(async (req, res) => {
    const deadlines = await PlannerService.getUpcomingDeadlines(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: deadlines
    });
  });

  static getWeeklyStats = catchAsync(async (req, res) => {
    const stats = await PlannerService.getWeeklyStats(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: stats
    });
  });

  static getMonthlyCalendar = catchAsync(async (req, res) => {
    const calendar = await PlannerService.getMonthlyCalendar(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: calendar
    });
  });

  static getEventsByRange = catchAsync(async (req, res) => {
    const { start, end } = req.query;
    const events = await PlannerService.getEventsByRange(req.user._id, start, end);
    const enrichedEvents = await PlannerController._attachActualDurations(req.user._id, events);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: enrichedEvents
    });
  });
}

