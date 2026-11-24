const mongoose = require('mongoose');
const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutTemplate = require('../models/WorkoutTemplate');
const Client = require('../models/Client');
const Exercise = require('../models/Exercise');
const AppError = require('../utils/AppError');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatDay(day) {
  return {
    id: day._id.toString(),
    name: day.name,
    focus: day.focus || '',
    notes: day.notes || '',
    order: day.order ?? 0,
    exercises: (day.exercises || [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((ex) => ({
        id: ex._id.toString(),
        exerciseId: ex.exerciseId.toString(),
        exerciseName: ex.exerciseName,
        exerciseImageUrl: ex.exerciseImageUrl || '',
        primaryMuscle: ex.primaryMuscle || '',
        order: ex.order ?? 0,
        supersetGroup: ex.supersetGroup || '',
        trackingType: ex.trackingType || 'reps_weight',
        tempo: ex.tempo || '',
        notes: ex.notes || '',
        sets: (ex.sets || []).map((s, idx) => ({
          setNumber: s.setNumber || idx + 1,
          targetReps: s.targetReps ?? '10',
          targetDurationSec: s.targetDurationSec ?? null,
          targetWeight: s.targetWeight ?? null,
          weightUnit: s.weightUnit || 'kg',
          restSec: s.restSec ?? 60,
        })),
      })),
  };
}

function formatPlan(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    clientId: obj.clientId.toString(),
    name: obj.name,
    description: obj.description || '',
    version: obj.version || 1,
    isActive: Boolean(obj.isActive),
    workoutDays: (obj.workoutDays || [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(formatDay),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function formatTemplate(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    name: obj.name,
    description: obj.description || '',
    goal: obj.goal || '',
    tags: obj.tags || [],
    isGlobal: Boolean(obj.isGlobal),
    workoutDays: (obj.workoutDays || [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(formatDay),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function assertClientOwned(trainerId, clientId) {
  const client = await Client.findOne({ _id: clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }
  return client;
}

async function hydrateWorkoutDays(trainerId, workoutDays = [], { preserveDayIds = true } = {}) {
  const exerciseIds = Array.from(
    new Set(
      workoutDays.flatMap((day) => (day.exercises || []).map((ex) => String(ex.exerciseId)))
    )
  );

  const exerciseMap = new Map();
  if (exerciseIds.length > 0) {
    const docs = await Exercise.find({
      _id: { $in: exerciseIds },
      $or: [{ isGlobal: true }, { trainerId }],
    })
      .select('name imageUrl primaryMuscle')
      .lean();

    for (const doc of docs) {
      exerciseMap.set(doc._id.toString(), doc);
    }

    const missing = exerciseIds.filter((id) => !exerciseMap.has(id));
    if (missing.length > 0) {
      throw new AppError(
        400,
        `Referenced exercise(s) not found: ${missing.join(', ')}`,
        'INVALID_EXERCISE_REFERENCE'
      );
    }
  }

  return workoutDays.map((day, dayIdx) => {
    const dayObj = {
      name: day.name,
      focus: day.focus || '',
      notes: day.notes || '',
      order: dayIdx,
      exercises: (day.exercises || []).map((ex, exIdx) => {
        const ref = exerciseMap.get(String(ex.exerciseId));
        return {
          ...(preserveDayIds && ex.id ? { _id: new mongoose.Types.ObjectId(ex.id) } : {}),
          exerciseId: new mongoose.Types.ObjectId(ex.exerciseId),
          exerciseName: ref?.name || ex.exerciseName || 'Exercise',
          exerciseImageUrl: ref?.imageUrl || ex.exerciseImageUrl || '',
          primaryMuscle: ref?.primaryMuscle || ex.primaryMuscle || '',
          order: exIdx,
          supersetGroup: ex.supersetGroup || '',
          trackingType: ex.trackingType || 'reps_weight',
          tempo: ex.tempo || '',
          notes: ex.notes || '',
          sets: (ex.sets || []).map((s, setIdx) => ({
            setNumber: setIdx + 1,
            targetReps: s.targetReps ?? '10',
            targetDurationSec: s.targetDurationSec ?? null,
            targetWeight: s.targetWeight ?? null,
            weightUnit: s.weightUnit || 'kg',
            restSec: s.restSec ?? 60,
          })),
        };
      }),
    };

    if (preserveDayIds && day.id) {
      dayObj._id = new mongoose.Types.ObjectId(day.id);
    }

    return dayObj;
  });
}

function cloneDaysWithoutIds(workoutDays = []) {
  return workoutDays.map((day, dayIdx) => ({
    name: day.name,
    focus: day.focus || '',
    notes: day.notes || '',
    order: dayIdx,
    exercises: (day.exercises || []).map((ex, exIdx) => ({
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseImageUrl: ex.exerciseImageUrl || '',
      primaryMuscle: ex.primaryMuscle || '',
      order: exIdx,
      supersetGroup: ex.supersetGroup || '',
      trackingType: ex.trackingType || 'reps_weight',
      tempo: ex.tempo || '',
      notes: ex.notes || '',
      sets: (ex.sets || []).map((s, setIdx) => ({
        setNumber: setIdx + 1,
        targetReps: s.targetReps ?? '10',
        targetDurationSec: s.targetDurationSec ?? null,
        targetWeight: s.targetWeight ?? null,
        weightUnit: s.weightUnit || 'kg',
        restSec: s.restSec ?? 60,
      })),
    })),
  }));
}

async function syncClientActivePlan(trainerId, clientId, activePlanId) {
  await WorkoutPlan.updateMany(
    { trainerId, clientId, _id: { $ne: activePlanId } },
    { $set: { isActive: false } }
  );
  await Client.updateOne(
    { _id: clientId, trainerId },
    { $set: { activeWorkoutPlanId: activePlanId } }
  );
}

async function listPlans({ trainerId, query }) {
  const filter = { trainerId };
  if (query.clientId) filter.clientId = query.clientId;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const docs = await WorkoutPlan.find(filter)
    .sort({ isActive: -1, updatedAt: -1 })
    .lean();

  return docs.map(formatPlan);
}

async function getPlanById({ trainerId, planId }) {
  const doc = await WorkoutPlan.findOne({ _id: planId, trainerId }).lean();
  if (!doc) {
    throw new AppError(404, 'Workout plan not found', 'NOT_FOUND');
  }
  return formatPlan(doc);
}

async function createPlan({ trainerId, payload }) {
  await assertClientOwned(trainerId, payload.clientId);
  const hydratedDays = await hydrateWorkoutDays(trainerId, payload.workoutDays, {
    preserveDayIds: false,
  });

  const plan = await WorkoutPlan.create({
    trainerId,
    clientId: payload.clientId,
    name: payload.name,
    description: payload.description || '',
    version: 1,
    isActive: payload.isActive ?? true,
    workoutDays: hydratedDays,
  });

  if (plan.isActive) {
    await syncClientActivePlan(trainerId, plan.clientId, plan._id);
  }

  return formatPlan(plan);
}

async function updatePlan({ trainerId, planId, payload }) {
  const plan = await WorkoutPlan.findOne({ _id: planId, trainerId });
  if (!plan) {
    throw new AppError(404, 'Workout plan not found', 'NOT_FOUND');
  }

  if (payload.name !== undefined) plan.name = payload.name;
  if (payload.description !== undefined) plan.description = payload.description;
  if (payload.isActive !== undefined) plan.isActive = payload.isActive;

  if (payload.workoutDays !== undefined) {
    plan.workoutDays = await hydrateWorkoutDays(trainerId, payload.workoutDays, {
      preserveDayIds: true,
    });
  }

  plan.version = (plan.version || 1) + 1;
  await plan.save();

  if (plan.isActive) {
    await syncClientActivePlan(trainerId, plan.clientId, plan._id);
  } else {
    const client = await Client.findOne({ _id: plan.clientId, trainerId }).select(
      'activeWorkoutPlanId'
    );
    if (client && client.activeWorkoutPlanId?.toString() === plan._id.toString()) {
      client.activeWorkoutPlanId = null;
      await client.save();
    }
  }

  return formatPlan(plan);
}

async function deletePlan({ trainerId, planId }) {
  const plan = await WorkoutPlan.findOneAndDelete({ _id: planId, trainerId });
  if (!plan) {
    throw new AppError(404, 'Workout plan not found', 'NOT_FOUND');
  }

  await Client.updateOne(
    { _id: plan.clientId, trainerId, activeWorkoutPlanId: plan._id },
    { $set: { activeWorkoutPlanId: null } }
  );
}

async function duplicateDay({ trainerId, planId, dayId }) {
  const plan = await WorkoutPlan.findOne({ _id: planId, trainerId });
  if (!plan) {
    throw new AppError(404, 'Workout plan not found', 'NOT_FOUND');
  }

  const sourceDay = plan.workoutDays.id(dayId);
  if (!sourceDay) {
    throw new AppError(404, 'Workout day not found', 'NOT_FOUND');
  }

  const [cloned] = cloneDaysWithoutIds([sourceDay.toObject()]);
  cloned.name = `${sourceDay.name} (Copy)`.slice(0, 100);
  cloned.order = plan.workoutDays.length;

  plan.workoutDays.push(cloned);
  plan.version = (plan.version || 1) + 1;
  await plan.save();

  return formatPlan(plan);
}

async function duplicatePlan({ trainerId, planId, payload }) {
  const source = await WorkoutPlan.findOne({ _id: planId, trainerId }).lean();
  if (!source) {
    throw new AppError(404, 'Workout plan not found', 'NOT_FOUND');
  }

  const targetClientId = payload.targetClientId || source.clientId.toString();
  await assertClientOwned(trainerId, targetClientId);

  const isSameClient = targetClientId === source.clientId.toString();
  const nextName =
    payload.name || (isSameClient ? `${source.name} (Copy)` : source.name);

  const newPlan = await WorkoutPlan.create({
    trainerId,
    clientId: targetClientId,
    name: nextName.slice(0, 120),
    description: source.description || '',
    version: 1,
    isActive: payload.setAsActive ?? true,
    workoutDays: cloneDaysWithoutIds(source.workoutDays),
  });

  if (newPlan.isActive) {
    await syncClientActivePlan(trainerId, newPlan.clientId, newPlan._id);
  }

  return formatPlan(newPlan);
}

async function savePlanAsTemplate({ trainerId, planId, payload }) {
  const source = await WorkoutPlan.findOne({ _id: planId, trainerId }).lean();
  if (!source) {
    throw new AppError(404, 'Workout plan not found', 'NOT_FOUND');
  }

  const template = await WorkoutTemplate.create({
    trainerId,
    name: (payload.name || source.name).slice(0, 120),
    description: payload.description ?? source.description ?? '',
    goal: payload.goal || '',
    tags: payload.tags || [],
    workoutDays: cloneDaysWithoutIds(source.workoutDays),
  });

  return formatTemplate(template);
}

async function listTemplates({ trainerId, query }) {
  const conditions = [{ $or: [{ isGlobal: true }, { trainerId }] }];
  if (query.goal) conditions.push({ goal: query.goal });
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    conditions.push({ $or: [{ name: regex }, { description: regex }, { tags: regex }] });
  }

  const filter = conditions.length === 1 ? conditions[0] : { $and: conditions };
  const docs = await WorkoutTemplate.find(filter).sort({ isGlobal: -1, updatedAt: -1 }).lean();
  return docs.map(formatTemplate);
}

async function getTemplateById({ trainerId, templateId }) {
  const doc = await WorkoutTemplate.findOne({
    _id: templateId,
    $or: [{ isGlobal: true }, { trainerId }],
  }).lean();
  if (!doc) {
    throw new AppError(404, 'Workout template not found', 'NOT_FOUND');
  }
  return formatTemplate(doc);
}

async function createTemplate({ trainerId, payload }) {
  const hydratedDays = await hydrateWorkoutDays(trainerId, payload.workoutDays, {
    preserveDayIds: false,
  });

  const template = await WorkoutTemplate.create({
    trainerId,
    name: payload.name,
    description: payload.description || '',
    goal: payload.goal || '',
    tags: payload.tags || [],
    workoutDays: hydratedDays,
  });

  return formatTemplate(template);
}

async function updateTemplate({ trainerId, templateId, payload }) {
  const template = await WorkoutTemplate.findOne({
    _id: templateId,
    $or: [{ isGlobal: true }, { trainerId }],
  });
  if (!template) {
    throw new AppError(404, 'Workout template not found', 'NOT_FOUND');
  }
  if (template.isGlobal) {
    throw new AppError(
      403,
      'Built-in workout templates cannot be edited directly. Duplicate or assign them instead.',
      'FORBIDDEN'
    );
  }

  if (payload.name !== undefined) template.name = payload.name;
  if (payload.description !== undefined) template.description = payload.description;
  if (payload.goal !== undefined) template.goal = payload.goal;
  if (payload.tags !== undefined) template.tags = payload.tags;
  if (payload.workoutDays !== undefined) {
    template.workoutDays = await hydrateWorkoutDays(trainerId, payload.workoutDays, {
      preserveDayIds: true,
    });
  }

  await template.save();
  return formatTemplate(template);
}

async function deleteTemplate({ trainerId, templateId }) {
  const template = await WorkoutTemplate.findOne({
    _id: templateId,
    $or: [{ isGlobal: true }, { trainerId }],
  });
  if (!template) {
    throw new AppError(404, 'Workout template not found', 'NOT_FOUND');
  }
  if (template.isGlobal) {
    throw new AppError(
      403,
      'Built-in workout templates cannot be deleted directly.',
      'FORBIDDEN'
    );
  }
  await WorkoutTemplate.deleteOne({ _id: template._id });
}

async function assignTemplateToClient({ trainerId, templateId, payload }) {
  const template = await WorkoutTemplate.findOne({
    _id: templateId,
    $or: [{ isGlobal: true }, { trainerId }],
  }).lean();
  if (!template) {
    throw new AppError(404, 'Workout template not found', 'NOT_FOUND');
  }

  await assertClientOwned(trainerId, payload.clientId);

  const plan = await WorkoutPlan.create({
    trainerId,
    clientId: payload.clientId,
    name: (payload.name || template.name).slice(0, 120),
    description: template.description || '',
    version: 1,
    isActive: payload.setAsActive ?? true,
    workoutDays: cloneDaysWithoutIds(template.workoutDays),
  });

  if (plan.isActive) {
    await syncClientActivePlan(trainerId, plan.clientId, plan._id);
  }

  return formatPlan(plan);
}

module.exports = {
  listPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  duplicateDay,
  duplicatePlan,
  savePlanAsTemplate,
  listTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  assignTemplateToClient,
};
