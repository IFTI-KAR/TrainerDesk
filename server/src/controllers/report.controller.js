const asyncHandler = require('../utils/asyncHandler');
const reportService = require('../services/report.service');

const getDashboardStats = asyncHandler(async (req, res) => {
  const stats = await reportService.getDashboardStats(req.trainerId, req.query.date);
  res.status(200).json({
    success: true,
    data: { stats },
  });
});

const getAttendanceReport = asyncHandler(async (req, res) => {
  const report = await reportService.getAttendanceReport(req.trainerId, req.query);
  res.status(200).json({
    success: true,
    data: { report },
  });
});

const exportClientsCsv = asyncHandler(async (req, res) => {
  const csv = await reportService.exportClientsCsv(req.trainerId, req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="trainerdesk-clients.csv"');
  res.status(200).send(csv);
});

const exportSessionsCsv = asyncHandler(async (req, res) => {
  const csv = await reportService.exportSessionsCsv(req.trainerId, req.query);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="trainerdesk-sessions.csv"');
  res.status(200).send(csv);
});

const listReminders = asyncHandler(async (req, res) => {
  const reminders = await reportService.listReminders(req.trainerId, req.query);
  res.status(200).json({
    success: true,
    data: { reminders },
  });
});

const createReminder = asyncHandler(async (req, res) => {
  const reminder = await reportService.createReminder(req.trainerId, req.body);
  res.status(201).json({
    success: true,
    data: { reminder },
  });
});

const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await reportService.updateReminder(req.trainerId, req.params.id, req.body);
  res.status(200).json({
    success: true,
    data: { reminder },
  });
});

const deleteReminder = asyncHandler(async (req, res) => {
  const result = await reportService.deleteReminder(req.trainerId, req.params.id);
  res.status(200).json({
    success: true,
    data: result,
  });
});

module.exports = {
  getDashboardStats,
  getAttendanceReport,
  exportClientsCsv,
  exportSessionsCsv,
  listReminders,
  createReminder,
  updateReminder,
  deleteReminder,
};
