const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
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
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    weightKg: { type: Number, min: 0, default: null },
    bodyFatPct: { type: Number, min: 0, max: 80, default: null },
    bmi: { type: Number, min: 0, default: null },
    chestCm: { type: Number, min: 0, default: null },
    waistCm: { type: Number, min: 0, default: null },
    hipsCm: { type: Number, min: 0, default: null },
    armsCm: { type: Number, min: 0, default: null },
    thighsCm: { type: Number, min: 0, default: null },
    calvesCm: { type: Number, min: 0, default: null },
    neckCm: { type: Number, min: 0, default: null },
    shouldersCm: { type: Number, min: 0, default: null },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

measurementSchema.index({ trainerId: 1, clientId: 1, date: -1 });

module.exports = mongoose.model('Measurement', measurementSchema);
