import { Task } from '../models/Task.js';
import { AppError } from '../utils/AppError.js';
import { HTTP_STATUS, TASK_PRIORITY, TASK_STATUS, ERROR_CODES } from '../constants/index.js';

export class TaskService {
  /**
   * Fetch all tasks for user with pagination, sorting, and filtering
   */
  static async getTasks(userId, query = {}) {
    const filter = { user: userId };

    if (query.status && typeof query.status === 'string') {
      const upper = query.status.toUpperCase();
      if (Object.values(TASK_STATUS).includes(upper)) {
        filter.status = upper;
      } else {
        filter.status = query.status;
      }
    }

    if (query.completed !== undefined) {
      if (query.completed === 'true' || query.completed === true) {
        filter.status = TASK_STATUS.COMPLETED;
      } else if (query.completed === 'false' || query.completed === false) {
        filter.status = TASK_STATUS.TODO;
      }
    }

    if (query.priority && typeof query.priority === 'string') {
      filter.priority = query.priority;
    }

    if (query.goalId) filter.goalId = query.goalId;
    if (query.archived !== undefined) filter.archived = query.archived === 'true';

    const sort = query.sort || '-createdAt';
    const page = parseInt(query.page, 10) || 1;
    const limit = parseInt(query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    return Task.find(filter).sort(sort).skip(skip).limit(limit);
  }

  /**
   * Get single task by ID
   */
  static async getTaskById(userId, taskId) {
    const task = await Task.findOne({ _id: taskId, user: userId });
    if (!task) {
      throw new AppError('Task not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.TASK_NOT_FOUND);
    }
    return task;
  }

  /**
   * Create new task
   */
  static async createTask(userId, payload) {
    return Task.create({
      ...payload,
      user: userId
    });
  }

  /**
   * Update existing task
   */
  static async updateTask(userId, taskId, patch) {
    const task = await Task.findOneAndUpdate(
      { _id: taskId, user: userId },
      { $set: patch },
      { new: true, runValidators: true }
    );
    if (!task) {
      throw new AppError('Task not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.TASK_NOT_FOUND);
    }
    return task;
  }

  /**
   * Delete task
   */
  static async deleteTask(userId, taskId) {
    const result = await Task.findOneAndDelete({ _id: taskId, user: userId });
    if (!result) {
      throw new AppError('Task not found', HTTP_STATUS.NOT_FOUND, ERROR_CODES.TASK_NOT_FOUND);
    }
  }
}
