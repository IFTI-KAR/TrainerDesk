const mongoose = require('mongoose');

const SUPERSET_GROUPS = ['', 'A', 'B', 'C', 'D', 'E'];
const TRACKING_TYPES = ['reps_weight', 'reps_only', 'duration'];

const setTargetSchema = new mongoose.Schema(
  {
    setNumber: {
      type: Number,
      required: true,
      min: 1,
    },
    targetReps: {
      type: String,
      default: '10',
      trim: true,
      maxlength: 30,
    },
    targetDurationSec: {
      type: Number,
      min: 0,
      default: null,
    },
    targetWeight: {
      type: Number,
      min: 0,
      default: null,
    },
    weightUnit: {
      type: String,
      enum: ['kg', 'lb'],
      default: 'kg',
    },
    restSec: {
      type: Number,
      min: 0,
      max: 600,
      default: 60,
    },
  },
  { _id: false }
);

const dayExerciseSchema = new mongoose.Schema(
  {
    exerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Exercise',
      required: true,
    },
    exerciseName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    exerciseImageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    primaryMuscle: {
      type: String,
      default: '',
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    supersetGroup: {
      type: String,
      enum: SUPERSET_GROUPS,
      default: '',
    },
    trackingType: {
      type: String,
      enum: TRACKING_TYPES,
      default: 'reps_weight',
    },
    tempo: {
      type: String,
      default: '',
      trim: true,
      maxlength: 20,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    sets: {
      type: [setTargetSchema],
      default: [],
    },
  },
  { _id: true }
);

const workoutDaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Workout day name is required'],
      trim: true,
      maxlength: 100,
    },
    focus: {
      type: String,
      default: '',
      trim: true,
      maxlength: 120,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
    order: {
      type: Number,
      default: 0,
    },
    exercises: {
      type: [dayExerciseSchema],
      default: [],
    },
  },
  { _id: true }
);

module.exports = {
  SUPERSET_GROUPS,
  TRACKING_TYPES,
  setTargetSchema,
  dayExerciseSchema,
  workoutDaySchema,
};
