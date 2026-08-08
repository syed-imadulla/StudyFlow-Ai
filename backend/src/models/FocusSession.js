import mongoose from 'mongoose';
import { FOCUS_SESSION_TYPE, FOCUS_SESSION_STATUS } from '../constants/index.js';

const focusSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Focus session must belong to a user'],
      index: true
    },
    type: {
      type: String,
      enum: Object.values(FOCUS_SESSION_TYPE),
      default: FOCUS_SESSION_TYPE.POMODORO
    },
    status: {
      type: String,
      enum: Object.values(FOCUS_SESSION_STATUS),
      default: FOCUS_SESSION_STATUS.IN_PROGRESS
    },
    startTime: {
      type: Date,
      required: [true, 'Start time is required'],
      default: Date.now
    },
    endTime: {
      type: Date,
      required: false
    },
    duration: {
      type: Number, // Stored in minutes or seconds (defaulting to seconds for Pomodoro precision)
      default: 0,
      min: 0
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null
    },
    milestoneId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    plannerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Planner',
      default: null
    },
    interruptions: {
      type: Number,
      default: 0,
      min: 0
    },
    pauseCount: {
      type: Number,
      default: 0,
      min: 0
    },
    lastPausedAt: {
      type: Date,
      default: null
    },
    totalPausedTime: {
      type: Number,
      default: 0, // In seconds
      min: 0
    },
    notes: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        ret.completed = ret.status === FOCUS_SESSION_STATUS.COMPLETED;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index optimized for user-scoped history queries
focusSessionSchema.index({ user: 1, startTime: -1 });

export const FocusSession = mongoose.model('FocusSession', focusSessionSchema);
