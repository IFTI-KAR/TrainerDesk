const mongoose = require('mongoose');
const { workoutDaySchema } = require('./workoutSubschemas');
const { CLIENT_GOALS } = require('./Client');

const workoutTemplateSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      default: null,
      index: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
    sourceId: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Template name is required'],
      trim: true,
      maxlength: [120, 'Template name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    goal: {
      type: String,
      enum: [...CLIENT_GOALS, ''],
      default: '',
    },
    tags: {
      type: [String],
      default: [],
    },
    workoutDays: {
      type: [workoutDaySchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

workoutTemplateSchema.index({ trainerId: 1, name: 1 });
workoutTemplateSchema.index({ isGlobal: 1, name: 1 });
workoutTemplateSchema.index({ sourceId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('WorkoutTemplate', workoutTemplateSchema);
