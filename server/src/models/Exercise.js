const mongoose = require('mongoose');

const MUSCLE_GROUPS = [
  'chest',
  'back',
  'lower_back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abdominals',
  'abductors',
  'adductors',
  'neck',
  'full_body',
  'cardio',
];

const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'bands',
  'medicine_ball',
  'ez_bar',
  'foam_roll',
  'other',
];

const EXERCISE_CATEGORIES = ['strength', 'cardio', 'mobility', 'stretching'];

const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

const exerciseSchema = new mongoose.Schema(
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
      required: [true, 'Exercise name is required'],
      trim: true,
      maxlength: [120, 'Exercise name cannot exceed 120 characters'],
    },
    imageUrl: {
      type: String,
      required: [true, 'Exercise image is required'],
      trim: true,
    },
    secondaryImageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    mediaUrl: {
      type: String,
      default: '',
      trim: true,
    },
    primaryMuscle: {
      type: String,
      required: [true, 'Primary muscle group is required'],
      enum: MUSCLE_GROUPS,
    },
    secondaryMuscles: {
      type: [String],
      default: [],
    },
    equipment: {
      type: String,
      required: true,
      enum: EQUIPMENT_TYPES,
      default: 'other',
    },
    difficulty: {
      type: String,
      enum: DIFFICULTY_LEVELS,
      default: 'intermediate',
    },
    category: {
      type: String,
      enum: EXERCISE_CATEGORIES,
      default: 'strength',
    },
    instructions: {
      type: [String],
      default: [],
    },
    tips: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

exerciseSchema.index({ isGlobal: 1, trainerId: 1, primaryMuscle: 1 });
exerciseSchema.index({ equipment: 1, category: 1 });
exerciseSchema.index({ sourceId: 1 }, { unique: true, sparse: true });
exerciseSchema.index({ name: 'text', primaryMuscle: 'text', equipment: 'text' });

const Exercise = mongoose.model('Exercise', exerciseSchema);

module.exports = Exercise;
module.exports.MUSCLE_GROUPS = MUSCLE_GROUPS;
module.exports.EQUIPMENT_TYPES = EQUIPMENT_TYPES;
module.exports.EXERCISE_CATEGORIES = EXERCISE_CATEGORIES;
module.exports.DIFFICULTY_LEVELS = DIFFICULTY_LEVELS;
