import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS, TASK_PRIORITY, TASK_STATUS, ERROR_CODES } from '../constants/index.js';
import mongoose from 'mongoose';

/**
 * Helper to normalize backward compatible values and map completed property
 */
const normalizePayload = (body) => {
  if (!body || typeof body !== 'object') return;

  // Map completed field to status
  if (body.completed !== undefined) {
    if (body.completed === true || body.completed === 'true') {
      body.status = TASK_STATUS.COMPLETED;
    } else if (body.completed === false || body.completed === 'false') {
      body.status = TASK_STATUS.TODO;
    }
  }

  // Normalize status casing / old values
  if (body.status && typeof body.status === 'string') {
    const upper = body.status.toUpperCase();
    if (Object.values(TASK_STATUS).includes(upper)) {
      body.status = upper;
    }
  }
};

export const validateCreateTask = (req, res, next) => {
  normalizePayload(req.body);
  const { title, priority, status, goalId } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(new AppError('Task title is required and must be a non-empty string', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
    return next(new AppError('Invalid priority level provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (status !== undefined && !Object.values(TASK_STATUS).includes(status)) {
    return next(new AppError('Invalid status.\nAllowed values:\nTODO, IN_PROGRESS, COMPLETED.', HTTP_STATUS.BAD_REQUEST));
  }

  if (goalId && !mongoose.Types.ObjectId.isValid(goalId)) {
    return next(new AppError('Invalid Goal ID reference format', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  next();
};

export const validateUpdateTask = (req, res, next) => {
  const { id } = req.params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid Task ID format', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  normalizePayload(req.body);
  const { title, priority, status, goalId } = req.body || {};

  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return next(new AppError('Task title cannot be empty', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (priority !== undefined && !['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority)) {
    return next(new AppError('Invalid priority level provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (status !== undefined && !Object.values(TASK_STATUS).includes(status)) {
    return next(new AppError('Invalid status.\nAllowed values:\nTODO, IN_PROGRESS, COMPLETED.', HTTP_STATUS.BAD_REQUEST));
  }

  if (goalId !== undefined && goalId !== null && !mongoose.Types.ObjectId.isValid(goalId)) {
    return next(new AppError('Invalid Goal ID reference format', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  next();
};
