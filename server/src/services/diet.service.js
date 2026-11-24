const crypto = require('crypto');
const Food = require('../models/Food');
const DietPlan = require('../models/DietPlan');
const DietTemplate = require('../models/DietTemplate');
const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const nutritionService = require('./nutrition.service');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatFood(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    name: obj.name,
    category: obj.category,
    servings: obj.servings || [],
    defaultServingIndex: obj.defaultServingIndex || 0,
    isGlobal: Boolean(obj.isGlobal),
    isCustom: !obj.isGlobal,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function formatDietPlan(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const isPopulatedClient = obj.clientId && typeof obj.clientId === 'object' && obj.clientId._id;

  return {
    id: obj._id.toString(),
    clientId: isPopulatedClient ? obj.clientId._id.toString() : obj.clientId.toString(),
    clientName: isPopulatedClient ? obj.clientId.name : undefined,
    name: obj.name,
    dayType: obj.dayType || 'all',
    isActive: Boolean(obj.isActive),
    targets: obj.targets || {},
    meals: (obj.meals || []).map((m) => ({
      id: m._id ? m._id.toString() : undefined,
      name: m.name,
      time: m.time || '',
      order: m.order ?? 0,
      notes: m.notes || '',
      items: (m.items || []).map((it) => ({
        id: it._id ? it._id.toString() : undefined,
        foodId: it.foodId.toString(),
        foodName: it.foodName,
        quantity: it.quantity,
        measure: it.measure,
        computedMacros: it.computedMacros || nutritionService.emptyMacros(),
      })),
      mealTotals: m.mealTotals || nutritionService.emptyMacros(),
    })),
    dailyTotals: obj.dailyTotals || nutritionService.emptyMacros(),
    supplements: obj.supplements || [],
    notes: obj.notes || '',
    shareToken: obj.shareToken || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

function formatDietTemplate(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  return {
    id: obj._id.toString(),
    name: obj.name,
    description: obj.description || '',
    goal: obj.goal || '',
    tags: obj.tags || [],
    targets: obj.targets || {},
    meals: (obj.meals || []).map((m) => ({
      id: m._id ? m._id.toString() : undefined,
      name: m.name,
      time: m.time || '',
      order: m.order ?? 0,
      notes: m.notes || '',
      items: (m.items || []).map((it) => ({
        id: it._id ? it._id.toString() : undefined,
        foodId: it.foodId.toString(),
        foodName: it.foodName,
        quantity: it.quantity,
        measure: it.measure,
        computedMacros: it.computedMacros || nutritionService.emptyMacros(),
      })),
      mealTotals: m.mealTotals || nutritionService.emptyMacros(),
    })),
    dailyTotals: obj.dailyTotals || nutritionService.emptyMacros(),
    supplements: obj.supplements || [],
    notes: obj.notes || '',
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function listFoods({ trainerId, query }) {
  const { page, limit, skip } = parsePagination(query, { page: 1, limit: 30, maxLimit: 100 });
  const filter = {};

  if (query.customOnly === 'true') {
    filter.trainerId = trainerId;
    filter.isGlobal = false;
  } else {
    filter.$or = [{ isGlobal: true }, { trainerId }];
  }

  if (query.category) filter.category = query.category;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$and = [{ $or: [{ name: regex }, { category: regex }] }];
  }

  const [docs, total] = await Promise.all([
    Food.find(filter).sort({ name: 1, _id: 1 }).skip(skip).limit(limit).lean(),
    Food.countDocuments(filter),
  ]);

  return {
    foods: docs.map(formatFood),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function createFood({ trainerId, payload }) {
  const doc = await Food.create({
    trainerId,
    isGlobal: false,
    name: payload.name,
    category: payload.category || 'other',
    servings: payload.servings,
    defaultServingIndex: Math.min(payload.defaultServingIndex || 0, payload.servings.length - 1),
  });
  return formatFood(doc);
}

async function updateFood({ trainerId, foodId, payload }) {
  const food = await Food.findOne({ _id: foodId, trainerId, isGlobal: false });
  if (!food) {
    throw new AppError(404, 'Custom food not found', 'NOT_FOUND');
  }
  if (payload.name !== undefined) food.name = payload.name;
  if (payload.category !== undefined) food.category = payload.category;
  if (payload.servings !== undefined) food.servings = payload.servings;
  if (payload.defaultServingIndex !== undefined) {
    food.defaultServingIndex = Math.min(
      payload.defaultServingIndex,
      Math.max(0, food.servings.length - 1)
    );
  }
  await food.save();
  return formatFood(food);
}

async function deleteFood({ trainerId, foodId }) {
  const deleted = await Food.findOneAndDelete({ _id: foodId, trainerId, isGlobal: false });
  if (!deleted) {
    throw new AppError(404, 'Custom food not found', 'NOT_FOUND');
  }
}

async function hydrateDietMeals(trainerId, meals = []) {
  const foodIds = Array.from(
    new Set(meals.flatMap((m) => (m.items || []).map((i) => String(i.foodId))))
  );

  const foodMap = new Map();
  if (foodIds.length > 0) {
    const foods = await Food.find({
      _id: { $in: foodIds },
      $or: [{ isGlobal: true }, { trainerId }],
    }).lean();

    for (const f of foods) {
      foodMap.set(f._id.toString(), f);
    }

    const missing = foodIds.filter((id) => !foodMap.has(id));
    if (missing.length > 0) {
      throw new AppError(
        400,
        `Referenced food(s) not found: ${missing.join(', ')}`,
        'INVALID_FOOD_REFERENCE'
      );
    }
  }

  return nutritionService.computeMealsAndDailyTotals(meals, foodMap);
}

async function assertClientOwned(trainerId, clientId) {
  const client = await Client.findOne({ _id: clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }
  return client;
}

async function syncClientActiveDiet(trainerId, clientId, planId, dayType) {
  await DietPlan.updateMany(
    { trainerId, clientId, dayType, _id: { $ne: planId } },
    { $set: { isActive: false } }
  );
  await Client.updateOne({ _id: clientId, trainerId }, { $set: { activeDietPlanId: planId } });
}

function cloneMealsForNewPlan(meals = []) {
  return meals.map((m, idx) => ({
    name: m.name,
    time: m.time || '',
    order: idx,
    notes: m.notes || '',
    items: (m.items || []).map((it) => ({
      foodId: it.foodId,
      foodName: it.foodName,
      quantity: it.quantity,
      measure: it.measure,
      computedMacros: it.computedMacros || nutritionService.emptyMacros(),
    })),
    mealTotals: m.mealTotals || nutritionService.emptyMacros(),
  }));
}

async function listDietPlans({ trainerId, query }) {
  const filter = { trainerId };
  if (query.clientId) filter.clientId = query.clientId;
  if (query.dayType) filter.dayType = query.dayType;
  if (query.isActive !== undefined) filter.isActive = query.isActive === 'true';

  const docs = await DietPlan.find(filter)
    .populate('clientId', 'name')
    .sort({ isActive: -1, updatedAt: -1 })
    .lean();

  return docs.map(formatDietPlan);
}

async function getDietPlanById({ trainerId, planId }) {
  const doc = await DietPlan.findOne({ _id: planId, trainerId })
    .populate('clientId', 'name')
    .lean();
  if (!doc) {
    throw new AppError(404, 'Diet plan not found', 'NOT_FOUND');
  }
  return formatDietPlan(doc);
}

async function createDietPlan({ trainerId, payload }) {
  await assertClientOwned(trainerId, payload.clientId);
  const { meals, dailyTotals } = await hydrateDietMeals(trainerId, payload.meals || []);

  const plan = await DietPlan.create({
    trainerId,
    clientId: payload.clientId,
    name: payload.name,
    dayType: payload.dayType || 'all',
    isActive: payload.isActive ?? true,
    targets: payload.targets || undefined,
    meals,
    dailyTotals,
    supplements: payload.supplements || [],
    notes: payload.notes || '',
    shareToken: crypto.randomBytes(12).toString('hex'),
  });

  if (plan.isActive) {
    await syncClientActiveDiet(trainerId, plan.clientId, plan._id, plan.dayType);
  }

  return formatDietPlan(plan);
}

async function updateDietPlan({ trainerId, planId, payload }) {
  const plan = await DietPlan.findOne({ _id: planId, trainerId });
  if (!plan) {
    throw new AppError(404, 'Diet plan not found', 'NOT_FOUND');
  }

  if (payload.name !== undefined) plan.name = payload.name;
  if (payload.dayType !== undefined) plan.dayType = payload.dayType;
  if (payload.isActive !== undefined) plan.isActive = payload.isActive;
  if (payload.targets !== undefined) plan.targets = payload.targets;
  if (payload.supplements !== undefined) plan.supplements = payload.supplements;
  if (payload.notes !== undefined) plan.notes = payload.notes;

  if (payload.meals !== undefined) {
    const computed = await hydrateDietMeals(trainerId, payload.meals);
    plan.meals = computed.meals;
    plan.dailyTotals = computed.dailyTotals;
  }

  if (!plan.shareToken) {
    plan.shareToken = crypto.randomBytes(12).toString('hex');
  }

  await plan.save();

  if (plan.isActive) {
    await syncClientActiveDiet(trainerId, plan.clientId, plan._id, plan.dayType);
  }

  return formatDietPlan(plan);
}

async function deleteDietPlan({ trainerId, planId }) {
  const plan = await DietPlan.findOneAndDelete({ _id: planId, trainerId });
  if (!plan) {
    throw new AppError(404, 'Diet plan not found', 'NOT_FOUND');
  }

  await Client.updateOne(
    { _id: plan.clientId, trainerId, activeDietPlanId: plan._id },
    { $set: { activeDietPlanId: null } }
  );
}

async function duplicateDietPlan({ trainerId, planId, payload }) {
  const source = await DietPlan.findOne({ _id: planId, trainerId }).lean();
  if (!source) {
    throw new AppError(404, 'Diet plan not found', 'NOT_FOUND');
  }

  const targetClientId = payload.targetClientId || source.clientId.toString();
  await assertClientOwned(trainerId, targetClientId);

  const isSameClient = targetClientId === source.clientId.toString();
  const nextName = payload.name || (isSameClient ? `${source.name} (Copy)` : source.name);

  const newPlan = await DietPlan.create({
    trainerId,
    clientId: targetClientId,
    name: nextName.slice(0, 120),
    dayType: payload.dayType || source.dayType || 'all',
    isActive: payload.setAsActive ?? true,
    targets: source.targets,
    meals: cloneMealsForNewPlan(source.meals),
    dailyTotals: source.dailyTotals,
    supplements: source.supplements || [],
    notes: source.notes || '',
    shareToken: crypto.randomBytes(12).toString('hex'),
  });

  if (newPlan.isActive) {
    await syncClientActiveDiet(trainerId, newPlan.clientId, newPlan._id, newPlan.dayType);
  }

  return formatDietPlan(newPlan);
}

async function saveDietPlanAsTemplate({ trainerId, planId, payload }) {
  const source = await DietPlan.findOne({ _id: planId, trainerId }).lean();
  if (!source) {
    throw new AppError(404, 'Diet plan not found', 'NOT_FOUND');
  }

  const template = await DietTemplate.create({
    trainerId,
    name: (payload.name || source.name).slice(0, 120),
    description: payload.description || '',
    goal: payload.goal || '',
    tags: payload.tags || [],
    targets: source.targets,
    meals: cloneMealsForNewPlan(source.meals),
    dailyTotals: source.dailyTotals,
    supplements: source.supplements || [],
    notes: source.notes || '',
  });

  return formatDietTemplate(template);
}

async function getSharedDietPlanByToken(shareToken) {
  const doc = await DietPlan.findOne({ shareToken })
    .populate('clientId', 'name')
    .populate('trainerId', 'name gymName')
    .lean();

  if (!doc) {
    throw new AppError(404, 'Shared diet plan not found', 'NOT_FOUND');
  }

  const formatted = formatDietPlan(doc);
  const fullClientName = doc.clientId?.name || 'Client';
  const clientFirstName = fullClientName.split(/\s+/)[0];

  return {
    name: formatted.name,
    dayType: formatted.dayType,
    targets: formatted.targets,
    meals: formatted.meals,
    dailyTotals: formatted.dailyTotals,
    supplements: formatted.supplements,
    notes: formatted.notes,
    updatedAt: formatted.updatedAt,
    clientName: clientFirstName,
    trainerName: doc.trainerId?.name || 'Coach',
    gymName: doc.trainerId?.gymName || '',
  };
}

async function listDietTemplates({ trainerId, query }) {
  const filter = { trainerId };
  if (query.goal) filter.goal = query.goal;
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: regex }, { description: regex }, { tags: regex }];
  }
  const docs = await DietTemplate.find(filter).sort({ updatedAt: -1 }).lean();
  return docs.map(formatDietTemplate);
}

async function getDietTemplateById({ trainerId, templateId }) {
  const doc = await DietTemplate.findOne({ _id: templateId, trainerId }).lean();
  if (!doc) {
    throw new AppError(404, 'Diet template not found', 'NOT_FOUND');
  }
  return formatDietTemplate(doc);
}

async function createDietTemplate({ trainerId, payload }) {
  const { meals, dailyTotals } = await hydrateDietMeals(trainerId, payload.meals || []);

  const template = await DietTemplate.create({
    trainerId,
    name: payload.name,
    description: payload.description || '',
    goal: payload.goal || '',
    tags: payload.tags || [],
    targets: payload.targets || undefined,
    meals,
    dailyTotals,
    supplements: payload.supplements || [],
    notes: payload.notes || '',
  });

  return formatDietTemplate(template);
}

async function updateDietTemplate({ trainerId, templateId, payload }) {
  const template = await DietTemplate.findOne({ _id: templateId, trainerId });
  if (!template) {
    throw new AppError(404, 'Diet template not found', 'NOT_FOUND');
  }

  if (payload.name !== undefined) template.name = payload.name;
  if (payload.description !== undefined) template.description = payload.description;
  if (payload.goal !== undefined) template.goal = payload.goal;
  if (payload.tags !== undefined) template.tags = payload.tags;
  if (payload.targets !== undefined) template.targets = payload.targets;
  if (payload.supplements !== undefined) template.supplements = payload.supplements;
  if (payload.notes !== undefined) template.notes = payload.notes;

  if (payload.meals !== undefined) {
    const computed = await hydrateDietMeals(trainerId, payload.meals);
    template.meals = computed.meals;
    template.dailyTotals = computed.dailyTotals;
  }

  await template.save();
  return formatDietTemplate(template);
}

async function deleteDietTemplate({ trainerId, templateId }) {
  const deleted = await DietTemplate.findOneAndDelete({ _id: templateId, trainerId });
  if (!deleted) {
    throw new AppError(404, 'Diet template not found', 'NOT_FOUND');
  }
}

async function assignDietTemplateToClient({ trainerId, templateId, payload }) {
  const template = await DietTemplate.findOne({ _id: templateId, trainerId }).lean();
  if (!template) {
    throw new AppError(404, 'Diet template not found', 'NOT_FOUND');
  }

  await assertClientOwned(trainerId, payload.clientId);

  const plan = await DietPlan.create({
    trainerId,
    clientId: payload.clientId,
    name: (payload.name || template.name).slice(0, 120),
    dayType: payload.dayType || 'all',
    isActive: payload.setAsActive ?? true,
    targets: template.targets,
    meals: cloneMealsForNewPlan(template.meals),
    dailyTotals: template.dailyTotals,
    supplements: template.supplements || [],
    notes: template.notes || '',
    shareToken: crypto.randomBytes(12).toString('hex'),
  });

  if (plan.isActive) {
    await syncClientActiveDiet(trainerId, plan.clientId, plan._id, plan.dayType);
  }

  return formatDietPlan(plan);
}

module.exports = {
  listFoods,
  createFood,
  updateFood,
  deleteFood,
  listDietPlans,
  getDietPlanById,
  createDietPlan,
  updateDietPlan,
  deleteDietPlan,
  duplicateDietPlan,
  saveDietPlanAsTemplate,
  getSharedDietPlanByToken,
  listDietTemplates,
  getDietTemplateById,
  createDietTemplate,
  updateDietTemplate,
  deleteDietTemplate,
  assignDietTemplateToClient,
};
