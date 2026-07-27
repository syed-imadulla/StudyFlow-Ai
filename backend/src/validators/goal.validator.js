import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS, GOAL_STATUS, ERROR_CODES } from '../constants/index.js';
import mongoose from 'mongoose';

export const validateDeadline = (deadline, isNew = false) => {
  if (!deadline) return null; // Old format fallback happens elsewhere, or we just allow no deadline object

  if (typeof deadline !== 'object') {
    return 'Deadline must be an object';
  }

  const { mode, date, time, value, unit } = deadline;
  
  if (!['NONE', 'SPECIFIC_DATE', 'DURATION'].includes(mode)) {
    return 'Invalid deadline mode';
  }

  if (mode === 'SPECIFIC_DATE') {
    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return 'Specific date must be in YYYY-MM-DD format';
    }
    if (time && (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time))) {
      return 'Time must be in HH:MM format';
    }
    
    // Prevent past dates for new goals
    if (isNew) {
      const selectedDate = new Date(date + 'T00:00:00'); // Local midnight equivalent roughly
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of local today
      
      if (selectedDate < today) {
        return 'Cannot set a deadline in the past for a new goal';
      }
    }
  }

  if (mode === 'DURATION') {
    if (!Number.isInteger(value) || value <= 0) {
      return 'Duration value must be a positive integer';
    }
    if (!['days', 'weeks', 'months'].includes(unit)) {
      return 'Duration unit must be days, weeks, or months';
    }
  }

  return null;
};

export const validateCreateGoal = (req, res, next) => {
  const { title, urgency, status, deadline } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return next(new AppError('Goal title is required and must be a string', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (urgency && !['URGENT', 'UPCOMING', 'ACTIVE', 'COMPLETED'].includes(urgency)) {
    return next(new AppError('Invalid urgency level provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (status && !Object.values(GOAL_STATUS).includes(status.toUpperCase())) {
    return next(new AppError('Invalid goal status provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (deadline) {
    const error = validateDeadline(deadline, true);
    if (error) {
      return next(new AppError(error, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
    }
  }

  next();
};

export const validateUpdateGoal = (req, res, next) => {
  const { id } = req.params || {};
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid Goal ID format', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  const { title, urgency, status, deadline } = req.body || {};
  if (title !== undefined && (typeof title !== 'string' || title.trim().length === 0)) {
    return next(new AppError('Goal title cannot be empty', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (urgency !== undefined && !['URGENT', 'UPCOMING', 'ACTIVE', 'COMPLETED'].includes(urgency)) {
    return next(new AppError('Invalid urgency level provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (status !== undefined && !Object.values(GOAL_STATUS).includes(status.toUpperCase())) {
    return next(new AppError('Invalid goal status provided', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }

  if (deadline !== undefined) {
    const error = validateDeadline(deadline, false);
    if (error) {
      return next(new AppError(error, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
    }
  }

  next();
};

export const validateToggleSubtask = (req, res, next) => {
  const { goalId, subtaskId } = req.params || {};
  if (!goalId || !mongoose.Types.ObjectId.isValid(goalId)) {
    return next(new AppError('Invalid Goal ID format', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }
  if (!subtaskId || !mongoose.Types.ObjectId.isValid(subtaskId)) {
    return next(new AppError('Invalid Subtask ID format', HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION));
  }
  next();
};
