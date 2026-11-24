const {
  calculateEpley1RM,
  calculateSetVolume,
  calculateBmi,
  detectPRsForLoggedExercises,
} = require('../../services/metrics.service');

describe('Metrics & PR calculation service', () => {
  test('calculateEpley1RM handles 1RM, multi-rep, and invalid inputs', () => {
    expect(calculateEpley1RM(100, 1)).toBe(100);
    expect(calculateEpley1RM(100, 10)).toBe(133.3);
    expect(calculateEpley1RM(0, 10)).toBe(0);
    expect(calculateEpley1RM(80, 0)).toBe(0);
  });

  test('calculateSetVolume and calculateBmi compute accurate rounded metrics', () => {
    expect(calculateSetVolume(60, 10)).toBe(600);
    expect(calculateSetVolume(0, 10)).toBe(0);
    expect(calculateBmi(82, 175)).toBe(26.8);
    expect(calculateBmi(null, 175)).toBeNull();
  });

  test('detectPRsForLoggedExercises skips baseline without history and flags new PRs cleanly', () => {
    const exId = '656000000000000000000010';
    const logged = [
      {
        exerciseId: exId,
        exerciseName: 'Barbell Bench Press',
        sets: [
          { setNumber: 1, reps: 10, weight: 60, weightUnit: 'kg', completed: true },
          { setNumber: 2, reps: 10, weight: 70, weightUnit: 'kg', completed: true },
          { setNumber: 3, reps: 12, weight: 80, weightUnit: 'kg', completed: false }, // incomplete ignored
        ],
      },
    ];

    // Without prior history: totalVolume calculated, 0 PRs
    const baseline = detectPRsForLoggedExercises(logged, {});
    expect(baseline.totalVolume).toBe(1300);
    expect(baseline.prCount).toBe(0);

    // With prior history (best 65kg x 10 -> est 1RM 86.7, vol 650)
    const withHistory = detectPRsForLoggedExercises(logged, {
      [exId]: {
        hasHistory: true,
        maxWeightKg: 65,
        maxEst1RMKg: 86.7,
        maxSetVolumeKg: 650,
      },
    });
    expect(withHistory.prCount).toBe(1);
    expect(withHistory.annotatedExercises[0].sets[0].isPR).toBe(false);
    expect(withHistory.annotatedExercises[0].sets[1].isPR).toBe(true);
    expect(withHistory.annotatedExercises[0].sets[1].prTypes).toEqual([
      'max_weight',
      'est_1rm',
      'max_volume',
    ]);
    expect(withHistory.annotatedExercises[0].sets[2].isPR).toBe(false);
  });
});
