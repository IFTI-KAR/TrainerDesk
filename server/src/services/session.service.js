const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const scheduleService = require('./schedule.service');
const metricsService = require('./metrics.service');

async function getPreviousAndBestPerformance({
  trainerId,
  clientId,
  exerciseIds = [],
  excludeSessionId = null,
}) {
  const uniqueIds = Array.from(new Set(exerciseIds.map((id) => String(id)).filter(Boolean)));
  const previousByExercise = {};
  const historicalBestByExercise = {};

  for (const id of uniqueIds) {
    historicalBestByExercise[id] = {
      hasHistory: false,
      maxWeightKg: 0,
      maxEst1RMKg: 0,
      maxSetVolumeKg: 0,
    };
  }

  if (uniqueIds.length === 0) {
    return { previousByExercise, historicalBestByExercise };
  }

  const query = {
    trainerId,
    clientId,
    status: 'completed',
    'loggedExercises.exerciseId': { $in: uniqueIds },
  };
  if (excludeSessionId) {
    query._id = { $ne: excludeSessionId };
  }

  const pastSessions = await Session.find(query)
    .sort({ date: -1, time: -1, completedAt: -1 })
    .select('date loggedExercises')
    .lean();

  const targetSet = new Set(uniqueIds);

  for (const past of pastSessions) {
    for (const loggedEx of past.loggedExercises || []) {
      const exId = loggedEx.exerciseId.toString();
      if (!targetSet.has(exId)) continue;

      const completedSets = (loggedEx.sets || []).filter((s) => s.completed);
      if (completedSets.length === 0) continue;

      if (!previousByExercise[exId]) {
        previousByExercise[exId] = {
          sessionId: past._id.toString(),
          date: past.date,
          notes: loggedEx.notes || '',
          sets: completedSets.map((s) => ({
            setNumber: s.setNumber,
            reps: s.reps ?? null,
            durationSec: s.durationSec ?? null,
            weight: s.weight ?? null,
            weightUnit: s.weightUnit || 'kg',
          })),
        };
      }

      const best = historicalBestByExercise[exId];
      best.hasHistory = true;
      for (const s of completedSets) {
        if (s.weight > 0 && s.reps > 0) {
          const weightKg = metricsService.toKg(s.weight, s.weightUnit || 'kg');
          const est1RM = metricsService.calculateEpley1RM(weightKg, s.reps);
          const setVol = metricsService.calculateSetVolume(weightKg, s.reps);
          if (weightKg > best.maxWeightKg) best.maxWeightKg = metricsService.round1(weightKg);
          if (est1RM > best.maxEst1RMKg) best.maxEst1RMKg = est1RM;
          if (setVol > best.maxSetVolumeKg) best.maxSetVolumeKg = setVol;
        }
      }
    }
  }

  return { previousByExercise, historicalBestByExercise };
}

async function getLiveSessionData({ trainerId, sessionId }) {
  const session = await scheduleService.getSessionById({ trainerId, sessionId });

  const exerciseIds = [
    ...(session.workoutSnapshot?.exercises || []).map((e) => e.exerciseId),
    ...(session.loggedExercises || []).map((e) => e.exerciseId),
  ];

  const { previousByExercise, historicalBestByExercise } =
    await getPreviousAndBestPerformance({
      trainerId,
      clientId: session.clientId,
      exerciseIds,
      excludeSessionId: session.id,
    });

  return {
    session,
    previousByExercise,
    historicalBestByExercise,
  };
}

async function logSessionProgress({ trainerId, sessionId, payload }) {
  const session = await Session.findOne({ _id: sessionId, trainerId });
  if (!session) {
    throw new AppError(404, 'Session not found', 'NOT_FOUND');
  }

  const exerciseIds = (payload.loggedExercises || []).map((e) => e.exerciseId);
  const { historicalBestByExercise } = await getPreviousAndBestPerformance({
    trainerId,
    clientId: session.clientId,
    exerciseIds,
    excludeSessionId: session._id,
  });

  const { annotatedExercises, totalVolume, prCount, prHighlights } =
    metricsService.detectPRsForLoggedExercises(
      payload.loggedExercises || [],
      historicalBestByExercise
    );

  session.loggedExercises = annotatedExercises;
  session.totalVolume = totalVolume;
  session.prCount = prCount;

  if (payload.sessionNotes !== undefined) {
    session.sessionNotes = payload.sessionNotes;
  }
  if (payload.clientSyncId !== undefined) {
    session.clientSyncId = payload.clientSyncId;
  }
  if (session.status === 'scheduled') {
    session.status = 'in_progress';
    session.startedAt = session.startedAt || new Date();
  }

  await session.save();
  const formatted = await scheduleService.getSessionById({
    trainerId,
    sessionId: session._id,
  });

  return {
    session: formatted,
    prHighlights,
  };
}

async function completeSession({ trainerId, sessionId, payload = {} }) {
  const session = await Session.findOne({ _id: sessionId, trainerId });
  if (!session) {
    throw new AppError(404, 'Session not found', 'NOT_FOUND');
  }

  let prHighlights = [];

  if (payload.loggedExercises !== undefined) {
    const exerciseIds = payload.loggedExercises.map((e) => e.exerciseId);
    const { historicalBestByExercise } = await getPreviousAndBestPerformance({
      trainerId,
      clientId: session.clientId,
      exerciseIds,
      excludeSessionId: session._id,
    });

    const detected = metricsService.detectPRsForLoggedExercises(
      payload.loggedExercises,
      historicalBestByExercise
    );
    session.loggedExercises = detected.annotatedExercises;
    session.totalVolume = detected.totalVolume;
    session.prCount = detected.prCount;
    prHighlights = detected.prHighlights;
  } else {
    for (const ex of session.loggedExercises || []) {
      for (const s of ex.sets || []) {
        if (s.completed && s.isPR) {
          prHighlights.push({
            exerciseId: ex.exerciseId.toString(),
            exerciseName: ex.exerciseName || '',
            setNumber: s.setNumber,
            weight: s.weight,
            reps: s.reps,
            weightUnit: s.weightUnit || 'kg',
            prTypes: s.prTypes || [],
          });
        }
      }
    }
  }

  if (payload.sessionNotes !== undefined) {
    session.sessionNotes = payload.sessionNotes;
  }
  if (payload.clientSyncId !== undefined) {
    session.clientSyncId = payload.clientSyncId;
  }

  session.status = 'completed';
  session.startedAt = session.startedAt || new Date();
  session.completedAt = new Date();
  await session.save();

  const formatted = await scheduleService.getSessionById({
    trainerId,
    sessionId: session._id,
  });

  const completedSets = (formatted.loggedExercises || []).reduce(
    (sum, ex) => sum + (ex.sets || []).filter((s) => s.completed).length,
    0
  );
  const totalSets = (formatted.loggedExercises || []).reduce(
    (sum, ex) => sum + (ex.sets || []).length,
    0
  );

  return {
    session: formatted,
    summary: {
      totalVolume: formatted.totalVolume || 0,
      completedSets,
      totalSets,
      prCount: formatted.prCount || 0,
      prHighlights,
    },
  };
}

module.exports = {
  getPreviousAndBestPerformance,
  getLiveSessionData,
  logSessionProgress,
  completeSession,
};
