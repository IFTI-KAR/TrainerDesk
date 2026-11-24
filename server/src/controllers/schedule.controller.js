const asyncHandler = require('../utils/asyncHandler');
const scheduleService = require('../services/schedule.service');
const sessionService = require('../services/session.service');

const listScheduleRules = asyncHandler(async (req, res) => {
  const rules = await scheduleService.listScheduleRules({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data: { rules } });
});

const createScheduleRule = asyncHandler(async (req, res) => {
  const rule = await scheduleService.createScheduleRule({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { rule } });
});

const updateScheduleRule = asyncHandler(async (req, res) => {
  const rule = await scheduleService.updateScheduleRule({
    trainerId: req.trainerId,
    ruleId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { rule } });
});

const deleteScheduleRule = asyncHandler(async (req, res) => {
  await scheduleService.deleteScheduleRule({
    trainerId: req.trainerId,
    ruleId: req.params.id,
  });
  res.status(200).json({ success: true, message: 'Schedule rule deleted' });
});

const listSessions = asyncHandler(async (req, res) => {
  const data = await scheduleService.listSessions({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({ success: true, data });
});

const getWeekSummary = asyncHandler(async (req, res) => {
  const data = await scheduleService.getWeekSummary({
    trainerId: req.trainerId,
    date: req.query.date,
  });
  res.status(200).json({ success: true, data });
});

const getSession = asyncHandler(async (req, res) => {
  const session = await scheduleService.getSessionById({
    trainerId: req.trainerId,
    sessionId: req.params.id,
  });
  res.status(200).json({ success: true, data: { session } });
});

const getLiveSession = asyncHandler(async (req, res) => {
  const data = await sessionService.getLiveSessionData({
    trainerId: req.trainerId,
    sessionId: req.params.id,
  });
  res.status(200).json({ success: true, data });
});

const logSession = asyncHandler(async (req, res) => {
  const data = await sessionService.logSessionProgress({
    trainerId: req.trainerId,
    sessionId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data });
});

const completeSession = asyncHandler(async (req, res) => {
  const data = await sessionService.completeSession({
    trainerId: req.trainerId,
    sessionId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data });
});

const createOneOffSession = asyncHandler(async (req, res) => {
  const session = await scheduleService.createOneOffSession({
    trainerId: req.trainerId,
    payload: req.body,
  });
  res.status(201).json({ success: true, data: { session } });
});

const rescheduleSession = asyncHandler(async (req, res) => {
  const session = await scheduleService.rescheduleSession({
    trainerId: req.trainerId,
    sessionId: req.params.id,
    payload: req.body,
  });
  res.status(200).json({ success: true, data: { session } });
});

const cancelSession = asyncHandler(async (req, res) => {
  const session = await scheduleService.cancelSession({
    trainerId: req.trainerId,
    sessionId: req.params.id,
    reason: req.body.reason,
  });
  res.status(200).json({ success: true, data: { session } });
});

const updateSessionStatus = asyncHandler(async (req, res) => {
  const session = await scheduleService.updateSessionStatus({
    trainerId: req.trainerId,
    sessionId: req.params.id,
    status: req.body.status,
    missedReason: req.body.missedReason,
  });
  res.status(200).json({ success: true, data: { session } });
});

module.exports = {
  listScheduleRules,
  createScheduleRule,
  updateScheduleRule,
  deleteScheduleRule,
  listSessions,
  getWeekSummary,
  getSession,
  getLiveSession,
  logSession,
  completeSession,
  createOneOffSession,
  rescheduleSession,
  cancelSession,
  updateSessionStatus,
};
