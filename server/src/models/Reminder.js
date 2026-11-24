const mongoose = require('mongoose');

const REMINDER_TYPES = ['follow_up', 'session', 'membership', 'measurement', 'custom'];

const reminderSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      default: null,
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    dueAt: {
      type: Date,
      default: null,
    },
    type: {
      type: String,
      enum: REMINDER_TYPES,
      default: 'follow_up',
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    isDone: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

reminderSchema.index({ trainerId: 1, isDone: 1, dueAt: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);

module.exports = {
  Reminder,
  REMINDER_TYPES,
};
