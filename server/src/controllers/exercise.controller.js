const asyncHandler = require('../utils/asyncHandler');
const exerciseService = require('../services/exercise.service');
const {
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  DIFFICULTY_LEVELS,
} = require('../models/Exercise');

const getExerciseMeta = asyncHandler(async (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      muscles: MUSCLE_GROUPS,
      equipment: EQUIPMENT_TYPES,
      categories: EXERCISE_CATEGORIES,
      difficulties: DIFFICULTY_LEVELS,
    },
  });
});

const listExercises = asyncHandler(async (req, res) => {
  const { exercises, pagination } = await exerciseService.listExercises({
    trainer: req.trainer,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    data: { exercises, pagination },
  });
});

const getExercise = asyncHandler(async (req, res) => {
  const exercise = await exerciseService.getExerciseById({
    trainer: req.trainer,
    exerciseId: req.params.id,
  });

  res.status(200).json({
    success: true,
    data: { exercise },
  });
});

const createExercise = asyncHandler(async (req, res) => {
  const exercise = await exerciseService.createExercise({
    trainerId: req.trainerId,
    payload: req.body,
    file: req.file,
  });

  res.status(201).json({
    success: true,
    data: { exercise },
  });
});

const updateExercise = asyncHandler(async (req, res) => {
  const exercise = await exerciseService.updateExercise({
    trainer: req.trainer,
    exerciseId: req.params.id,
    payload: req.body,
    file: req.file,
  });

  res.status(200).json({
    success: true,
    data: { exercise },
  });
});

const deleteExercise = asyncHandler(async (req, res) => {
  await exerciseService.deleteExercise({
    trainerId: req.trainerId,
    exerciseId: req.params.id,
  });

  res.status(200).json({
    success: true,
    message: 'Exercise deleted',
  });
});

const toggleFavorite = asyncHandler(async (req, res) => {
  const result = await exerciseService.toggleFavorite({
    trainer: req.trainer,
    exerciseId: req.params.id,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getExerciseMeta,
  listExercises,
  getExercise,
  createExercise,
  updateExercise,
  deleteExercise,
  toggleFavorite,
};
