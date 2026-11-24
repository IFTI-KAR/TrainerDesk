const mongoose = require('mongoose');
const Client = require('../models/Client');
const AppError = require('../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../utils/pagination');
const storageService = require('./storage.service');

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - dob.getUTCFullYear();
  const monthDiff = now.getUTCMonth() - dob.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getUTCDate() < dob.getUTCDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function calculateBmi(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  const bmi = weightKg / (heightM * heightM);
  return Math.round(bmi * 10) / 10;
}

function formatClient(doc) {
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  const noteEntries = [...(obj.noteEntries || [])]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((entry) => ({
      id: entry._id.toString(),
      text: entry.text,
      createdAt: entry.createdAt,
    }));

  return {
    id: obj._id.toString(),
    name: obj.name,
    photoUrl: obj.photoUrl || '',
    phone: obj.phone || '',
    email: obj.email || '',
    gender: obj.gender || 'prefer_not_to_say',
    dateOfBirth: obj.dateOfBirth || null,
    age: calculateAge(obj.dateOfBirth),
    heightCm: obj.heightCm ?? null,
    startingWeightKg: obj.startingWeightKg ?? null,
    startingBmi: calculateBmi(obj.startingWeightKg, obj.heightCm),
    targetWeightKg: obj.targetWeightKg ?? null,
    targetWaistCm: obj.targetWaistCm ?? null,
    targetBodyFatPct: obj.targetBodyFatPct ?? null,
    goal: obj.goal,
    medicalNotes: obj.medicalNotes || '',
    injuries: obj.injuries || [],
    membershipStart: obj.membershipStart || null,
    membershipEnd: obj.membershipEnd || null,
    status: obj.status,
    emergencyContact: {
      name: obj.emergencyContact?.name || '',
      phone: obj.emergencyContact?.phone || '',
      relation: obj.emergencyContact?.relation || '',
    },
    notes: obj.notes || '',
    noteEntries,
    preferredTrainingDays: obj.preferredTrainingDays || [],
    activeWorkoutPlanId: obj.activeWorkoutPlanId ? obj.activeWorkoutPlanId.toString() : null,
    activeDietPlanId: obj.activeDietPlanId ? obj.activeDietPlanId.toString() : null,
    portalEnabled: Boolean(obj.portalAuth?.enabled),
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

async function listClients({ trainerId, query }) {
  const { page, limit, skip } = parsePagination(query, { page: 1, limit: 20, maxLimit: 100 });
  const filter = { trainerId };

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.goal) {
    filter.goal = query.goal;
  }

  if (query.trainingDay !== undefined) {
    const day = Number(query.trainingDay);
    const ScheduleRule = mongoose.models.ScheduleRule;
    if (ScheduleRule) {
      const scheduledClientIds = await ScheduleRule.distinct('clientId', {
        trainerId,
        isActive: true,
        daysOfWeek: day,
      });
      filter.$or = [{ preferredTrainingDays: day }, { _id: { $in: scheduledClientIds } }];
    } else {
      filter.preferredTrainingDays = day;
    }
  }

  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), 'i');
    const searchClause = {
      $or: [{ name: regex }, { email: regex }, { phone: regex }],
    };
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, searchClause];
      delete filter.$or;
    } else {
      Object.assign(filter, searchClause);
    }
  }

  let sortObj = { name: 1, _id: 1 };
  if (query.sort === 'newest') {
    sortObj = { createdAt: -1 };
  } else if (query.sort === 'membershipEnd') {
    sortObj = { membershipEnd: 1, name: 1 };
  }

  const [docs, total] = await Promise.all([
    Client.find(filter).sort(sortObj).skip(skip).limit(limit).lean(),
    Client.countDocuments(filter),
  ]);

  return {
    clients: docs.map(formatClient),
    pagination: buildPaginationMeta(total, page, limit),
  };
}

async function getClientStats({ trainerId }) {
  const now = new Date();
  const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const inFourteenDays = new Date(todayStart.getTime() + 14 * 24 * 60 * 60 * 1000);

  const [total, active, inactive, expiringSoon] = await Promise.all([
    Client.countDocuments({ trainerId }),
    Client.countDocuments({ trainerId, status: 'active' }),
    Client.countDocuments({ trainerId, status: 'inactive' }),
    Client.countDocuments({
      trainerId,
      status: 'active',
      membershipEnd: { $gte: todayStart, $lte: inFourteenDays },
    }),
  ]);

  return {
    total,
    active,
    inactive,
    expiringSoon,
  };
}

async function getClientById({ trainerId, clientId }) {
  const doc = await Client.findOne({ _id: clientId, trainerId }).lean();
  if (!doc) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }
  return formatClient(doc);
}

async function createClient({ trainerId, payload, file }) {
  let photoUrl = payload.photoUrl || '';
  let photoPublicId = '';

  if (file) {
    const uploaded = await storageService.uploadImage(file, { folder: 'clients' });
    photoUrl = uploaded.url;
    photoPublicId = uploaded.publicId;
  }

  const client = await Client.create({
    trainerId,
    name: payload.name,
    photoUrl,
    photoPublicId,
    phone: payload.phone || '',
    email: payload.email || '',
    gender: payload.gender || 'prefer_not_to_say',
    dateOfBirth: payload.dateOfBirth ?? null,
    heightCm: payload.heightCm ?? null,
    startingWeightKg: payload.startingWeightKg ?? null,
    targetWeightKg: payload.targetWeightKg ?? null,
    targetWaistCm: payload.targetWaistCm ?? null,
    targetBodyFatPct: payload.targetBodyFatPct ?? null,
    goal: payload.goal || 'general_fitness',
    medicalNotes: payload.medicalNotes || '',
    injuries: payload.injuries || [],
    membershipStart: payload.membershipStart ?? null,
    membershipEnd: payload.membershipEnd ?? null,
    status: payload.status || 'active',
    emergencyContact: payload.emergencyContact || { name: '', phone: '', relation: '' },
    notes: payload.notes || '',
    preferredTrainingDays: payload.preferredTrainingDays || [],
  });

  return formatClient(client);
}

async function updateClient({ trainerId, clientId, payload, file }) {
  const client = await Client.findOne({ _id: clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }

  let oldPhotoPublicId = '';

  if (file) {
    const uploaded = await storageService.uploadImage(file, { folder: 'clients' });
    oldPhotoPublicId = client.photoPublicId || '';
    client.photoUrl = uploaded.url;
    client.photoPublicId = uploaded.publicId;
  } else if (payload.removePhoto === 'true') {
    oldPhotoPublicId = client.photoPublicId || '';
    client.photoUrl = '';
    client.photoPublicId = '';
  } else if (payload.photoUrl !== undefined) {
    if (client.photoPublicId && payload.photoUrl !== client.photoUrl) {
      oldPhotoPublicId = client.photoPublicId;
      client.photoPublicId = '';
    }
    client.photoUrl = payload.photoUrl;
  }

  const updatableFields = [
    'name',
    'phone',
    'email',
    'gender',
    'dateOfBirth',
    'heightCm',
    'startingWeightKg',
    'targetWeightKg',
    'targetWaistCm',
    'targetBodyFatPct',
    'goal',
    'medicalNotes',
    'injuries',
    'membershipStart',
    'membershipEnd',
    'status',
    'emergencyContact',
    'notes',
    'preferredTrainingDays',
  ];

  for (const field of updatableFields) {
    if (payload[field] !== undefined) {
      client[field] = payload[field];
    }
  }

  await client.save();

  if (oldPhotoPublicId) {
    await storageService.deleteImage(oldPhotoPublicId).catch(() => {});
  }

  return formatClient(client);
}

async function addClientNote({ trainerId, clientId, text }) {
  const client = await Client.findOne({ _id: clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }

  client.noteEntries.push({ text });
  await client.save();
  return formatClient(client);
}

async function deleteClientNote({ trainerId, clientId, noteId }) {
  const client = await Client.findOneAndUpdate(
    { _id: clientId, trainerId },
    { $pull: { noteEntries: { _id: noteId } } },
    { new: true }
  );

  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }

  return formatClient(client);
}

async function deleteClient({ trainerId, clientId }) {
  const client = await Client.findOneAndDelete({ _id: clientId, trainerId });
  if (!client) {
    throw new AppError(404, 'Client not found', 'NOT_FOUND');
  }

  if (client.photoPublicId) {
    await storageService.deleteImage(client.photoPublicId).catch(() => {});
  }
}

module.exports = {
  calculateAge,
  calculateBmi,
  formatClient,
  listClients,
  getClientStats,
  getClientById,
  createClient,
  updateClient,
  addClientNote,
  deleteClientNote,
  deleteClient,
};
