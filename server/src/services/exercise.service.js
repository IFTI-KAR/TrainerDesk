const Exercise = require('../models/Exercise');
const Trainer = require('../models/Trainer');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const storageService = require('./storage.service');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getFavoriteSet(trainer) {
  return new Set((trainer?.favoriteExercises || []).map((id) => id.toString()));
}

function formatExercise(doc, favoriteSet = new Set()) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const id = obj._id.toString();
  return {
    id,
    name: obj.name,
    imageUrl: obj.imageUrl,
    secondaryImageUrl: obj.secondaryImageUrl || '',
    mediaUrl: obj.mediaUrl || '',
    primaryMuscle: obj.primaryMuscle,
    secondaryMuscles: obj.secondaryMuscles || [],
    equipment: obj.equipment,
    difficulty: obj.difficulty,
    category: obj.category,
    instructions: obj.instructions || [],
    tips: obj.tips || [],
    isGlobal: Boolean(obj.isGlobal),
    isCustom: !obj.isGlobal,
    isFavorite: favoriteSet.has(id),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function listExercises({ trainer, query }) {
  const { page, limit, skip } = parsePagination(query, { page: 1, limit: 24, maxLimit: 100 });
  const filter = {};

  if (query.customOnly === 'true') {
    filter.trainerId = trainer._id;
    filter.isGlobal = false;
  } else {
    filter.$or = [{ isGlobal: true }, { trainerId: trainer._id }];
  }

  if (query.muscle) filter.primaryMuscle = query.muscle;
  if (query.equipment) filter.equipment = query.equipment;
  if (query.category) filter.category = query.category;
  if (query.difficulty) filter.difficulty = query.difficulty;

  if (query.favoritesOnly === 'true') {
    filter._id = { $in: trainer.favoriteExercises || [] };
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$and = [
      {
        $or: [{ name: regex }, { primaryMuscle: regex }, { equipment: regex }],
      },
    ];
  }

  const [docs, total] = await Promise.all([
    Exercise.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    Exercise.countDocuments(filter),
  ]);

  const favoriteSet = getFavoriteSet(trainer);
  return {
    exercises: docs.map((doc) => formatExercise(doc, favoriteSet)),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getExerciseById({ trainer, exerciseId }) {
  const doc = await Exercise.findOne({
    _id: exerciseId,
    $or: [{ isGlobal: true }, { trainerId: trainer._id }],
  }).lean();

  if (!doc) {
    throw new AppError(404, 'Exercise not found', 'NOT_FOUND');
  }

  return formatExercise(doc, getFavoriteSet(trainer));
}

async function createExercise({ trainerId, payload, file }) {
  let imageUrl = payload.imageUrl || '';
  let imagePublicId = '';

  if (file) {
    const uploaded = await storageService.uploadImage(file, { folder: 'exercises' });
    imageUrl = uploaded.url;
    imagePublicId = uploaded.publicId;
  }

  if (!imageUrl) {
    throw new AppError(
      400,
      'An exercise image upload or image URL is required',
      'VALIDATION_ERROR'
    );
  }

  const exercise = await Exercise.create({
    trainerId,
    isGlobal: false,
    name: payload.name,
    imageUrl,
    secondaryImageUrl: payload.secondaryImageUrl || '',
    imagePublicId,
    mediaUrl: payload.mediaUrl || '',
    primaryMuscle: payload.primaryMuscle,
    secondaryMuscles: payload.secondaryMuscles || [],
    equipment: payload.equipment || 'other',
    difficulty: payload.difficulty || 'intermediate',
    category: payload.category || 'strength',
    instructions: payload.instructions || [],
    tips: payload.tips || [],
  });

  return formatExercise(exercise);
}

async function updateExercise({ trainer, exerciseId, payload, file }) {
  const exercise = await Exercise.findOne({
    _id: exerciseId,
    trainerId: trainer._id,
    isGlobal: false,
  });

  if (!exercise) {
    throw new AppError(404, 'Custom exercise not found', 'NOT_FOUND');
  }

  let oldPublicId = '';
  if (file) {
    const uploaded = await storageService.uploadImage(file, { folder: 'exercises' });
    oldPublicId = exercise.imagePublicId || '';
    exercise.imageUrl = uploaded.url;
    exercise.imagePublicId = uploaded.publicId;
  } else if (payload.imageUrl !== undefined && payload.imageUrl !== '') {
    if (exercise.imagePublicId && payload.imageUrl !== exercise.imageUrl) {
      oldPublicId = exercise.imagePublicId;
      exercise.imagePublicId = '';
    }
    exercise.imageUrl = payload.imageUrl;
  }

  const updatableFields = [
    'name',
    'primaryMuscle',
    'secondaryMuscles',
    'equipment',
    'difficulty',
    'category',
    'secondaryImageUrl',
    'mediaUrl',
    'instructions',
    'tips',
  ];

  for (const field of updatableFields) {
    if (payload[field] !== undefined) {
      exercise[field] = payload[field];
    }
  }

  await exercise.save();

  if (oldPublicId) {
    await storageService.deleteImage(oldPublicId).catch(() => {});
  }

  return formatExercise(exercise, getFavoriteSet(trainer));
}

async function deleteExercise({ trainerId, exerciseId }) {
  const exercise = await Exercise.findOneAndDelete({
    _id: exerciseId,
    trainerId,
    isGlobal: false,
  });

  if (!exercise) {
    throw new AppError(404, 'Custom exercise not found', 'NOT_FOUND');
  }

  if (exercise.imagePublicId) {
    await storageService.deleteImage(exercise.imagePublicId).catch(() => {});
  }

  await Trainer.updateOne({ _id: trainerId }, { $pull: { favoriteExercises: exercise._id } });
}

async function toggleFavorite({ trainer, exerciseId }) {
  const exercise = await Exercise.findOne({
    _id: exerciseId,
    $or: [{ isGlobal: true }, { trainerId: trainer._id }],
  }).select('_id');

  if (!exercise) {
    throw new AppError(404, 'Exercise not found', 'NOT_FOUND');
  }

  const isCurrentlyFavorite = (trainer.favoriteExercises || []).some(
    (id) => id.toString() === exerciseId
  );

  if (isCurrentlyFavorite) {
    await Trainer.updateOne({ _id: trainer._id }, { $pull: { favoriteExercises: exercise._id } });
    return { exerciseId, isFavorite: false };
  }

  await Trainer.updateOne(
    { _id: trainer._id },
    { $addToSet: { favoriteExercises: exercise._id } }
  );
  return { exerciseId, isFavorite: true };
}

module.exports = {
  listExercises,
  getExerciseById,
  createExercise,
  updateExercise,
  deleteExercise,
  toggleFavorite,
};
