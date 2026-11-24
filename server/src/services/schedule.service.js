const mongoose = require('mongoose');
const ScheduleRule = require('../models/ScheduleRule');
const Session = require('../models/Session');
const Client = require('../models/Client');
const WorkoutPlan = require('../models/WorkoutPlan');
const AppError = require('../utils/AppError');
const {
  addDays,
  formatDateStr,
  getDayOfWeek,
  getWeekRangeMonSun,
} = require('../utils/dateUtils');

function doesRuleApplyOnDate(rule, dateStr) {
  if (!rule || !rule.isActive) return false;
  if (dateStr < rule.startDate) return false;
  if (rule.endDate && dateStr > rule.endDate) return false;
  if (Array.isArray(rule.excludedDates) && rule.excludedDates.includes(dateStr)) return false;
  const dow = getDayOfWeek(dateStr);
  return Array.isArray(rule.daysOfWeek) && rule.daysOfWeek.includes(dow);
}

function enumerateDateRange(startDate, endDate, maxDays = 62) {
  const dates = [];
  if (startDate > endDate) return dates;
  let current = startDate;
  while (current <= endDate && dates.length < maxDays) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

function buildWorkoutSnapshotFromPlan(plan, workoutDayId, fallbackDayName = '') {
  if (!plan || !Array.isArray(plan.workoutDays) || plan.workoutDays.length === 0) {
    return {
      dayName: fallbackDayName || 'Custom workout',
      focus: '',
      exercises: [],
    };
  }

  let day = null;
  if (workoutDayId) {
    day = plan.workoutDays.find((d) => d._id.toString() === workoutDayId.toString());
  }
  if (!day && fallbackDayName) {
    day = plan.workoutDays.find((d) => d.name === fallbackDayName);
  }
  if (!day) {
    return {
      dayName: fallbackDayName || 'Custom workout',
      focus: '',
      exercises: [],
    };
  }

  const exercises = (day.exercises || [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((ex, idx) => ({
      exerciseId: ex.exerciseId,
      name: ex.exerciseName,
      imageUrl: ex.exerciseImageUrl || '',
      primaryMuscle: ex.primaryMuscle || '',
      order: idx,
      supersetGroup: ex.supersetGroup || '',
      trackingType: ex.trackingType || 'reps_weight',
      tempo: ex.tempo || '',
      notes: ex.notes || '',
      targetSets: (ex.sets || []).map((s, sIdx) => ({
        setNumber: s.setNumber || sIdx + 1,
        targetReps: s.targetReps ?? '10',
        targetDurationSec: s.targetDurationSec ?? null,
        targetWeight: s.targetWeight ?? null,
        weightUnit: s.weightUnit || 'kg',
        restSec: s.restSec ?? 60,
      })),
    }));

  return {
    dayName: day.name,
    focus: day.focus || '',
    exercises,
  };
}

function formatRule(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    clientId: obj.clientId.toString(),
    daysOfWeek: obj.daysOfWeek || [],
    time: obj.time,
    durationMin: obj.durationMin,
    workoutPlanId: obj.workoutPlanId ? obj.workoutPlanId.toString() : null,
    workoutDayId: obj.workoutDayId ? obj.workoutDayId.toString() : null,
    workoutDayName: obj.workoutDayName || '',
    startDate: obj.startDate,
    endDate: obj.endDate || null,
    isActive: Boolean(obj.isActive),
    excludedDates: obj.excludedDates || [],
    notes: obj.notes || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function formatSession(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const isPopulatedClient =
    obj.clientId && typeof obj.clientId === 'object' && obj.clientId._id;

  const clientSummary = isPopulatedClient
    ? {
        id: obj.clientId._id.toString(),
        name: obj.clientId.name,
        photoUrl: obj.clientId.photoUrl || '',
        goal: obj.clientId.goal || 'general_fitness',
        phone: obj.clientId.phone || '',
        injuries: obj.clientId.injuries || [],
        medicalNotes: obj.clientId.medicalNotes || '',
        status: obj.clientId.status || 'active',
      }
    : null;

  return {
    id: obj._id.toString(),
    clientId: isPopulatedClient ? obj.clientId._id.toString() : obj.clientId.toString(),
    client: clientSummary,
    scheduleRuleId: obj.scheduleRuleId ? obj.scheduleRuleId.toString() : null,
    isOneOff: Boolean(obj.isOneOff),
    date: obj.date,
    time: obj.time,
    durationMin: obj.durationMin,
    status: obj.status,
    missedReason: obj.missedReason || '',
    startedAt: obj.startedAt || null,
    completedAt: obj.completedAt || null,
    workoutPlanId: obj.workoutPlanId ? obj.workoutPlanId.toString() : null,
    workoutPlanVersion: obj.workoutPlanVersion ?? null,
    workoutDayId: obj.workoutDayId ? obj.workoutDayId.toString() : null,
    workoutSnapshot: obj.workoutSnapshot || { dayName: '', focus: '', exercises: [] },
    loggedExercises: (obj.loggedExercises || []).map((le) => ({
      exerciseId: le.exerciseId.toString(),
      exerciseName: le.exerciseName || '',
      notes: le.notes || '',
      sets: le.sets || [],
    })),
    sessionNotes: obj.sessionNotes || '',
    exceptions: obj.exceptions || {},
    totalVolume: obj.totalVolume || 0,
    prCount: obj.prCount || 0,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function resolvePlanAndDay(trainerId, clientId, workoutPlanId, workoutDayId) {
  let plan = null;
  if (workoutPlanId) {
    plan = await WorkoutPlan.findOne({ _id: workoutPlanId, trainerId, clientId }).lean();
  } else {
    plan = await WorkoutPlan.findOne({ trainerId, clientId, isActive: true }).lean();
  }

  if (!plan || !workoutDayId) {
    return {
      plan,
      workoutPlanId: plan ? plan._id : null,
      workoutDayId: workoutDayId ? new mongoose.Types.ObjectId(workoutDayId) : null,
      workoutDayName: '',
    };
  }

  const day = (plan.workoutDays || []).find(
    (d) => d._id.toString() === workoutDayId.toString()
  );

  return {
    plan,
    workoutPlanId: plan._id,
    workoutDayId: new mongoose.Types.ObjectId(workoutDayId),
    workoutDayName: day ? day.name : '',
  };
}

async function ensureSessionsForDateRange({ trainerId, startDate, endDate, clientId }) {
  const dates = enumerateDateRange(startDate, endDate);
  if (dates.length === 0) return;

  const ruleQuery = {
    trainerId,
    isActive: true,
    startDate: { $lte: endDate },
    $or: [{ endDate: null }, { endDate: { $gte: startDate } }],
  };
  if (clientId) ruleQuery.clientId = clientId;

  const rules = await ScheduleRule.find(ruleQuery).lean();
  if (rules.length === 0) return;

  const ruleClientIds = Array.from(new Set(rules.map((r) => r.clientId.toString())));
  const activeClients = await Client.find({
    _id: { $in: ruleClientIds },
    trainerId,
    status: 'active',
  })
    .select('_id activeWorkoutPlanId')
    .lean();

  const activeClientMap = new Map(activeClients.map((c) => [c._id.toString(), c]));

  const planIds = Array.from(
    new Set(
      rules
        .map((r) => r.workoutPlanId || activeClientMap.get(r.clientId.toString())?.activeWorkoutPlanId)
        .filter(Boolean)
        .map((id) => id.toString())
    )
  );

  const plans = planIds.length
    ? await WorkoutPlan.find({ _id: { $in: planIds }, trainerId }).lean()
    : [];
  const planMap = new Map(plans.map((p) => [p._id.toString(), p]));

  const existingSessions = await Session.find({
    trainerId,
    date: { $gte: startDate, $lte: endDate },
    scheduleRuleId: { $ne: null },
  })
    .select('_id scheduleRuleId date status workoutPlanVersion')
    .lean();

  const existingMap = new Map(
    existingSessions.map((s) => [`${s.scheduleRuleId.toString()}:${s.date}`, s])
  );

  for (const rule of rules) {
    const client = activeClientMap.get(rule.clientId.toString());
    if (!client) continue;

    const targetPlanId = rule.workoutPlanId || client.activeWorkoutPlanId;
    const plan = targetPlanId ? planMap.get(targetPlanId.toString()) : null;
    const snapshot = buildWorkoutSnapshotFromPlan(plan, rule.workoutDayId, rule.workoutDayName);
    const planVersion = plan ? plan.version : null;

    for (const dateStr of dates) {
      if (!doesRuleApplyOnDate(rule, dateStr)) continue;

      const key = `${rule._id.toString()}:${dateStr}`;
      const existing = existingMap.get(key);

      if (!existing) {
        try {
          await Session.updateOne(
            {
              trainerId,
              scheduleRuleId: rule._id,
              date: dateStr,
            },
            {
              $setOnInsert: {
                trainerId,
                clientId: rule.clientId,
                scheduleRuleId: rule._id,
                isOneOff: false,
                date: dateStr,
                time: rule.time,
                durationMin: rule.durationMin,
                status: 'scheduled',
                workoutPlanId: plan ? plan._id : rule.workoutPlanId || null,
                workoutPlanVersion: planVersion,
                workoutDayId: rule.workoutDayId || null,
                workoutSnapshot: snapshot,
                sessionNotes: rule.notes || '',
              },
            },
            { upsert: true }
          );
        } catch (err) {
          if (err.code !== 11000) throw err;
        }
      } else if (
        existing.status === 'scheduled' &&
        plan &&
        existing.workoutPlanVersion !== plan.version
      ) {
        await Session.updateOne(
          { _id: existing._id, status: 'scheduled' },
          {
            $set: {
              workoutPlanId: plan._id,
              workoutPlanVersion: plan.version,
              workoutSnapshot: snapshot,
            },
          }
        );
      }
    }
  }
}

async function listScheduleRules({ trainerId, query }) {
  const filter = { trainerId };
  if (query.clientId) filter.clientId = query.clientId;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const docs = await ScheduleRule.find(filter).sort({ time: 1, createdAt: -1 }).lean();
  return docs.map(formatRule);
}

async function createScheduleRule({ trainerId, payload }) {
  const client = await Client.findOne({ _id: payload.clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }

  const resolved = await resolvePlanAndDay(
    trainerId,
    payload.clientId,
    payload.workoutPlanId,
    payload.workoutDayId
  );

  const rule = await ScheduleRule.create({
    trainerId,
    clientId: payload.clientId,
    daysOfWeek: Array.from(new Set(payload.daysOfWeek)),
    time: payload.time,
    durationMin: payload.durationMin ?? 60,
    workoutPlanId: resolved.workoutPlanId,
    workoutDayId: resolved.workoutDayId,
    workoutDayName: resolved.workoutDayName,
    startDate: payload.startDate,
    endDate: payload.endDate ?? null,
    notes: payload.notes || '',
  });

  return formatRule(rule);
}

async function updateScheduleRule({ trainerId, ruleId, payload }) {
  const rule = await ScheduleRule.findOne({ _id: ruleId, trainerId });
  if (!rule) {
    throw new AppError(404, 'Schedule rule not found', 'NOT_FOUND');
  }

  if (payload.daysOfWeek !== undefined) {
    rule.daysOfWeek = Array.from(new Set(payload.daysOfWeek));
  }
  if (payload.time !== undefined) rule.time = payload.time;
  if (payload.durationMin !== undefined) rule.durationMin = payload.durationMin;
  if (payload.startDate !== undefined) rule.startDate = payload.startDate;
  if (payload.endDate !== undefined) rule.endDate = payload.endDate;
  if (payload.isActive !== undefined) rule.isActive = payload.isActive;
  if (payload.notes !== undefined) rule.notes = payload.notes;

  if (payload.workoutPlanId !== undefined || payload.workoutDayId !== undefined) {
    const resolved = await resolvePlanAndDay(
      trainerId,
      rule.clientId,
      payload.workoutPlanId !== undefined ? payload.workoutPlanId : rule.workoutPlanId,
      payload.workoutDayId !== undefined ? payload.workoutDayId : rule.workoutDayId
    );
    rule.workoutPlanId = resolved.workoutPlanId;
    rule.workoutDayId = resolved.workoutDayId;
    rule.workoutDayName = resolved.workoutDayName;
  }

  await rule.save();

  // Keep future unstarted scheduled sessions synced to updated time/duration/day
  const todayStr = formatDateStr();
  const futureUpdate = {
    time: rule.time,
    durationMin: rule.durationMin,
    workoutPlanId: rule.workoutPlanId,
    workoutDayId: rule.workoutDayId,
  };
  await Session.updateMany(
    {
      trainerId,
      scheduleRuleId: rule._id,
      date: { $gte: todayStr },
      status: 'scheduled',
    },
    { $set: futureUpdate }
  );

  return formatRule(rule);
}

async function deleteScheduleRule({ trainerId, ruleId }) {
  const rule = await ScheduleRule.findOneAndDelete({ _id: ruleId, trainerId });
  if (!rule) {
    throw new AppError(404, 'Schedule rule not found', 'NOT_FOUND');
  }

  const todayStr = formatDateStr();
  await Session.deleteMany({
    trainerId,
    scheduleRuleId: rule._id,
    date: { $gte: todayStr },
    status: 'scheduled',
  });
}

async function listSessions({ trainerId, query }) {
  const today = formatDateStr();
  const startDate = query.date || query.startDate || today;
  const endDate = query.date || query.endDate || startDate;

  await ensureSessionsForDateRange({
    trainerId,
    startDate,
    endDate,
    clientId: query.clientId,
  });

  const filter = {
    trainerId,
    date: { $gte: startDate, $lte: endDate },
  };
  if (query.clientId) filter.clientId = query.clientId;
  if (query.status) {
    filter.status = query.status;
  } else if (query.includeCancelled !== 'true') {
    filter.status = { $ne: 'cancelled' };
  }

  const docs = await Session.find(filter)
    .populate('clientId', 'name photoUrl goal phone injuries medicalNotes status')
    .sort({ date: 1, time: 1 })
    .lean();

  const sessions = docs.map(formatSession);
  const summary = {
    total: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    missed: 0,
    remaining: 0,
  };

  for (const s of sessions) {
    if (s.status === 'cancelled') continue;
    summary.total += 1;
    if (s.status === 'scheduled') summary.scheduled += 1;
    else if (s.status === 'in_progress') summary.inProgress += 1;
    else if (s.status === 'completed') summary.completed += 1;
    else if (s.status === 'missed') summary.missed += 1;
  }
  summary.remaining = summary.scheduled + summary.inProgress;

  return {
    sessions,
    summary,
    startDate,
    endDate,
  };
}

async function getWeekSummary({ trainerId, date }) {
  const targetDate = date || formatDateStr();
  const { startDate, endDate, dates } = getWeekRangeMonSun(targetDate);

  await ensureSessionsForDateRange({ trainerId, startDate, endDate });

  const docs = await Session.find({
    trainerId,
    date: { $gte: startDate, $lte: endDate },
    status: { $ne: 'cancelled' },
  })
    .select('date status')
    .lean();

  const byDate = new Map(
    dates.map((d) => [
      d,
      {
        date: d,
        dayOfWeek: getDayOfWeek(d),
        total: 0,
        completed: 0,
        inProgress: 0,
        scheduled: 0,
        missed: 0,
      },
    ])
  );

  for (const doc of docs) {
    const bucket = byDate.get(doc.date);
    if (!bucket) continue;
    bucket.total += 1;
    if (doc.status === 'completed') bucket.completed += 1;
    else if (doc.status === 'in_progress') bucket.inProgress += 1;
    else if (doc.status === 'scheduled') bucket.scheduled += 1;
    else if (doc.status === 'missed') bucket.missed += 1;
  }

  return {
    startDate,
    endDate,
    days: dates.map((d) => byDate.get(d)),
  };
}

async function getSessionById({ trainerId, sessionId }) {
  const doc = await Session.findOne({ _id: sessionId, trainerId })
    .populate('clientId', 'name photoUrl goal phone injuries medicalNotes status')
    .lean();

  if (!doc) {
    throw new AppError(404, 'Session not found', 'NOT_FOUND');
  }

  return formatSession(doc);
}

async function createOneOffSession({ trainerId, payload }) {
  const client = await Client.findOne({ _id: payload.clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }

  const resolved = await resolvePlanAndDay(
    trainerId,
    payload.clientId,
    payload.workoutPlanId,
    payload.workoutDayId
  );
  const snapshot = buildWorkoutSnapshotFromPlan(
    resolved.plan,
    resolved.workoutDayId,
    resolved.workoutDayName
  );

  const session = await Session.create({
    trainerId,
    clientId: payload.clientId,
    scheduleRuleId: null,
    isOneOff: true,
    date: payload.date,
    time: payload.time,
    durationMin: payload.durationMin ?? 60,
    status: 'scheduled',
    workoutPlanId: resolved.workoutPlanId,
    workoutPlanVersion: resolved.plan ? resolved.plan.version : null,
    workoutDayId: resolved.workoutDayId,
    workoutSnapshot: snapshot,
    sessionNotes: payload.sessionNotes || '',
  });

  return getSessionById({ trainerId, sessionId: session._id });
}

async function rescheduleSession({ trainerId, sessionId, payload }) {
  const session = await Session.findOne({ _id: sessionId, trainerId });
  if (!session) {
    throw new AppError(404, 'Session not found', 'NOT_FOUND');
  }

  const originalDate = session.date;
  const originalTime = session.time;

  if (session.scheduleRuleId) {
    await ScheduleRule.updateOne(
      { _id: session.scheduleRuleId, trainerId },
      { $addToSet: { excludedDates: originalDate } }
    );
    session.scheduleRuleId = null;
    session.isOneOff = true;
  }

  session.exceptions = {
    rescheduledFromDate: originalDate,
    rescheduledFromTime: originalTime,
    cancelledAt: null,
    reason: payload.reason || '',
  };
  session.date = payload.date;
  session.time = payload.time;
  if (payload.durationMin !== undefined) session.durationMin = payload.durationMin;
  session.status = 'scheduled';

  await session.save();
  return getSessionById({ trainerId, sessionId: session._id });
}

async function cancelSession({ trainerId, sessionId, reason = '' }) {
  const session = await Session.findOne({ _id: sessionId, trainerId });
  if (!session) {
    throw new AppError(404, 'Session not found', 'NOT_FOUND');
  }

  if (session.scheduleRuleId) {
    await ScheduleRule.updateOne(
      { _id: session.scheduleRuleId, trainerId },
      { $addToSet: { excludedDates: session.date } }
    );
  }

  session.status = 'cancelled';
  session.exceptions = {
    ...(session.exceptions || {}),
    cancelledAt: new Date(),
    reason,
  };

  await session.save();
  return getSessionById({ trainerId, sessionId: session._id });
}

async function updateSessionStatus({ trainerId, sessionId, status, missedReason }) {
  const session = await Session.findOne({ _id: sessionId, trainerId });
  if (!session) {
    throw new AppError(404, 'Session not found', 'NOT_FOUND');
  }

  session.status = status;
  if (status === 'in_progress' && !session.startedAt) {
    session.startedAt = new Date();
  }
  if (status === 'completed') {
    if (!session.startedAt) session.startedAt = new Date();
    session.completedAt = new Date();
  }
  if (status === 'missed') {
    session.missedReason = missedReason ?? session.missedReason ?? '';
  }

  await session.save();
  return getSessionById({ trainerId, sessionId: session._id });
}

module.exports = {
  doesRuleApplyOnDate,
  enumerateDateRange,
  buildWorkoutSnapshotFromPlan,
  ensureSessionsForDateRange,
  listScheduleRules,
  createScheduleRule,
  updateScheduleRule,
  deleteScheduleRule,
  listSessions,
  getWeekSummary,
  getSessionById,
  createOneOffSession,
  rescheduleSession,
  cancelSession,
  updateSessionStatus,
};
