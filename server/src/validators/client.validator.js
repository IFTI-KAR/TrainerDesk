const { z } = require('zod');
const { CLIENT_GOALS, CLIENT_GENDERS, CLIENT_STATUSES } = require('../models/Client');

function optionalNumber(min, max) {
  return z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === '' || val === null) return null;
    const num = Number(val);
    return Number.isNaN(num) ? val : num;
  }, z.number().min(min).max(max).nullable().optional());
}

function optionalDate() {
  return z.preprocess((val) => {
    if (val === undefined) return undefined;
    if (val === '' || val === null) return null;
    const dt = new Date(val);
    return Number.isNaN(dt.getTime()) ? val : dt;
  }, z.date().nullable().optional());
}

function parseStringArray(val) {
  if (val === undefined) return undefined;
  if (val === null || val === '') return [];
  if (Array.isArray(val)) {
    return val.map((s) => String(s).trim()).filter(Boolean);
  }
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map((s) => String(s).trim()).filter(Boolean);
        }
      } catch (_err) {
        // Fallback to comma split
      }
    }
    return trimmed
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function parseNumberArray(val) {
  if (val === undefined) return undefined;
  if (val === null || val === '') return [];
  let arr = [];
  if (Array.isArray(val)) {
    arr = val;
  } else if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) arr = parsed;
      } catch (_err) {
        arr = trimmed.split(',');
      }
    } else {
      arr = trimmed.split(',');
    }
  }
  return Array.from(
    new Set(
      arr
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
    )
  );
}

function parseEmergencyContact(val) {
  if (val === undefined) return undefined;
  if (val === null || val === '') return { name: '', phone: '', relation: '' };
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch (_err) {
      return val;
    }
  }
  return val;
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

const emergencyContactSchema = z.preprocess(
  parseEmergencyContact,
  z
    .object({
      name: z.string().trim().max(100).optional().default(''),
      phone: z.string().trim().max(30).optional().default(''),
      relation: z.string().trim().max(60).optional().default(''),
    })
    .optional()
);

const clientIdParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID'),
  }),
};

const clientNoteParamSchema = {
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid client ID'),
    noteId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid note ID'),
  }),
};

const listClientsSchema = {
  query: z.object({
    search: z.string().trim().max(100).optional(),
    goal: z.enum(CLIENT_GOALS).optional(),
    status: z.enum(['active', 'inactive', 'all']).optional(),
    trainingDay: z.coerce.number().int().min(0).max(6).optional(),
    sort: z.enum(['name', 'newest', 'membershipEnd']).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
};

const baseClientBody = {
  name: z.string().trim().min(2, 'Client name must be at least 2 characters').max(120),
  phone: z.string().trim().max(30).optional(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || z.string().email().safeParse(v).success, 'Invalid email address')
    .optional(),
  gender: z.enum(CLIENT_GENDERS).optional(),
  dateOfBirth: optionalDate(),
  heightCm: optionalNumber(50, 260),
  startingWeightKg: optionalNumber(20, 350),
  targetWeightKg: optionalNumber(20, 350),
  targetWaistCm: optionalNumber(30, 250),
  targetBodyFatPct: optionalNumber(3, 70),
  goal: z.enum(CLIENT_GOALS).optional(),
  medicalNotes: z.string().trim().max(2000).optional(),
  injuries: z.preprocess(parseStringArray, z.array(z.string().max(120)).optional()),
  membershipStart: optionalDate(),
  membershipEnd: optionalDate(),
  status: z.enum(CLIENT_STATUSES).optional(),
  emergencyContact: emergencyContactSchema,
  notes: z.string().trim().max(5000).optional(),
  preferredTrainingDays: z.preprocess(
    parseNumberArray,
    z.array(z.number().int().min(0).max(6)).optional()
  ),
  photoUrl: z
    .string()
    .trim()
    .refine(isValidImagePathOrUrl, 'Must be a valid http(s) URL or /uploads path')
    .optional(),
};

const createClientSchema = {
  body: z.object({
    ...baseClientBody,
    goal: z.enum(CLIENT_GOALS).optional().default('general_fitness'),
  }),
};

const updateClientSchema = {
  params: clientIdParamSchema.params,
  body: z.object({
    ...baseClientBody,
    name: baseClientBody.name.optional(),
    removePhoto: z.enum(['true', 'false']).optional(),
  }),
};

const createClientNoteSchema = {
  params: clientIdParamSchema.params,
  body: z.object({
    text: z.string().trim().min(1, 'Note text is required').max(1000),
  }),
};

module.exports = {
  clientIdParamSchema,
  clientNoteParamSchema,
  listClientsSchema,
  createClientSchema,
  updateClientSchema,
  createClientNoteSchema,
};
