import api from './api';

export const MEASUREMENT_METRICS = [
  { key: 'weightKg', label: 'Weight', unit: 'kg', targetField: 'targetWeightKg' },
  { key: 'bodyFatPct', label: 'Body fat', unit: '%', targetField: 'targetBodyFatPct' },
  { key: 'bmi', label: 'BMI', unit: '', targetField: null },
  { key: 'waistCm', label: 'Waist', unit: 'cm', targetField: 'targetWaistCm' },
  { key: 'chestCm', label: 'Chest', unit: 'cm', targetField: null },
  { key: 'armsCm', label: 'Arms', unit: 'cm', targetField: null },
  { key: 'hipsCm', label: 'Hips', unit: 'cm', targetField: null },
  { key: 'thighsCm', label: 'Thighs', unit: 'cm', targetField: null },
  { key: 'calvesCm', label: 'Calves', unit: 'cm', targetField: null },
  { key: 'neckCm', label: 'Neck', unit: 'cm', targetField: null },
  { key: 'shouldersCm', label: 'Shoulders', unit: 'cm', targetField: null },
];

export const PHOTO_POSES = ['front', 'side', 'back'];

export async function fetchClientProgress(clientId) {
  const res = await api.get(`/progress/${clientId}`);
  return res.data.data;
}

export async function createMeasurement(payload) {
  const res = await api.post('/measurements', payload);
  return res.data.data.measurement;
}

export async function updateMeasurement({ id, payload }) {
  const res = await api.patch(`/measurements/${id}`, payload);
  return res.data.data.measurement;
}

export async function deleteMeasurement(id) {
  const res = await api.delete(`/measurements/${id}`);
  return res.data;
}

export async function uploadProgressPhoto(formData) {
  const res = await api.post('/progress-photos', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.data.photo;
}

export async function deleteProgressPhoto(id) {
  const res = await api.delete(`/progress-photos/${id}`);
  return res.data;
}
