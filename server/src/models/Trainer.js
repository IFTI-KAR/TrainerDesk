const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    userAgent: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const trainerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['trainer', 'admin'],
      default: 'trainer',
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    gymName: {
      type: String,
      trim: true,
      default: '',
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: '',
    },
    avatarUrl: {
      type: String,
      default: '',
    },
    avatarPublicId: {
      type: String,
      default: '',
    },
    preferences: {
      weightUnit: {
        type: String,
        enum: ['kg', 'lb'],
        default: 'kg',
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'system'],
        default: 'system',
      },
      defaultSessionDuration: {
        type: Number,
        min: 15,
        max: 240,
        default: 60,
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
      select: false,
    },
    favoriteExercises: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exercise',
      },
    ],
  },
  {
    timestamps: true,
  }
);

trainerSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone || '',
    gymName: this.gymName || '',
    bio: this.bio || '',
    avatarUrl: this.avatarUrl || '',
    preferences: {
      weightUnit: this.preferences?.weightUnit || 'kg',
      theme: this.preferences?.theme || 'system',
      defaultSessionDuration: this.preferences?.defaultSessionDuration || 60,
      timezone: this.preferences?.timezone || 'UTC',
    },
    favoriteExercises: (this.favoriteExercises || []).map((id) => id.toString()),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

module.exports = mongoose.model('Trainer', trainerSchema);
