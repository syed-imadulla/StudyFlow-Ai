import { catchAsync } from '../utils/asyncWrapper.js';
import { GoalService } from '../services/goal.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class GoalController {
  static getGoals = catchAsync(async (req, res) => {
    const goals = await GoalService.getGoals(req.user._id, req.query);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: goals
    });
  });

  static getRecommendedGoal = catchAsync(async (req, res) => {
    const recommendation = await GoalService.getRecommendedGoal(req.user._id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: recommendation  // { goal, reason, strategy, strategyVersion }
    });
  });

  static getGoalById = catchAsync(async (req, res) => {
    const goal = await GoalService.getGoalById(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: goal
    });
  });

  static createGoal = catchAsync(async (req, res) => {
    const goal = await GoalService.createGoal(req.user._id, req.body);
    res.status(HTTP_STATUS.CREATED).json({
      status: 'success',
      statusCode: HTTP_STATUS.CREATED,
      data: goal
    });
  });

  static updateGoal = catchAsync(async (req, res) => {
    const goal = await GoalService.updateGoal(req.user._id, req.params.id, req.body);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: goal
    });
  });

  static deleteGoal = catchAsync(async (req, res) => {
    await GoalService.deleteGoal(req.user._id, req.params.id);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      message: 'Goal deleted successfully'
    });
  });

  static toggleSubtask = catchAsync(async (req, res) => {
    const { goalId, subtaskId } = req.params;
    const { completed } = req.body || {};
    const goal = await GoalService.toggleSubtask(req.user._id, goalId, subtaskId, completed);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: goal
    });
  });

  static bulkSaveGoals = catchAsync(async (req, res) => {
    const goals = await GoalService.bulkSaveGoals(req.user._id, req.body);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: goals
    });
  });
}
