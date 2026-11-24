const mongoose = require('mongoose');

const scheduleRuleSchema = new mongoose.Schema(
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
      required: true,
      index: true,
    },
    daysOfWeek: {
      type: [Number],
      required: true,
      validate: {
        validator: (arr) =>
          Array.isArray(arr) &&
          arr.length > 0 &&
          arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 6),
        message: 'At least one valid weekday (0-6) is required',
      },
    },
    time: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be in HH:mm format'],
    },
    durationMin: {
      type: Number,
      default: 60,
      min: 15,
      max: 240,
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    workoutDayId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    workoutDayName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    startDate: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'startDate must be YYYY-MM-DD'],
    },
    endDate: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    excludedDates: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

scheduleRuleSchema.index({ trainerId: 1, isActive: 1 });
scheduleRuleSchema.index({ trainerId: 1, clientId: 1, isActive: 1 });

module.exports = mongoose.model('ScheduleRule', scheduleRuleSchema);
