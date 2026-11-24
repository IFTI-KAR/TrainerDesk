const asyncHandler = require('../utils/asyncHandler');
const dietService = require('../services/diet.service');

const listDietPlans = asyncHandler(async (req, res) => {
  const plans = await dietService.listDietPlans({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data: { plans } });
});

const getDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.getDietPlanById({
    trainerId: req.trainerId,
    planId: req.params.id,
  });
  res.status(200).json({ success: true, data: { plan } });
});

const createDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.createDietPlan({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { plan } });
});

const updateDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.updateDietPlan({
    trainerId: req.trainerId,
    planId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { plan } });
});

const deleteDietPlan = asyncHandler(async (req, res) => {
  await dietService.deleteDietPlan({
    trainerId: req.trainerId,
    planId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Diet plan deleted' });
});

const duplicateDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.duplicateDietPlan({
    trainerId: req.trainerId,
    planId: req.params.id,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { plan } });
});

const saveAsTemplate = asyncHandler(async (req, res) => {
  const template = await dietService.saveDietPlanAsTemplate({
    trainerId: req.trainerId,
    planId: req.params.id,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { template } });
});

const getSharedDietPlan = asyncHandler(async (req, res) => {
  const plan = await dietService.getSharedDietPlanByToken(req.params.shareToken);
  res.status(200).json({ success: true, data: { plan } });
});

const listDietTemplates = asyncHandler(async (req, res) => {
  const templates = await dietService.listDietTemplates({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data: { templates } });
});

const getDietTemplate = asyncHandler(async (req, res) => {
  const template = await dietService.getDietTemplateById({
    trainerId: req.trainerId,
    templateId: req.params.id,
  });
  res.status(200).json({ success: true, data: { template } });
});

const createDietTemplate = asyncHandler(async (req, res) => {
  const template = await dietService.createDietTemplate({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { template } });
});

const updateDietTemplate = asyncHandler(async (req, res) => {
  const template = await dietService.updateDietTemplate({
    trainerId: req.trainerId,
    templateId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { template } });
});

const deleteDietTemplate = asyncHandler(async (req, res) => {
  await dietService.deleteDietTemplate({
    trainerId: req.trainerId,
    templateId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Diet template deleted' });
});

const assignDietTemplate = asyncHandler(async (req, res) => {
  const plan = await dietService.assignDietTemplateToClient({
    trainerId: req.trainerId,
    templateId: req.params.id,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { plan } });
});

module.exports = {
  listDietPlans,
  getDietPlan,
  createDietPlan,
  updateDietPlan,
  deleteDietPlan,
  duplicateDietPlan,
  saveAsTemplate,
  getSharedDietPlan,
  listDietTemplates,
  getDietTemplate,
  createDietTemplate,
  updateDietTemplate,
  deleteDietTemplate,
  assignDietTemplate,
};
