const mongoose = require('mongoose');

const PHOTO_POSES = ['front', 'side', 'back'];

const progressPhotoSchema = new mongoose.Schema(
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
    pose: {
      type: String,
      enum: PHOTO_POSES,
      required: true,
    },
    imageUrl: {
      type: String,
      required: true,
      trim: true,
    },
    imagePublicId: {
      type: String,
      default: '',
    },
    weightKg: {
      type: Number,
      min: 0,
      default: null,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

progressPhotoSchema.index({ trainerId: 1, clientId: 1, date: -1, pose: 1 });

const ProgressPhoto = mongoose.model('ProgressPhoto', progressPhotoSchema);

module.exports = ProgressPhoto;
module.exports.PHOTO_POSES = PHOTO_POSES;
