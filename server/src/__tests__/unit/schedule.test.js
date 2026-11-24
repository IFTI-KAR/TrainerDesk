const {
  doesRuleApplyOnDate,
  buildWorkoutSnapshotFromPlan,
} = require('../../services/schedule.service');
const { getWeekRangeMonSun, getDayOfWeek } = require('../../utils/dateUtils');

describe('Schedule generation & date utilities', () => {
  test('doesRuleApplyOnDate respects active flag, weekday, bounds, and excludedDates', () => {
    // 2026-11-23 is Monday (1), 2026-11-25 is Wednesday (3)
    const rule = {
      isActive: true,
      daysOfWeek: [1, 3, 5],
      startDate: '2026-11-20',
      endDate: '2026-12-10',
      excludedDates: ['2026-11-25'],
    };

    expect(getDayOfWeek('2026-11-23')).toBe(1);
    expect(doesRuleApplyOnDate(rule, '2026-11-23')).toBe(true);
    expect(doesRuleApplyOnDate(rule, '2026-11-24')).toBe(false); // Tuesday
    expect(doesRuleApplyOnDate(rule, '2026-11-25')).toBe(false); // Excluded Wednesday
    expect(doesRuleApplyOnDate(rule, '2026-11-18')).toBe(false); // Before startDate
    expect(doesRuleApplyOnDate(rule, '2026-12-11')).toBe(false); // After endDate
    expect(doesRuleApplyOnDate({ ...rule, isActive: false }, '2026-11-23')).toBe(false);
  });

  test('getWeekRangeMonSun handles mid-week, Monday, and Sunday boundaries', () => {
    const mid = getWeekRangeMonSun('2026-11-25'); // Wednesday
    expect(mid.startDate).toBe('2026-11-23');
    expect(mid.endDate).toBe('2026-11-29');
    expect(mid.dates).toHaveLength(7);

    const sun = getWeekRangeMonSun('2026-11-29'); // Sunday
    expect(sun.startDate).toBe('2026-11-23');
    expect(sun.endDate).toBe('2026-11-29');
  });

  test('buildWorkoutSnapshotFromPlan extracts exact day snapshot or safe fallback', () => {
    const plan = {
      workoutDays: [
        {
          _id: '656000000000000000000001',
          name: 'Day A - Push',
          focus: 'Chest',
          exercises: [
            {
              exerciseId: '656000000000000000000002',
              exerciseName: 'Bench Press',
              exerciseImageUrl: 'https://example.com/bench.jpg',
              primaryMuscle: 'chest',
              order: 0,
              supersetGroup: '',
              trackingType: 'reps_weight',
              tempo: '2-0-1-0',
              notes: 'Touch chest',
              sets: [{ setNumber: 1, targetReps: '10', targetWeight: 60, weightUnit: 'kg', restSec: 90 }],
            },
          ],
        },
      ],
    };

    const snap = buildWorkoutSnapshotFromPlan(plan, '656000000000000000000001');
    expect(snap.dayName).toBe('Day A - Push');
    expect(snap.exercises).toHaveLength(1);
    expect(snap.exercises[0].targetSets[0].targetWeight).toBe(60);

    const fallback = buildWorkoutSnapshotFromPlan(null, null, 'Conditioning');
    expect(fallback.dayName).toBe('Conditioning');
    expect(fallback.exercises).toEqual([]);
  });
});
