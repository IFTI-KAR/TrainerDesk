import api from './api';

export const CLIENT_GOALS = [
  'fat_loss',
  'muscle_gain',
  'strength',
  'endurance',
  'general_fitness',
];

export const CLIENT_GENDERS = [
  'male',
  'female',
  'other',
  'prefer_not_to_say',
];

export const WEEKDAYS = [
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
  { value: 0, short: 'Sun', label: 'Sunday' },
];

const GOAL_LABELS = {
  fat_loss: 'Fat loss',
  muscle_gain: 'Muscle gain',
  strength: 'Strength',
  endurance: 'Endurance',
  general_fitness: 'General fitness',
};

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  other: 'Other',
  prefer_not_to_say: 'Prefer not to say',
};

export function formatGoal(goal) {
  return GOAL_LABELS[goal] || goal || 'General fitness';
}

export function formatGender(gender) {
  return GENDER_LABELS[gender] || 'Prefer not to say';
}

export function formatDateInput(isoString) {
  if (!isoString) return '';
  return String(isoString).slice(0, 10);
}

export function formatShortDate(isoString) {
  if (!isoString) return 'Not set';
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return 'Not set';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(dt);
}

export function getWeekdayShort(dayNum) {
  return WEEKDAYS.find((d) => d.value === dayNum)?.short || '';
}

export async function fetchClients(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await api.get('/clients', { params: cleaned });
  return res.data.data;
}

export async function fetchClientStats() {
  const res = await api.get('/clients/stats');
  return res.data.data.stats;
}

export async function fetchClientById(id) {
  const res = await api.get(`/clients/${id}`);
  return res.data.data.client;
}

export async function createClient(formData) {
  const res = await api.post('/clients', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.client;
}

export async function updateClient({ id, formData }) {
  const isFormData = formData instanceof FormData;
  const res = await api.patch(`/clients/${id}`, formData, {
    headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
  });
  return res.data.data.client;
}

export async function addClientNote({ id, text }) {
  const res = await api.post(`/clients/${id}/notes`, { text });
  return res.data.data.client;
}

export async function deleteClientNote({ id, noteId }) {
  const res = await api.delete(`/clients/${id}/notes/${noteId}`);
  return res.data.data.client;
}

export async function deleteClient(id) {
  const res = await api.delete(`/clients/${id}`);
  return res.data;
}
