import { catchAsync } from '../utils/asyncWrapper.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export class AnalyticsController {
  static getSummary = catchAsync(async (req, res) => {
    const { period } = req.query;
    const summary = await AnalyticsService.getSummary(req.user._id, period);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: summary
    });
  });

  static getKPIs = catchAsync(async (req, res) => {
    const { period } = req.query;
    const kpis = await AnalyticsService.getKPIs(req.user._id, period);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: kpis
    });
  });

  static getFocusChart = catchAsync(async (req, res) => {
    const { period } = req.query;
    const chart = await AnalyticsService.getFocusChart(req.user._id, period);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: chart
    });
  });

  static getVelocityChart = catchAsync(async (req, res) => {
    const { period } = req.query;
    const chart = await AnalyticsService.getVelocityChart(req.user._id, period);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: chart
    });
  });

  static getWeeklyComparison = catchAsync(async (req, res) => {
    const { period } = req.query;
    const chart = await AnalyticsService.getWeeklyComparison(req.user._id, period);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: chart
    });
  });

  static getGoalAllocation = catchAsync(async (req, res) => {
    const { period } = req.query;
    const chart = await AnalyticsService.getGoalAllocation(req.user._id, period);
    res.status(HTTP_STATUS.OK).json({
      status: 'success',
      statusCode: HTTP_STATUS.OK,
      data: chart
    });
  });
}
