const mongoose = require('mongoose');
const {
  macroSchema,
  dietTargetSchema,
  mealSchema,
  supplementSchema,
} = require('./dietSubschemas');

const DIET_DAY_TYPES = ['all', 'training', 'rest'];

const dietPlanSchema = new mongoose.Schema(
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
      required: [true, 'Diet plan name is required'],
      trim: true,
      maxlength: 120,
    },
    dayType: {
      type: String,
      enum: DIET_DAY_TYPES,
      default: 'all',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    targets: {
      type: dietTargetSchema,
      default: () => ({
        calories: 2000,
        protein: 140,
        carbs: 220,
        fat: 65,
        fiber: 30,
        waterLiters: 3,
      }),
    },
    meals: {
      type: [mealSchema],
      default: [],
    },
    dailyTotals: {
      type: macroSchema,
      default: () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }),
    },
    supplements: {
      type: [supplementSchema],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 2000,
    },
    shareToken: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

dietPlanSchema.index({ trainerId: 1, clientId: 1, isActive: 1 });
dietPlanSchema.index({ shareToken: 1 }, { unique: true, sparse: true });

const DietPlan = mongoose.model('DietPlan', dietPlanSchema);

module.exports = DietPlan;
module.exports.DIET_DAY_TYPES = DIET_DAY_TYPES;
