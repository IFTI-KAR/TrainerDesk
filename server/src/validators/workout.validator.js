const { z } = require('zod');
const { SUPERSET_GROUPS, TRACKING_TYPES } = require('../models/workoutSubschemas');
const { CLIENT_GOALS } = require('../models/Client');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const setTargetZod = z.object({
  setNumber: z.coerce.number().int().min(1).optional(),
  targetReps: z.union([z.string(), z.number()]).transform((v) => String(v).trim().slice(0, 30)).optional().default('10'),
  targetDurationSec: z
    .union([z.coerce.number().min(0), z.null(), z.literal('')])
    .transform((v) => (v === '' || v === null ? null : v))
    .optional()
    .default(null),
  targetWeight: z
    .union([z.coerce.number().min(0), z.null(), z.literal('')])
    .transform((v) => (v === '' || v === null ? null : v))
    .optional()
    .default(null),
  weightUnit: z.enum(['kg', 'lb']).optional().default('kg'),
  restSec: z.coerce.number().int().min(0).max(600).optional().default(60),
});

const dayExerciseZod = z.object({
  id: objectIdSchema.optional(),
  exerciseId: objectIdSchema,
  exerciseName: z.string().trim().max(120).optional(),
  exerciseImageUrl: z.string().trim().optional(),
  primaryMuscle: z.string().trim().optional(),
  order: z.coerce.number().int().min(0).optional(),
  supersetGroup: z.enum(SUPERSET_GROUPS).optional().default(''),
  trackingType: z.enum(TRACKING_TYPES).optional().default('reps_weight'),
  tempo: z.string().trim().max(20).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  sets: z.array(setTargetZod).min(1, 'At least one set target is required'),
});

const workoutDayZod = z.object({
  id: objectIdSchema.optional(),
  name: z.string().trim().min(1, 'Day name is required').max(100),
  focus: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
  order: z.coerce.number().int().min(0).optional(),
  exercises: z.array(dayExerciseZod).optional().default([]),
});

const listPlansSchema = {
  query: z.object({
    clientId: objectIdSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};

const planIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const duplicateDayParamSchema = {
  params: z.object({
    id: objectIdSchema,
    dayId: objectIdSchema,
  }),
};

const createPlanSchema = {
  body: z.object({
    clientId: objectIdSchema,
    name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(120),
    description: z.string().trim().max(500).optional().default(''),
    isActive: z.boolean().optional().default(true),
    workoutDays: z.array(workoutDayZod).optional().default([]),
  }),
};

const updatePlanSchema = {
  params: planIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2, 'Plan name must be at least 2 characters').max(120).optional(),
    description: z.string().trim().max(500).optional(),
    isActive: z.boolean().optional(),
    workoutDays: z.array(workoutDayZod).optional(),
  }),
};

const duplicatePlanSchema = {
  params: planIdParamSchema.params,
  body: z.object({
    targetClientId: objectIdSchema.optional(),
    name: z.string().trim().min(2).max(120).optional(),
    setAsActive: z.boolean().optional().default(true),
  }),
};

const saveAsTemplateSchema = {
  params: planIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    goal: z.enum([...CLIENT_GOALS, '']).optional().default(''),
    tags: z.array(z.string().trim().max(40)).optional().default([]),
  }),
};

const listTemplatesSchema = {
  query: z.object({
    search: z.string().trim().max(100).optional(),
    goal: z.enum(CLIENT_GOALS).optional(),
  }),
};

const templateIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const createTemplateSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Template name must be at least 2 characters').max(120),
    description: z.string().trim().max(500).optional().default(''),
    goal: z.enum([...CLIENT_GOALS, '']).optional().default(''),
    tags: z.array(z.string().trim().max(40)).optional().default([]),
    workoutDays: z.array(workoutDayZod).optional().default([]),
  }),
};

const updateTemplateSchema = {
  params: templateIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().max(500).optional(),
    goal: z.enum([...CLIENT_GOALS, '']).optional(),
    tags: z.array(z.string().trim().max(40)).optional(),
    workoutDays: z.array(workoutDayZod).optional(),
  }),
};

const assignTemplateSchema = {
  params: templateIdParamSchema.params,
  body: z.object({
    clientId: objectIdSchema,
    name: z.string().trim().min(2).max(120).optional(),
    setAsActive: z.boolean().optional().default(true),
  }),
};

module.exports = {
  listPlansSchema,
  planIdParamSchema,
  duplicateDayParamSchema,
  createPlanSchema,
  updatePlanSchema,
  duplicatePlanSchema,
  saveAsTemplateSchema,
  listTemplatesSchema,
  templateIdParamSchema,
  createTemplateSchema,
  updateTemplateSchema,
  assignTemplateSchema,
};
