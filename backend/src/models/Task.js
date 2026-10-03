const mongoose = require('mongoose');
const { TASK_PRIORITY } = require('../config/constants');

const checklistItemSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    isDone: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false }
);

const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },

    board: { type: mongoose.Schema.Types.ObjectId, ref: 'Board', required: true, index: true },
    column: { type: mongoose.Schema.Types.ObjectId, ref: 'Column', required: true, index: true },

    labels: [{ type: String }],
    priority: {
      type: String,
      enum: Object.values(TASK_PRIORITY),
      default: TASK_PRIORITY.MEDIUM,
    },

    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    dueDate: { type: Date },
    completedAt: { type: Date, default: null },

    checklist: [checklistItemSchema],
    attachments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'File' }],

    timeTrackedMinutes: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isArchived: { type: Boolean, default: false },
  },
  { timestamps: true }
);

taskSchema.index({ board: 1, column: 1 });

module.exports = mongoose.model('Task', taskSchema);
