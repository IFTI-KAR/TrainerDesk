const { z } = require('zod');
const {
  MUSCLE_GROUPS,
  EQUIPMENT_TYPES,
  EXERCISE_CATEGORIES,
  DIFFICULTY_LEVELS,
} = require('../models/Exercise');

function parseStringArray(val) {
  if (val === undefined || val === null) return undefined;
  if (Array.isArray(val)) {
    return val.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((item) => String(item).trim()).filter(Boolean);
        }
      } catch (_err) {
        // Fallback to newline split
      }
    }
    return trimmed
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

const optionalStringArray = z.preprocess(parseStringArray, z.array(z.string().max(500)).optional());

function isValidImageUrlOrPath(val) {
  if (!val) return true;
  if (val.startsWith('/uploads/')) return true;
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

function isValidHttpUrlOrEmpty(val) {
  if (!val) return true;
  try {
    const u = new URL(val);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_err) {
    return false;
  }
}

const exerciseIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid exercise ID'),
  }),
};

const listExercisesSchema = {
  query: z.object({
    search: z.string().trim().max(100).optional(),
    muscle: z.enum(MUSCLE_GROUPS).optional(),
    equipment: z.enum(EQUIPMENT_TYPES).optional(),
    category: z.enum(EXERCISE_CATEGORIES).optional(),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    favoritesOnly: z.enum(['true', 'false']).optional(),
    customOnly: z.enum(['true', 'false']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

const createExerciseSchema = {
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120),
    primaryMuscle: z.enum(MUSCLE_GROUPS),
    secondaryMuscles: z.preprocess(
      parseStringArray,
      z.array(z.enum(MUSCLE_GROUPS)).optional().default([])
    ),
    equipment: z.enum(EQUIPMENT_TYPES).optional().default('other'),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional().default('intermediate'),
    category: z.enum(EXERCISE_CATEGORIES).optional().default('strength'),
    imageUrl: z
      .string()
      .trim()
      .refine(isValidImageUrlOrPath, 'Must be a valid http(s) URL or /uploads path')
      .optional(),
    secondaryImageUrl: z
      .string()
      .trim()
      .refine(isValidImageUrlOrPath, 'Must be a valid http(s) URL or /uploads path')
      .optional(),
    mediaUrl: z
      .string()
      .trim()
      .refine(isValidHttpUrlOrEmpty, 'Media URL must be a valid http(s) URL')
      .optional(),
    instructions: z.preprocess(
      parseStringArray,
      z.array(z.string().max(500)).optional().default([])
    ),
    tips: z.preprocess(parseStringArray, z.array(z.string().max(500)).optional().default([])),
  }),
};

const updateExerciseSchema = {
  params: exerciseIdParamSchema.params,
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120).optional(),
    primaryMuscle: z.enum(MUSCLE_GROUPS).optional(),
    secondaryMuscles: z.preprocess(parseStringArray, z.array(z.enum(MUSCLE_GROUPS)).optional()),
    equipment: z.enum(EQUIPMENT_TYPES).optional(),
    difficulty: z.enum(DIFFICULTY_LEVELS).optional(),
    category: z.enum(EXERCISE_CATEGORIES).optional(),
    imageUrl: z
      .string()
      .trim()
      .refine(isValidImageUrlOrPath, 'Must be a valid http(s) URL or /uploads path')
      .optional(),
    secondaryImageUrl: z
      .string()
      .trim()
      .refine(isValidImageUrlOrPath, 'Must be a valid http(s) URL or /uploads path')
      .optional(),
    mediaUrl: z
      .string()
      .trim()
      .refine(isValidHttpUrlOrEmpty, 'Media URL must be a valid http(s) URL')
      .optional(),
    instructions: optionalStringArray,
    tips: optionalStringArray,
  }),
};

module.exports = {
  exerciseIdParamSchema,
  listExercisesSchema,
  createExerciseSchema,
  updateExerciseSchema,
};
