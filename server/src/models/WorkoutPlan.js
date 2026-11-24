const mongoose = require('mongoose');
const { workoutDaySchema } = require('./workoutSubschemas');

const workoutPlanSchema = new mongoose.Schema(
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
    name: {
      type: String,
      required: [true, 'Plan name is required'],
      trim: true,
      maxlength: [120, 'Plan name cannot exceed 120 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    version: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
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

workoutPlanSchema.index({ trainerId: 1, clientId: 1, isActive: 1 });

module.exports = mongoose.model('WorkoutPlan', workoutPlanSchema);
