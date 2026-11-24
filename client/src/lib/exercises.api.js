import api from './api';

export const MUSCLE_GROUPS = [
  'chest',
  'back',
  'lower_back',
  'lats',
  'traps',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quadriceps',
  'hamstrings',
  'glutes',
  'calves',
  'abdominals',
  'abductors',
  'adductors',
  'neck',
  'full_body',
  'cardio',
];

export const EQUIPMENT_TYPES = [
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'bands',
  'medicine_ball',
  'ez_bar',
  'foam_roll',
  'other',
];

export const EXERCISE_CATEGORIES = ['strength', 'cardio', 'mobility', 'stretching'];

export const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced'];

const LABEL_OVERRIDES = {
  ez_bar: 'EZ bar',
  foam_roll: 'Foam roll',
  lower_back: 'Lower back',
  full_body: 'Full body',
  medicine_ball: 'Medicine ball',
};

export function formatLabel(slug = '') {
  if (LABEL_OVERRIDES[slug]) return LABEL_OVERRIDES[slug];
  const spaced = String(slug).replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export async function fetchExercises(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false)
  );
  const res = await api.get('/exercises', { params: cleaned });
  return res.data.data;
}

export async function fetchExerciseMeta() {
  const res = await api.get('/exercises/meta');
  return res.data.data;
}

export async function fetchExerciseById(id) {
  const res = await api.get(`/exercises/${id}`);
  return res.data.data.exercise;
}

export async function createExercise(formData) {
  const res = await api.post('/exercises', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.exercise;
}

export async function updateExercise({ id, formData }) {
  const res = await api.patch(`/exercises/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.exercise;
}

export async function deleteExercise(id) {
  const res = await api.delete(`/exercises/${id}`);
  return res.data;
}

export async function toggleFavoriteExercise(id) {
  const res = await api.post(`/exercises/${id}/favorite`);
  return res.data.data;
}
