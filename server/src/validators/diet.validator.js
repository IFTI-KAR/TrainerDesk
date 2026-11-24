const { z } = require('zod');
const { FOOD_CATEGORIES, FOOD_MEASURES } = require('../models/Food');
const { DIET_DAY_TYPES } = require('../models/DietPlan');
const { CLIENT_GOALS } = require('../models/Client');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const servingZod = z.object({
  measure: z.enum(FOOD_MEASURES),
  baseQuantity: z.coerce.number().min(0.01).default(1),
  label: z.string().trim().min(1).max(80),
  gramsEquivalent: z.coerce.number().min(0).optional().default(100),
  calories: z.coerce.number().min(0),
  protein: z.coerce.number().min(0),
  carbs: z.coerce.number().min(0),
  fat: z.coerce.number().min(0),
  fiber: z.coerce.number().min(0).optional().default(0),
});

const listFoodsSchema = {
  query: z.object({
    search: z.string().trim().max(100).optional(),
    category: z.enum(FOOD_CATEGORIES).optional(),
    customOnly: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

const foodIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

const createFoodSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Food name must be at least 2 characters').max(120),
    category: z.enum(FOOD_CATEGORIES).optional().default('other'),
    servings: z.array(servingZod).min(1, 'At least one serving measure is required'),
    defaultServingIndex: z.coerce.number().int().min(0).optional().default(0),
  }),
};

const updateFoodSchema = {
  params: foodIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    category: z.enum(FOOD_CATEGORIES).optional(),
    servings: z.array(servingZod).min(1).optional(),
    defaultServingIndex: z.coerce.number().int().min(0).optional(),
  }),
};

const dietTargetZod = z.object({
  calories: z.coerce.number().min(0).default(2000),
  protein: z.coerce.number().min(0).default(140),
  carbs: z.coerce.number().min(0).default(220),
  fat: z.coerce.number().min(0).default(65),
  fiber: z.coerce.number().min(0).optional().default(30),
  waterLiters: z.coerce.number().min(0).optional().default(3),
});

const mealItemZod = z.object({
  foodId: objectIdSchema,
  foodName: z.string().trim().max(120).optional(),
  quantity: z.coerce.number().min(0.01),
  measure: z.string().trim().min(1).max(30),
});

const mealZod = z.object({
  name: z.string().trim().min(1, 'Meal name is required').max(80),
  time: z.string().trim().max(10).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  items: z.array(mealItemZod).optional().default([]),
});

const supplementZod = z.object({
  name: z.string().trim().min(1).max(100),
  dosage: z.string().trim().max(80).optional().default(''),
  timing: z.string().trim().max(80).optional().default(''),
  notes: z.string().trim().max(200).optional().default(''),
});

const listDietPlansSchema = {
  query: z.object({
    clientId: objectIdSchema.optional(),
    dayType: z.enum(DIET_DAY_TYPES).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};

const dietIdParamSchema = {
  params: z.object({ id: objectIdSchema }),
};

const shareTokenParamSchema = {
  params: z.object({
    shareToken: z.string().trim().min(8).max(64),
  }),
};

const createDietPlanSchema = {
  body: z.object({
    clientId: objectIdSchema,
    name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(120),
    dayType: z.enum(DIET_DAY_TYPES).optional().default('all'),
    isActive: z.boolean().optional().default(true),
    targets: dietTargetZod.optional(),
    meals: z.array(mealZod).optional().default([]),
    supplements: z.array(supplementZod).optional().default([]),
    notes: z.string().trim().max(2000).optional().default(''),
  }),
};

const updateDietPlanSchema = {
  params: dietIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    dayType: z.enum(DIET_DAY_TYPES).optional(),
    isActive: z.boolean().optional(),
    targets: dietTargetZod.optional(),
    meals: z.array(mealZod).optional(),
    supplements: z.array(supplementZod).optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
};

const duplicateDietPlanSchema = {
  params: dietIdParamSchema.params,
  body: z.object({
    targetClientId: objectIdSchema.optional(),
    name: z.string().trim().min(2).max(120).optional(),
    dayType: z.enum(DIET_DAY_TYPES).optional(),
    setAsActive: z.boolean().optional().default(true),
  }),
};

const saveDietAsTemplateSchema = {
  params: dietIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional().default(''),
    goal: z.enum([...CLIENT_GOALS, '']).optional().default(''),
    tags: z.array(z.string().trim().max(40)).optional().default([]),
  }),
};

const listDietTemplatesSchema = {
  query: z.object({
    search: z.string().trim().max(100).optional(),
    goal: z.enum(CLIENT_GOALS).optional(),
  }),
};

const createDietTemplateSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(120),
    description: z.string().trim().max(500).optional().default(''),
    goal: z.enum([...CLIENT_GOALS, '']).optional().default(''),
    tags: z.array(z.string().trim().max(40)).optional().default([]),
    targets: dietTargetZod.optional(),
    meals: z.array(mealZod).optional().default([]),
    supplements: z.array(supplementZod).optional().default([]),
    notes: z.string().trim().max(2000).optional().default(''),
  }),
};

const updateDietTemplateSchema = {
  params: dietIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    goal: z.enum([...CLIENT_GOALS, '']).optional(),
    tags: z.array(z.string().trim().max(40)).optional(),
    targets: dietTargetZod.optional(),
    meals: z.array(mealZod).optional(),
    supplements: z.array(supplementZod).optional(),
    notes: z.string().trim().max(2000).optional(),
  }),
};

const assignDietTemplateSchema = {
  params: dietIdParamSchema.params,
  body: z.object({
    clientId: objectIdSchema,
    name: z.string().trim().min(2).max(120).optional(),
    dayType: z.enum(DIET_DAY_TYPES).optional().default('all'),
    setAsActive: z.boolean().optional().default(true),
  }),
};

module.exports = {
  listFoodsSchema,
  foodIdParamSchema,
  createFoodSchema,
  updateFoodSchema,
  listDietPlansSchema,
  dietIdParamSchema,
  shareTokenParamSchema,
  createDietPlanSchema,
  updateDietPlanSchema,
  duplicateDietPlanSchema,
  saveDietAsTemplateSchema,
  listDietTemplatesSchema,
  createDietTemplateSchema,
  updateDietTemplateSchema,
  assignDietTemplateSchema,
};
