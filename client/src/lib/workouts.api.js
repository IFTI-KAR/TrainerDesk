import api from './api';

export const SUPERSET_GROUPS = ['', 'A', 'B', 'C', 'D', 'E'];

export const TRACKING_TYPES = [
  { value: 'reps_weight', label: 'Reps & weight' },
  { value: 'reps_only', label: 'Reps only' },
  { value: 'duration', label: 'Timed (sec)' },
];

export function createClientUid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `uid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultExerciseEntry(exercise, weightUnit = 'kg') {
  const isTimed = exercise.category === 'cardio' || exercise.category === 'stretching';
  const trackingType = isTimed
    ? 'duration'
    : exercise.equipment === 'bodyweight'
      ? 'reps_only'
      : 'reps_weight';

  return {
    _uid: createClientUid(),
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    exerciseImageUrl: exercise.imageUrl || '',
    primaryMuscle: exercise.primaryMuscle || '',
    supersetGroup: '',
    trackingType,
    tempo: '',
    notes: '',
    sets: [1, 2, 3].map((num) => ({
      setNumber: num,
      targetReps: isTimed ? '' : '10',
      targetDurationSec: isTimed ? 45 : null,
      targetWeight: trackingType === 'reps_weight' ? 20 : null,
      weightUnit,
      restSec: 60,
    })),
  };
}

export function formatExercisePrescription(ex) {
  const sets = ex.sets || [];
  if (sets.length === 0) return 'No sets';
  if (ex.trackingType === 'duration') {
    const secs = sets.map((s) => s.targetDurationSec ?? 0);
    const allSame = secs.every((v) => v === secs[0]);
    return allSame ? `${sets.length} × ${secs[0]}s` : `${sets.length} timed sets`;
  }
  const reps = sets.map((s) => s.targetReps || '10');
  const weights = sets.map((s) => s.targetWeight);
  const unit = sets[0]?.weightUnit || 'kg';
  const sameReps = reps.every((r) => r === reps[0]);
  const sameWeight = weights.every((w) => w === weights[0]);

  if (ex.trackingType === 'reps_only' || weights[0] === null || weights[0] === undefined) {
    return sameReps ? `${sets.length} × ${reps[0]}` : `${sets.length} sets`;
  }
  if (sameReps && sameWeight) {
    return `${sets.length} × ${reps[0]} @ ${weights[0]} ${unit}`;
  }
  return `${sets.length} sets (${reps.join(', ')})`;
}

export function serializeWorkoutDays(days = []) {
  return days.map((day, dayIdx) => ({
    ...(day.id ? { id: day.id } : {}),
    name: day.name,
    focus: day.focus || '',
    notes: day.notes || '',
    order: dayIdx,
    exercises: (day.exercises || []).map((ex, exIdx) => ({
      ...(ex.id ? { id: ex.id } : {}),
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName,
      exerciseImageUrl: ex.exerciseImageUrl || '',
      primaryMuscle: ex.primaryMuscle || '',
      order: exIdx,
      supersetGroup: ex.supersetGroup || '',
      trackingType: ex.trackingType || 'reps_weight',
      tempo: ex.tempo || '',
      notes: ex.notes || '',
      sets: (ex.sets || []).map((s, sIdx) => ({
        setNumber: sIdx + 1,
        targetReps: s.targetReps ?? '10',
        targetDurationSec:
          s.targetDurationSec === '' || s.targetDurationSec === undefined
            ? null
            : s.targetDurationSec,
        targetWeight:
          s.targetWeight === '' || s.targetWeight === undefined ? null : s.targetWeight,
        weightUnit: s.weightUnit || 'kg',
        restSec: Number(s.restSec ?? 60),
      })),
    })),
  }));
}

export async function fetchWorkoutPlans(params = {}) {
  const res = await api.get('/workout-plans', { params });
  return res.data.data.plans;
}

export async function fetchWorkoutPlanById(id) {
  const res = await api.get(`/workout-plans/${id}`);
  return res.data.data.plan;
}

export async function createWorkoutPlan(payload) {
  const res = await api.post('/workout-plans', payload);
  return res.data.data.plan;
}

export async function updateWorkoutPlan({ id, payload }) {
  const res = await api.patch(`/workout-plans/${id}`, payload);
  return res.data.data.plan;
}

export async function deleteWorkoutPlan(id) {
  const res = await api.delete(`/workout-plans/${id}`);
  return res.data;
}

export async function duplicateWorkoutDay({ planId, dayId }) {
  const res = await api.post(`/workout-plans/${planId}/duplicate-day/${dayId}`);
  return res.data.data.plan;
}

export async function duplicateWorkoutPlan({ id, payload }) {
  const res = await api.post(`/workout-plans/${id}/duplicate`, payload);
  return res.data.data.plan;
}

export async function savePlanAsTemplate({ id, payload }) {
  const res = await api.post(`/workout-plans/${id}/save-as-template`, payload);
  return res.data.data.template;
}

export async function fetchWorkoutTemplates(params = {}) {
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  );
  const res = await api.get('/workout-templates', { params: cleaned });
  return res.data.data.templates;
}

export async function createWorkoutTemplate(payload) {
  const res = await api.post('/workout-templates', payload);
  return res.data.data.template;
}

export async function updateWorkoutTemplate({ id, payload }) {
  const res = await api.patch(`/workout-templates/${id}`, payload);
  return res.data.data.template;
}

export async function deleteWorkoutTemplate(id) {
  const res = await api.delete(`/workout-templates/${id}`);
  return res.data;
}

export async function assignWorkoutTemplate({ id, payload }) {
  const res = await api.post(`/workout-templates/${id}/assign`, payload);
  return res.data.data.plan;
}
