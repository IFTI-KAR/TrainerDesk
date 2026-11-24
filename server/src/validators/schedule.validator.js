const { z } = require('zod');
const { SESSION_STATUSES } = require('../models/Session');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');
const nullableObjectId = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  objectIdSchema.nullable().optional()
);
const dateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const nullableDateStr = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  dateStrSchema.nullable().optional()
);
const timeStrSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Time must be HH:mm');

const nullableNonNegNumber = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.number().min(0).nullable().optional()
);

const listScheduleRulesSchema = {
  query: z.object({
    clientId: objectIdSchema.optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
};

const ruleIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const createScheduleRuleSchema = {
  body: z.object({
    clientId: objectIdSchema,
    daysOfWeek: z
      .array(z.coerce.number().int().min(0).max(6))
      .min(1, 'Select at least one training day'),
    time: timeStrSchema,
    durationMin: z.coerce.number().int().min(15).max(240).optional().default(60),
    workoutPlanId: nullableObjectId,
    workoutDayId: nullableObjectId,
    startDate: dateStrSchema,
    endDate: nullableDateStr,
    notes: z.string().trim().max(500).optional().default(''),
  }),
};

const updateScheduleRuleSchema = {
  params: ruleIdParamSchema.params,
  body: z.object({
    daysOfWeek: z.array(z.coerce.number().int().min(0).max(6)).min(1).optional(),
    time: timeStrSchema.optional(),
    durationMin: z.coerce.number().int().min(15).max(240).optional(),
    workoutPlanId: nullableObjectId,
    workoutDayId: nullableObjectId,
    startDate: dateStrSchema.optional(),
    endDate: nullableDateStr,
    isActive: z.boolean().optional(),
    notes: z.string().trim().max(500).optional(),
  }),
};

const listSessionsSchema = {
  query: z.object({
    date: dateStrSchema.optional(),
    startDate: dateStrSchema.optional(),
    endDate: dateStrSchema.optional(),
    clientId: objectIdSchema.optional(),
    status: z.enum(SESSION_STATUSES).optional(),
    includeCancelled: z.enum(['true', 'false']).optional(),
  }),
};

const weekSummarySchema = {
  query: z.object({
    date: dateStrSchema.optional(),
  }),
};

const sessionIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const createOneOffSessionSchema = {
  body: z.object({
    clientId: objectIdSchema,
    date: dateStrSchema,
    time: timeStrSchema,
    durationMin: z.coerce.number().int().min(15).max(240).optional().default(60),
    workoutPlanId: nullableObjectId,
    workoutDayId: nullableObjectId,
    sessionNotes: z.string().trim().max(2000).optional().default(''),
  }),
};

const rescheduleSessionSchema = {
  params: sessionIdParamSchema.params,
  body: z.object({
    date: dateStrSchema,
    time: timeStrSchema,
    durationMin: z.coerce.number().int().min(15).max(240).optional(),
    reason: z.string().trim().max(500).optional().default(''),
  }),
};

const cancelSessionSchema = {
  params: sessionIdParamSchema.params,
  body: z.object({
    reason: z.string().trim().max(500).optional().default(''),
  }),
};

const updateSessionStatusSchema = {
  params: sessionIdParamSchema.params,
  body: z.object({
    status: z.enum(['scheduled', 'in_progress', 'completed', 'missed']),
    missedReason: z.string().trim().max(500).optional(),
  }),
};

const loggedSetZod = z.object({
  setNumber: z.coerce.number().int().min(1),
  reps: nullableNonNegNumber,
  durationSec: nullableNonNegNumber,
  weight: nullableNonNegNumber,
  weightUnit: z.enum(['kg', 'lb']).optional().default('kg'),
  completed: z.boolean().optional().default(false),
  loggedAt: z.union([z.string(), z.date(), z.null()]).optional(),
});

const loggedExerciseZod = z.object({
  exerciseId: objectIdSchema,
  exerciseName: z.string().trim().max(120).optional().default(''),
  notes: z.string().trim().max(500).optional().default(''),
  sets: z.array(loggedSetZod).default([]),
});

const logSessionSchema = {
  params: sessionIdParamSchema.params,
  body: z.object({
    loggedExercises: z.array(loggedExerciseZod),
    sessionNotes: z.string().trim().max(2000).optional(),
    clientSyncId: z.string().trim().max(100).optional(),
  }),
};

const completeSessionSchema = {
  params: sessionIdParamSchema.params,
  body: z.object({
    loggedExercises: z.array(loggedExerciseZod).optional(),
    sessionNotes: z.string().trim().max(2000).optional(),
    clientSyncId: z.string().trim().max(100).optional(),
  }),
};

module.exports = {
  listScheduleRulesSchema,
  ruleIdParamSchema,
  createScheduleRuleSchema,
  updateScheduleRuleSchema,
  listSessionsSchema,
  weekSummarySchema,
  sessionIdParamSchema,
  createOneOffSessionSchema,
  rescheduleSessionSchema,
  cancelSessionSchema,
  updateSessionStatusSchema,
  logSessionSchema,
  completeSessionSchema,
};
