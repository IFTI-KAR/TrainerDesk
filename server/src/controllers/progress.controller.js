const asyncHandler = require('../utils/asyncHandler');
const progressService = require('../services/progress.service');

const listMeasurements = asyncHandler(async (req, res) => {
  const measurements = await progressService.listMeasurements({
    trainerId: req.trainerId,
    clientId: req.query.clientId,
  });
  res.status(200).json({ success: true, data: { measurements } });
});

const createMeasurement = asyncHandler(async (req, res) => {
  const measurement = await progressService.createMeasurement({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { measurement } });
});

const updateMeasurement = asyncHandler(async (req, res) => {
  const measurement = await progressService.updateMeasurement({
    trainerId: req.trainerId,
    measurementId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { measurement } });
});

const deleteMeasurement = asyncHandler(async (req, res) => {
  await progressService.deleteMeasurement({
    trainerId: req.trainerId,
    measurementId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Measurement deleted' });
});

const listPhotos = asyncHandler(async (req, res) => {
  const photos = await progressService.listPhotos({
    trainerId: req.trainerId,
    clientId: req.query.clientId,
    pose: req.query.pose,
  });
  res.status(200).json({ success: true, data: { photos } });
});

const createPhoto = asyncHandler(async (req, res) => {
  const photo = await progressService.createPhoto({
    trainerId: req.trainerId,
    payload: req.body,
    file: req.file,
  });
  res.status(201).json({ success: true, data: { photo } });
});

const deletePhoto = asyncHandler(async (req, res) => {
  await progressService.deletePhoto({
    trainerId: req.trainerId,
    photoId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Progress photo deleted' });
});

const getClientProgress = asyncHandler(async (req, res) => {
  const data = await progressService.getClientProgressOverview({
    trainerId: req.trainerId,
    clientId: req.params.clientId,
  });
  res.status(200).json({ success: true, data });
});

module.exports = {
  listMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  listPhotos,
  createPhoto,
  deletePhoto,
  getClientProgress,
};
