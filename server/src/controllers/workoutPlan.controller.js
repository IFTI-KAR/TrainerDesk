const asyncHandler = require('../utils/asyncHandler');
const workoutService = require('../services/workout.service');

const listPlans = asyncHandler(async (req, res) => {
  const plans = await workoutService.listPlans({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data: { plans } });
});

const getPlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.getPlanById({
    trainerId: req.trainerId,
    planId: req.params.id,
  });
  res.status(200).json({ success: true, data: { plan } });
});

const createPlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.createPlan({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { plan } });
});

const updatePlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.updatePlan({
    trainerId: req.trainerId,
    planId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { plan } });
});

const deletePlan = asyncHandler(async (req, res) => {
  await workoutService.deletePlan({
    trainerId: req.trainerId,
    planId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Workout plan deleted' });
});

const duplicateDay = asyncHandler(async (req, res) => {
  const plan = await workoutService.duplicateDay({
    trainerId: req.trainerId,
    planId: req.params.id,
    dayId: req.params.dayId,
  });
  res.status(200).json({ success: true, data: { plan } });
});

const duplicatePlan = asyncHandler(async (req, res) => {
  const plan = await workoutService.duplicatePlan({
    trainerId: req.trainerId,
    planId: req.params.id,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { plan } });
});

const saveAsTemplate = asyncHandler(async (req, res) => {
  const template = await workoutService.savePlanAsTemplate({
    trainerId: req.trainerId,
    planId: req.params.id,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { template } });
});

module.exports = {
  listPlans,
  getPlan,
  createPlan,
  updatePlan,
  deletePlan,
  duplicateDay,
  duplicatePlan,
  saveAsTemplate,
};
