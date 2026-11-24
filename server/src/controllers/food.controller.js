const asyncHandler = require('../utils/asyncHandler');
const dietService = require('../services/diet.service');
const { FOOD_CATEGORIES, FOOD_MEASURES } = require('../models/Food');

const getFoodMeta = asyncHandler(async (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      categories: FOOD_CATEGORIES,
      measures: FOOD_MEASURES,
    },
  });
});

const listFoods = asyncHandler(async (req, res) => {
  const data = await dietService.listFoods({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data });
});

const createFood = asyncHandler(async (req, res) => {
  const food = await dietService.createFood({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { food } });
});

const updateFood = asyncHandler(async (req, res) => {
  const food = await dietService.updateFood({
    trainerId: req.trainerId,
    foodId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { food } });
});

const deleteFood = asyncHandler(async (req, res) => {
  await dietService.deleteFood({
    trainerId: req.trainerId,
    foodId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Food deleted' });
});

module.exports = {
  getFoodMeta,
  listFoods,
  createFood,
  updateFood,
  deleteFood,
};
