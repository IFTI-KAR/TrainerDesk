const { z } = require('zod');
const { PHOTO_POSES } = require('../models/ProgressPhoto');

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');
const dateStrSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

function optionalMetric(min = 0, max = 400) {
  return z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === '' || val === null) return null;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  }, z.number().min(min).max(max).nullable().optional());
}

function isValidImagePathOrUrl(val) {
  if (!val) return true;
  if (val.startsWith('/uploads/')) return true;
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

const listMeasurementsSchema = {
  query: z.object({
    clientId: objectIdSchema,
  }),
};

const measurementIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const measurementFields = {
  weightKg: optionalMetric(20, 350),
  bodyFatPct: optionalMetric(2, 75),
  chestCm: optionalMetric(30, 250),
  waistCm: optionalMetric(30, 250),
  hipsCm: optionalMetric(30, 250),
  armsCm: optionalMetric(10, 100),
  thighsCm: optionalMetric(20, 150),
  calvesCm: optionalMetric(15, 100),
  neckCm: optionalMetric(15, 100),
  shouldersCm: optionalMetric(40, 250),
  notes: z.string().trim().max(1000).optional(),
};

const createMeasurementSchema = {
  body: z.object({
    clientId: objectIdSchema,
    date: dateStrSchema,
    ...measurementFields,
  }),
};

const updateMeasurementSchema = {
  params: measurementIdParamSchema.params,
  body: z.object({
    date: dateStrSchema.optional(),
    ...measurementFields,
  }),
};

const listPhotosSchema = {
  query: z.object({
    clientId: objectIdSchema,
    pose: z.enum(PHOTO_POSES).optional(),
  }),
};

const photoIdParamSchema = {
  params: z.object({
    id: objectIdSchema,
  }),
};

const createPhotoSchema = {
  body: z.object({
    clientId: objectIdSchema,
    date: dateStrSchema,
    pose: z.enum(PHOTO_POSES),
    weightKg: optionalMetric(20, 350),
    notes: z.string().trim().max(500).optional().default(''),
    imageUrl: z
      .string()
      .trim()
      .refine(isValidImagePathOrUrl, 'Must be a valid http(s) URL or /uploads path')
      .optional(),
  }),
};

const clientProgressParamSchema = {
  params: z.object({
    clientId: objectIdSchema,
  }),
};

module.exports = {
  listMeasurementsSchema,
  measurementIdParamSchema,
  createMeasurementSchema,
  updateMeasurementSchema,
  listPhotosSchema,
  photoIdParamSchema,
  createPhotoSchema,
  clientProgressParamSchema,
};
