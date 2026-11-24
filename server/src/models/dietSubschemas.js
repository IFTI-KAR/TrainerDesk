const mongoose = require('mongoose');

const macroSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 0, min: 0 },
    protein: { type: Number, default: 0, min: 0 },
    carbs: { type: Number, default: 0, min: 0 },
    fat: { type: Number, default: 0, min: 0 },
    fiber: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const dietTargetSchema = new mongoose.Schema(
  {
    calories: { type: Number, default: 2000, min: 0 },
    protein: { type: Number, default: 140, min: 0 },
    carbs: { type: Number, default: 220, min: 0 },
    fat: { type: Number, default: 65, min: 0 },
    fiber: { type: Number, default: 30, min: 0 },
    waterLiters: { type: Number, default: 3, min: 0 },
  },
  { _id: false }
);

const mealItemSchema = new mongoose.Schema(
  {
    foodId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Food',
      required: true,
    },
    foodName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.01,
    },
    measure: {
      type: String,
      required: true,
      trim: true,
    },
    computedMacros: {
      type: macroSchema,
      default: () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }),
    },
  },
  { _id: true }
);

const mealSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    time: {
      type: String,
      default: '',
      trim: true,
      maxlength: 10,
    },
    order: {
      type: Number,
      default: 0,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    items: {
      type: [mealItemSchema],
      default: [],
    },
    mealTotals: {
      type: macroSchema,
      default: () => ({ calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }),
    },
  },
  { _id: true }
);

const supplementSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    dosage: { type: String, default: '', trim: true, maxlength: 80 },
    timing: { type: String, default: '', trim: true, maxlength: 80 },
    notes: { type: String, default: '', trim: true, maxlength: 200 },
  },
  { _id: false }
);

module.exports = {
  macroSchema,
  dietTargetSchema,
  mealItemSchema,
  mealSchema,
  supplementSchema,
};
