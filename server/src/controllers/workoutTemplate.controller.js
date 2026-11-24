const asyncHandler = require('../utils/asyncHandler');
const workoutService = require('../services/workout.service');

const listTemplates = asyncHandler(async (req, res) => {
  const templates = await workoutService.listTemplates({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data: { templates } });
});

const getTemplate = asyncHandler(async (req, res) => {
  const template = await workoutService.getTemplateById({
    trainerId: req.trainerId,
    templateId: req.params.id,
  });
  res.status(200).json({ success: true, data: { template } });
});

const createTemplate = asyncHandler(async (req, res) => {
  const template = await workoutService.createTemplate({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { template } });
});

const updateTemplate = asyncHandler(async (req, res) => {
  const template = await workoutService.updateTemplate({
    trainerId: req.trainerId,
    templateId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { template } });
});

const deleteTemplate = asyncHandler(async (req, res) => {
  await workoutService.deleteTemplate({
    trainerId: req.trainerId,
    templateId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Workout template deleted' });
});

const assignTemplate = asyncHandler(async (req, res) => {
  const plan = await workoutService.assignTemplateToClient({
    trainerId: req.trainerId,
    templateId: req.params.id,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { plan } });
});

module.exports = {
  listTemplates,
  getTemplate,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  assignTemplate,
};
