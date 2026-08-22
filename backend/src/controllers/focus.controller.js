import { catchAsync } from '../utils/asyncWrapper.js';
import { FocusService } from '../services/focus.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class FocusController {
  static createSession = catchAsync(async (req, res) => {
    const session = await FocusService.createSession(req.user._id, req.body);
    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      data: session
    });
  });

  static getSessions = catchAsync(async (req, res) => {
    const sessions = await FocusService.getSessions(req.user._id, req.query);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: sessions
    });
  });

  static getSessionById = catchAsync(async (req, res) => {
    const session = await FocusService.getSessionById(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session
    });
  });

  static updateSession = catchAsync(async (req, res) => {
    const session = await FocusService.updateSession(req.user._id, req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session
    });
  });

  static deleteSession = catchAsync(async (req, res) => {
    await FocusService.deleteSession(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      message: 'Focus session deleted successfully'
    });
  });

  // Backward compatible & UI compatibility endpoints
  static startSession = catchAsync(async (req, res) => {
    const session = await FocusService.startSession(req.user._id, req.body);
    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      data: session
    });
  });
  
  static getActiveSession = catchAsync(async (req, res) => {
    const session = await FocusService.getActiveSession(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session // null if no active session
    });
  });
  
  static pauseSession = catchAsync(async (req, res) => {
    const session = await FocusService.pauseSession(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session
    });
  });
  
  static resumeSession = catchAsync(async (req, res) => {
    const session = await FocusService.resumeSession(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session
    });
  });

  static endSession = catchAsync(async (req, res) => {
    const session = await FocusService.endSession(req.user._id, req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session
    });
  });
  
  static abortSession = catchAsync(async (req, res) => {
    const session = await FocusService.abortSession(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: session
    });
  });

  static getHistory = catchAsync(async (req, res) => {
    const history = await FocusService.getHistory(req.user._id, req.query);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: history
    });
  });

  static getSprintTask = catchAsync(async (req, res) => {
    const { goalId, subtaskId } = req.query;
    const task = await FocusService.getActiveSprintTask(req.user._id, goalId, subtaskId);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: task
    });
  });

  static getAISuggestion = catchAsync(async (req, res) => {
    const authHeader = req.headers.authorization;
    const suggestion = await FocusService.getAISuggestion(req.user._id, authHeader);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: suggestion
    });
  });

  static getDistractionHistory = catchAsync(async (req, res) => {
    const distractions = await FocusService.getDistractionHistory(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: distractions
    });
  });
}
