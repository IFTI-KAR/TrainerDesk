const mongoose = require('mongoose');

const FOOD_CATEGORIES = [
  'grains_breads',
  'protein',
  'dairy',
  'vegetables',
  'fruits',
  'legumes_dal',
  'fats_nuts',
  'beverages',
  'snacks',
  'south_asian_dishes',
  'supplements',
  'other',
];

const FOOD_MEASURES = [
  'g',
  'ml',
  'cup',
  'tbsp',
  'tsp',
  'piece',
  'slice',
  'bowl',
  'katori',
  'scoop',
  'oz',
];

const servingSchema = new mongoose.Schema(
  {
    measure: {
      type: String,
      enum: FOOD_MEASURES,
      required: true,
    },
    baseQuantity: {
      type: Number,
      required: true,
      min: 0.01,
      default: 1,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    gramsEquivalent: {
      type: Number,
      min: 0,
      default: 100,
    },
    calories: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const foodSchema = new mongoose.Schema(
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
    slug: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Food name is required'],
      trim: true,
      maxlength: [120, 'Food name cannot exceed 120 characters'],
    },
    category: {
      type: String,
      enum: FOOD_CATEGORIES,
      required: true,
      default: 'other',
    },
    servings: {
      type: [servingSchema],
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length > 0,
        message: 'At least one serving size is required',
      },
    },
    defaultServingIndex: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

foodSchema.index({ isGlobal: 1, trainerId: 1, category: 1 });
foodSchema.index({ slug: 1 }, { unique: true, sparse: true });
foodSchema.index({ name: 'text', category: 'text' });

const Food = mongoose.model('Food', foodSchema);

module.exports = Food;
module.exports.FOOD_CATEGORIES = FOOD_CATEGORIES;
module.exports.FOOD_MEASURES = FOOD_MEASURES;
