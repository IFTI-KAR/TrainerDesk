const mongoose = require('mongoose');

const SESSION_STATUSES = ['scheduled', 'in_progress', 'completed', 'missed', 'cancelled'];

const snapshotSetSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true, min: 1 },
    targetReps: { type: String, default: '10' },
    targetDurationSec: { type: Number, default: null },
    targetWeight: { type: Number, default: null },
    weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
    restSec: { type: Number, default: 60 },
  },
  { _id: false }
);

const snapshotExerciseSchema = new mongoose.Schema(
  {
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    name: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    primaryMuscle: { type: String, default: '' },
    order: { type: Number, default: 0 },
    supersetGroup: { type: String, default: '' },
    trackingType: {
      type: String,
      enum: ['reps_weight', 'reps_only', 'duration'],
      default: 'reps_weight',
    },
    tempo: { type: String, default: '' },
    notes: { type: String, default: '' },
    targetSets: { type: [snapshotSetSchema], default: [] },
  },
  { _id: false }
);

const loggedSetSchema = new mongoose.Schema(
  {
    setNumber: { type: Number, required: true, min: 1 },
    reps: { type: Number, min: 0, default: null },
    durationSec: { type: Number, min: 0, default: null },
    weight: { type: Number, min: 0, default: null },
    weightUnit: { type: String, enum: ['kg', 'lb'], default: 'kg' },
    completed: { type: Boolean, default: false },
    isPR: { type: Boolean, default: false },
    prTypes: { type: [String], default: [] },
    loggedAt: { type: Date, default: null },
  },
  { _id: false }
);

const loggedExerciseSchema = new mongoose.Schema(
  {
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    exerciseName: { type: String, default: '' },
    notes: { type: String, default: '', trim: true, maxlength: 500 },
    sets: { type: [loggedSetSchema], default: [] },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
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
    scheduleRuleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ScheduleRule',
      default: null,
    },
    isOneOff: {
      type: Boolean,
      default: false,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    time: {
      type: String,
      required: true,
      match: [/^([01]\d|2[0-3]):[0-5]\d$/, 'time must be HH:mm'],
    },
    durationMin: {
      type: Number,
      default: 60,
      min: 15,
      max: 240,
    },
    status: {
      type: String,
      enum: SESSION_STATUSES,
      default: 'scheduled',
    },
    missedReason: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    workoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    workoutPlanVersion: {
      type: Number,
      default: null,
    },
    workoutDayId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    workoutSnapshot: {
      dayName: { type: String, default: '' },
      focus: { type: String, default: '' },
      exercises: { type: [snapshotExerciseSchema], default: [] },
    },
    loggedExercises: {
      type: [loggedExerciseSchema],
      default: [],
    },
    sessionNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    exceptions: {
      rescheduledFromDate: { type: String, default: '' },
      rescheduledFromTime: { type: String, default: '' },
      cancelledAt: { type: Date, default: null },
      reason: { type: String, default: '', trim: true, maxlength: 500 },
    },
    totalVolume: {
      type: Number,
      default: 0,
    },
    prCount: {
      type: Number,
      default: 0,
    },
    clientSyncId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ trainerId: 1, date: 1, time: 1 });
sessionSchema.index({ trainerId: 1, clientId: 1, date: -1 });
sessionSchema.index({ trainerId: 1, status: 1, date: 1 });
sessionSchema.index(
  { trainerId: 1, scheduleRuleId: 1, date: 1 },
  {
    unique: true,
    partialFilterExpression: { scheduleRuleId: { $type: 'objectId' } },
  }
);

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
module.exports.SESSION_STATUSES = SESSION_STATUSES;
