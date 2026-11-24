const { z } = require('zod');
const { REMINDER_TYPES } = require('../models/Reminder');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');
const dateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const dashboardStatsQuerySchema = {
  query: z.object({
    date: dateStrSchema.optional(),
  }),
};

const attendanceReportQuerySchema = {
  query: z.object({
    startDate: dateStrSchema.optional(),
    endDate: dateStrSchema.optional(),
    clientId: objectIdSchema.optional(),
  }),
};

const exportClientsQuerySchema = {
  query: z.object({
    status: z.enum(['active', 'inactive']).optional(),
    goal: z
      .enum(['fat_loss', 'muscle_gain', 'strength', 'endurance', 'general_fitness'])
      .optional(),
  }),
};

const exportSessionsQuerySchema = {
  query: z.object({
    startDate: dateStrSchema.optional(),
    endDate: dateStrSchema.optional(),
    clientId: objectIdSchema.optional(),
    status: z.enum(['scheduled', 'in_progress', 'completed', 'missed', 'cancelled']).optional(),
  }),
};

const listRemindersQuerySchema = {
  query: z.object({
    status: z.enum(['open', 'done', 'all']).optional(),
    clientId: objectIdSchema.optional(),
  }),
};

const reminderIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const optionalDueAtSchema = z.preprocess((val) => {
  if (val === undefined) return undefined;
  if (val === '' || val === null) return null;
  const parsed = new Date(val);
  return Number.isNaN(parsed.getTime()) ? val : parsed;
}, z.date().nullable().optional());

const createReminderSchema = {
  body: z.object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    clientId: z.preprocess(
      (val) => (val === '' ? null : val),
      objectIdSchema.nullable().optional()
    ),
    dueAt: optionalDueAtSchema,
    type: z.enum(REMINDER_TYPES).optional(),
    notes: z.string().trim().max(1000).optional(),
  }),
};

const updateReminderSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
  body: z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(200).optional(),
    clientId: z.preprocess(
      (val) => (val === '' ? null : val),
      objectIdSchema.nullable().optional()
    ),
    dueAt: optionalDueAtSchema,
    type: z.enum(REMINDER_TYPES).optional(),
    notes: z.string().trim().max(1000).optional(),
    isDone: z.boolean().optional(),
  }),
};

module.exports = {
  dashboardStatsQuerySchema,
  attendanceReportQuerySchema,
  exportClientsQuerySchema,
  exportSessionsQuerySchema,
  listRemindersQuerySchema,
  reminderIdParamSchema,
  createReminderSchema,
  updateReminderSchema,
};
