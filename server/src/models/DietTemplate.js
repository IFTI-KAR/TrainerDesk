const mongoose = require('mongoose');
const {
  macroSchema,
  dietTargetSchema,
  mealSchema,
  supplementSchema,
} = require('./dietSubschemas');
const { CLIENT_GOALS } = require('./Client');

const dietTemplateSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Diet template name is required'],
      trim: true,
      maxlength: 120,
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
  },
  {
    timestamps: true,
  }
);

dietTemplateSchema.index({ trainerId: 1, name: 1 });

module.exports = mongoose.model('DietTemplate', dietTemplateSchema);
