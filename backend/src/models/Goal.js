import mongoose from 'mongoose';
import { GOAL_STATUS } from '../constants/index.js';

const subtaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Subtask title is required'],
    trim: true
  },
  estimate: {
    type: String,
    default: '1h'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'URGENT'],
    default: 'Medium'
  },
  completed: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date
  },
  deadline: {
    type: String
  },
  deadlineTime: {
    type: String
  },
  status: {
    type: String,
    enum: ['TODO', 'SCHEDULED', 'COMPLETED'],
    default: 'TODO'
  }
}, {
  toJSON: {
    transform: function (doc, ret) {
      ret.id = ret._id.toString();
      return ret;
    }
  }
});

const goalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Goal must belong to a user'],
      index: true
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(GOAL_STATUS),
      default: GOAL_STATUS.ACTIVE
    },
    deadline: {
      type: String, // Stored as YYYY-MM-DD or ISO string for frontend compatibility
      required: false
    },
    deadlineTime: {
      type: String, // Stored as HH:MM
      required: false
    },
    subtasks: [subtaskSchema],
    completed: {
      type: Boolean,
      default: false
    },
    completedAt: {
      type: Date,
      default: null
    },
    archived: {
      type: Boolean,
      default: false
    },
    archivedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret._id.toString();
        ret.completed = ret.status === GOAL_STATUS.COMPLETED || ret.completed === true || ret.urgency === 'COMPLETED';
        ret.archived = !!ret.archived;
        if (ret.archivedAt) {
          ret.archivedAt = ret.archivedAt.toISOString();
        }
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index optimized for user-scoped queries
goalSchema.index({ user: 1, status: 1 });
goalSchema.index({ user: 1, completed: 1 });

export const Goal = mongoose.model('Goal', goalSchema);
