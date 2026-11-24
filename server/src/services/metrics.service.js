const LB_TO_KG = 0.45359237;

function round1(value) {
  return Math.round(value * 10) / 10;
}

function toKg(weight, unit = 'kg') {
  const num = Number(weight || 0);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return unit === 'lb' ? num * LB_TO_KG : num;
}

function calculateEpley1RM(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return 0;
  if (r === 1) return round1(w);
  return round1(w * (1 + r / 30));
}

function calculateSetVolume(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(r) || r <= 0) return 0;
  return round1(w * r);
}

function calculateBmi(weightKg, heightCm) {
  const w = Number(weightKg);
  const h = Number(heightCm);
  if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(h) || h <= 0) return null;
  const meters = h / 100;
  return round1(w / (meters * meters));
}

function detectPRsForLoggedExercises(loggedExercises = [], historicalBestByExercise = {}) {
  let totalVolume = 0;
  let prCount = 0;
  const prHighlights = [];

  const annotatedExercises = loggedExercises.map((ex) => {
    const exId = String(ex.exerciseId);
    const hist = historicalBestByExercise[exId] || {
      hasHistory: false,
      maxWeightKg: 0,
      maxEst1RMKg: 0,
      maxSetVolumeKg: 0,
    };

    let runningMaxWeight = hist.maxWeightKg || 0;
    let runningMax1RM = hist.maxEst1RMKg || 0;
    let runningMaxSetVolume = hist.maxSetVolumeKg || 0;

    const annotatedSets = (ex.sets || []).map((set, idx) => {
      const setNumber = set.setNumber || idx + 1;
      const reps = set.reps !== null && set.reps !== undefined ? Number(set.reps) : null;
      const durationSec =
        set.durationSec !== null && set.durationSec !== undefined ? Number(set.durationSec) : null;
      const weight = set.weight !== null && set.weight !== undefined ? Number(set.weight) : null;
      const weightUnit = set.weightUnit || 'kg';
      const completed = Boolean(set.completed);

      let isPR = false;
      const prTypes = [];

      if (completed) {
        totalVolume += calculateSetVolume(weight, reps);

        if (hist.hasHistory && weight !== null && weight > 0 && reps !== null && reps > 0) {
          const weightKg = toKg(weight, weightUnit);
          const est1RMKg = calculateEpley1RM(weightKg, reps);
          const setVolumeKg = calculateSetVolume(weightKg, reps);

          if (weightKg > runningMaxWeight) {
            prTypes.push('max_weight');
            runningMaxWeight = weightKg;
          }
          if (est1RMKg > runningMax1RM) {
            prTypes.push('est_1rm');
            runningMax1RM = est1RMKg;
          }
          if (setVolumeKg > runningMaxSetVolume) {
            prTypes.push('max_volume');
            runningMaxSetVolume = setVolumeKg;
          }

          if (prTypes.length > 0) {
            isPR = true;
            prCount += 1;
            prHighlights.push({
              exerciseId: exId,
              exerciseName: ex.exerciseName || '',
              setNumber,
              weight,
              reps,
              weightUnit,
              prTypes,
            });
          }
        }
      }

      return {
        setNumber,
        reps,
        durationSec,
        weight,
        weightUnit,
        completed,
        isPR,
        prTypes,
        loggedAt: completed ? (set.loggedAt ? new Date(set.loggedAt) : new Date()) : null,
      };
    });

    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.exerciseName || '',
      notes: ex.notes || '',
      sets: annotatedSets,
    };
  });

  return {
    annotatedExercises,
    totalVolume: round1(totalVolume),
    prCount,
    prHighlights,
  };
}

module.exports = {
  round1,
  toKg,
  calculateEpley1RM,
  calculateSetVolume,
  calculateBmi,
  detectPRsForLoggedExercises,
};
