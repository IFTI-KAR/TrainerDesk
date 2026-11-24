const mongoose = require('mongoose');

const CLIENT_GOALS = [
  'fat_loss',
  'muscle_gain',
  'strength',
  'endurance',
  'general_fitness',
];

const CLIENT_GENDERS = ['male', 'female', 'other', 'prefer_not_to_say'];

const CLIENT_STATUSES = ['active', 'inactive'];

const noteEntrySchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const clientSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Client name is required'],
      trim: true,
      maxlength: [120, 'Name cannot exceed 120 characters'],
    },
    photoUrl: {
      type: String,
      default: '',
      trim: true,
    },
    photoPublicId: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
      trim: true,
      maxlength: 30,
    },
    email: {
      type: String,
      default: '',
      lowercase: true,
      trim: true,
      maxlength: 120,
    },
    gender: {
      type: String,
      enum: CLIENT_GENDERS,
      default: 'prefer_not_to_say',
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    heightCm: {
      type: Number,
      min: 50,
      max: 260,
      default: null,
    },
    startingWeightKg: {
      type: Number,
      min: 20,
      max: 350,
      default: null,
    },
    targetWeightKg: {
      type: Number,
      min: 20,
      max: 350,
      default: null,
    },
    targetWaistCm: {
      type: Number,
      min: 30,
      max: 250,
      default: null,
    },
    targetBodyFatPct: {
      type: Number,
      min: 3,
      max: 70,
      default: null,
    },
    goal: {
      type: String,
      enum: CLIENT_GOALS,
      required: true,
      default: 'general_fitness',
    },
    medicalNotes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    injuries: {
      type: [String],
      default: [],
    },
    membershipStart: {
      type: Date,
      default: null,
    },
    membershipEnd: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: CLIENT_STATUSES,
      default: 'active',
    },
    emergencyContact: {
      name: { type: String, default: '', trim: true, maxlength: 100 },
      phone: { type: String, default: '', trim: true, maxlength: 30 },
      relation: { type: String, default: '', trim: true, maxlength: 60 },
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 5000,
    },
    noteEntries: {
      type: [noteEntrySchema],
      default: [],
    },
    preferredTrainingDays: {
      type: [Number],
      default: [],
    },
    activeWorkoutPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WorkoutPlan',
      default: null,
    },
    activeDietPlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DietPlan',
      default: null,
    },
    // Phase-2 optional read-only client portal readiness
    portalAuth: {
      enabled: { type: Boolean, default: false },
      passwordHash: { type: String, select: false },
      lastLoginAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

clientSchema.index({ trainerId: 1, status: 1, name: 1 });
clientSchema.index({ trainerId: 1, goal: 1 });
clientSchema.index({ trainerId: 1, preferredTrainingDays: 1 });
clientSchema.index({ name: 'text', email: 'text', phone: 'text' });

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
module.exports.CLIENT_GOALS = CLIENT_GOALS;
module.exports.CLIENT_GENDERS = CLIENT_GENDERS;
module.exports.CLIENT_STATUSES = CLIENT_STATUSES;
