const Measurement = require('../models/Measurement');
const ProgressPhoto = require('../models/ProgressPhoto');
const Client = require('../models/Client');
const Session = require('../models/Session');
const AppError = require('../utils/AppError');
const { addDays, formatDateStr } = require('../utils/dateUtils');
const metricsService = require('./metrics.service');
const storageService = require('./storage.service');

function formatMeasurement(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    clientId: obj.clientId.toString(),
    date: obj.date,
    weightKg: obj.weightKg ?? null,
    bodyFatPct: obj.bodyFatPct ?? null,
    bmi: obj.bmi ?? null,
    chestCm: obj.chestCm ?? null,
    waistCm: obj.waistCm ?? null,
    hipsCm: obj.hipsCm ?? null,
    armsCm: obj.armsCm ?? null,
    thighsCm: obj.thighsCm ?? null,
    calvesCm: obj.calvesCm ?? null,
    neckCm: obj.neckCm ?? null,
    shouldersCm: obj.shouldersCm ?? null,
    notes: obj.notes || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function formatPhoto(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    clientId: obj.clientId.toString(),
    date: obj.date,
    pose: obj.pose,
    imageUrl: obj.imageUrl,
    weightKg: obj.weightKg ?? null,
    notes: obj.notes || '',
    createdAt: obj.createdAt,
  };
}

function computeGoalProgress(start, current, target) {
  if (
    start === null ||
    start === undefined ||
    current === null ||
    current === undefined ||
    target === null ||
    target === undefined
  ) {
    return null;
  }

  let progressPct = 0;
  if (target === start) {
    progressPct = current === target ? 100 : 0;
  } else if (target < start) {
    const totalDiff = start - target;
    const achieved = start - current;
    progressPct = metricsService.round1(Math.max(0, Math.min(100, (achieved / totalDiff) * 100)));
  } else {
    const totalDiff = target - start;
    const achieved = current - start;
    progressPct = metricsService.round1(Math.max(0, Math.min(100, (achieved / totalDiff) * 100)));
  }

  return {
    start,
    current,
    target,
    deltaFromStart: metricsService.round1(current - start),
    remainingToTarget: metricsService.round1(Math.abs(target - current)),
    progressPct,
  };
}

async function assertClientOwned(trainerId, clientId) {
  const client = await Client.findOne({ _id: clientId, trainerId }).lean();
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }
  return client;
}

async function listMeasurements({ trainerId, clientId }) {
  await assertClientOwned(trainerId, clientId);
  const docs = await Measurement.find({ trainerId, clientId })
    .sort({ date: 1, createdAt: 1 })
    .lean();
  return docs.map(formatMeasurement);
}

async function createMeasurement({ trainerId, payload }) {
  const client = await assertClientOwned(trainerId, payload.clientId);
  const bmi = metricsService.calculateBmi(payload.weightKg, client.heightCm);

  const doc = await Measurement.create({
    trainerId,
    clientId: payload.clientId,
    date: payload.date,
    weightKg: payload.weightKg ?? null,
    bodyFatPct: payload.bodyFatPct ?? null,
    bmi,
    chestCm: payload.chestCm ?? null,
    waistCm: payload.waistCm ?? null,
    hipsCm: payload.hipsCm ?? null,
    armsCm: payload.armsCm ?? null,
    thighsCm: payload.thighsCm ?? null,
    calvesCm: payload.calvesCm ?? null,
    neckCm: payload.neckCm ?? null,
    shouldersCm: payload.shouldersCm ?? null,
    notes: payload.notes || '',
  });

  return formatMeasurement(doc);
}

async function updateMeasurement({ trainerId, measurementId, payload }) {
  const doc = await Measurement.findOne({ _id: measurementId, trainerId });
  if (!doc) {
    throw new AppError(404, 'Measurement not found', 'NOT_FOUND');
  }

  const client = await assertClientOwned(trainerId, doc.clientId);

  const fields = [
    'date',
    'weightKg',
    'bodyFatPct',
    'chestCm',
    'waistCm',
    'hipsCm',
    'armsCm',
    'thighsCm',
    'calvesCm',
    'neckCm',
    'shouldersCm',
    'notes',
  ];

  for (const field of fields) {
    if (payload[field] !== undefined) {
      doc[field] = payload[field];
    }
  }

  doc.bmi = metricsService.calculateBmi(doc.weightKg, client.heightCm);
  await doc.save();

  return formatMeasurement(doc);
}

async function deleteMeasurement({ trainerId, measurementId }) {
  const doc = await Measurement.findOneAndDelete({ _id: measurementId, trainerId });
  if (!doc) {
    throw new AppError(404, 'Measurement not found', 'NOT_FOUND');
  }
}

async function listPhotos({ trainerId, clientId, pose }) {
  await assertClientOwned(trainerId, clientId);
  const filter = { trainerId, clientId };
  if (pose) filter.pose = pose;
  const docs = await ProgressPhoto.find(filter).sort({ date: -1, createdAt: -1 }).lean();
  return docs.map(formatPhoto);
}

async function createPhoto({ trainerId, payload, file }) {
  await assertClientOwned(trainerId, payload.clientId);

  let imageUrl = payload.imageUrl || '';
  let imagePublicId = '';

  if (file) {
    const uploaded = await storageService.uploadImage(file, { folder: 'progress-photos' });
    imageUrl = uploaded.url;
    imagePublicId = uploaded.publicId;
  }

  if (!imageUrl) {
    throw new AppError(400, 'A progress photo upload or image URL is required', 'VALIDATION_ERROR');
  }

  const doc = await ProgressPhoto.create({
    trainerId,
    clientId: payload.clientId,
    date: payload.date,
    pose: payload.pose,
    imageUrl,
    imagePublicId,
    weightKg: payload.weightKg ?? null,
    notes: payload.notes || '',
  });

  return formatPhoto(doc);
}

async function deletePhoto({ trainerId, photoId }) {
  const doc = await ProgressPhoto.findOneAndDelete({ _id: photoId, trainerId });
  if (!doc) {
    throw new AppError(404, 'Progress photo not found', 'NOT_FOUND');
  }

  if (doc.imagePublicId) {
    await storageService.deleteImage(doc.imagePublicId).catch(() => {});
  }
}

async function getClientProgressOverview({ trainerId, clientId }) {
  const client = await assertClientOwned(trainerId, clientId);

  const [measurementDocs, photoDocs, sessionDocs] = await Promise.all([
    Measurement.find({ trainerId, clientId }).sort({ date: 1, createdAt: 1 }).lean(),
    ProgressPhoto.find({ trainerId, clientId }).sort({ date: -1, createdAt: -1 }).lean(),
    Session.find({
      trainerId,
      clientId,
      status: { $in: ['completed', 'missed'] },
    })
      .sort({ date: 1, time: 1 })
      .select('date status prCount loggedExercises')
      .lean(),
  ]);

  const measurements = measurementDocs.map(formatMeasurement);
  const photos = photoDocs.map(formatPhoto);

  // Goals calculation
  const weightsLogged = measurements.filter((m) => m.weightKg !== null);
  const bfLogged = measurements.filter((m) => m.bodyFatPct !== null);
  const waistLogged = measurements.filter((m) => m.waistCm !== null);

  const weightStart = client.startingWeightKg ?? weightsLogged[0]?.weightKg ?? null;
  const weightCurrent =
    weightsLogged[weightsLogged.length - 1]?.weightKg ?? client.startingWeightKg ?? null;

  const goals = {
    weight:
      client.targetWeightKg !== null && client.targetWeightKg !== undefined
        ? computeGoalProgress(weightStart, weightCurrent, client.targetWeightKg)
        : null,
    bodyFat:
      client.targetBodyFatPct !== null &&
      client.targetBodyFatPct !== undefined &&
      bfLogged.length > 0
        ? computeGoalProgress(
            bfLogged[0].bodyFatPct,
            bfLogged[bfLogged.length - 1].bodyFatPct,
            client.targetBodyFatPct
          )
        : null,
    waist:
      client.targetWaistCm !== null &&
      client.targetWaistCm !== undefined &&
      waistLogged.length > 0
        ? computeGoalProgress(
            waistLogged[0].waistCm,
            waistLogged[waistLogged.length - 1].waistCm,
            client.targetWaistCm
          )
        : null,
  };

  // Strength progression per exercise
  const strengthMap = new Map();
  let completedCount = 0;
  let missedCount = 0;
  let totalPRs = 0;

  const todayStr = formatDateStr();
  const thirtyDaysAgoStr = addDays(todayStr, -29);
  let last30DaysCompleted = 0;

  const dayStatusMap = new Map();

  for (const sess of sessionDocs) {
    if (sess.status === 'completed') {
      completedCount += 1;
      totalPRs += sess.prCount || 0;
      if (sess.date >= thirtyDaysAgoStr && sess.date <= todayStr) {
        last30DaysCompleted += 1;
      }

      const prevDay = dayStatusMap.get(sess.date) || { count: 0, status: 'none' };
      dayStatusMap.set(sess.date, { count: prevDay.count + 1, status: 'completed' });

      for (const loggedEx of sess.loggedExercises || []) {
        const completedSets = (loggedEx.sets || []).filter(
          (s) => s.completed && s.weight > 0 && s.reps > 0
        );
        if (completedSets.length === 0) continue;

        const exId = loggedEx.exerciseId.toString();
        let maxWeight = 0;
        let est1RM = 0;
        let totalVolume = 0;

        for (const s of completedSets) {
          const wKg = metricsService.round1(metricsService.toKg(s.weight, s.weightUnit || 'kg'));
          const e1rm = metricsService.calculateEpley1RM(wKg, s.reps);
          const vol = metricsService.calculateSetVolume(wKg, s.reps);
          if (wKg > maxWeight) maxWeight = wKg;
          if (e1rm > est1RM) est1RM = e1rm;
          totalVolume += vol;
        }

        if (!strengthMap.has(exId)) {
          strengthMap.set(exId, {
            exerciseId: exId,
            exerciseName: loggedEx.exerciseName || 'Exercise',
            points: [],
          });
        }
        strengthMap.get(exId).points.push({
          date: sess.date,
          maxWeight: metricsService.round1(maxWeight),
          est1RM: metricsService.round1(est1RM),
          totalVolume: metricsService.round1(totalVolume),
        });
      }
    } else if (sess.status === 'missed') {
      missedCount += 1;
      const prevDay = dayStatusMap.get(sess.date);
      if (!prevDay || prevDay.status !== 'completed') {
        dayStatusMap.set(sess.date, { count: 0, status: 'missed' });
      }
    }
  }

  const strengthProgression = Array.from(strengthMap.values())
    .map((entry) => {
      const latest = entry.points[entry.points.length - 1];
      const bestEst1RM = Math.max(...entry.points.map((p) => p.est1RM));
      return {
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        latestMaxWeight: latest?.maxWeight || 0,
        latestEst1RM: latest?.est1RM || 0,
        bestEst1RM: metricsService.round1(bestEst1RM),
        sessionCount: entry.points.length,
        points: entry.points,
      };
    })
    .sort((a, b) => b.sessionCount - a.sessionCount);

  const totalActionable = completedCount + missedCount;
  const attendance = {
    completed: completedCount,
    missed: missedCount,
    totalActionable,
    attendanceRatePct:
      totalActionable > 0 ? metricsService.round1((completedCount / totalActionable) * 100) : null,
    last30DaysCompleted,
    totalPRs,
  };

  // 84-day (12-week) consistency heatmap ending today
  const heatmapStart = addDays(todayStr, -83);
  const consistencyHeatmap = [];
  for (let i = 0; i < 84; i += 1) {
    const d = addDays(heatmapStart, i);
    const info = dayStatusMap.get(d) || { count: 0, status: 'none' };
    consistencyHeatmap.push({
      date: d,
      count: info.count,
      status: info.status,
    });
  }

  return {
    measurements,
    photos,
    analytics: {
      goals,
      strengthProgression,
      attendance,
      consistencyHeatmap,
    },
  };
}

module.exports = {
  computeGoalProgress,
  listMeasurements,
  createMeasurement,
  updateMeasurement,
  deleteMeasurement,
  listPhotos,
  createPhoto,
  deletePhoto,
  getClientProgressOverview,
};
