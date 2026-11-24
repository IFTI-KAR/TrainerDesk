const Exercise = require('../models/Exercise');
const WorkoutTemplate = require('../models/WorkoutTemplate');

function makeSetTargets(groups = []) {
  const sets = [];
  let setNum = 1;
  for (const g of groups) {
    const count = g.count || 3;
    for (let i = 0; i < count; i += 1) {
      sets.push({
        setNumber: setNum,
        targetReps: g.durationSec ? '' : String(g.reps ?? '12'),
        targetDurationSec: g.durationSec ?? null,
        targetWeight: null,
        weightUnit: 'kg',
        restSec: g.restSec ?? 60,
      });
      setNum += 1;
    }
  }
  return sets;
}

function buildExerciseResolver(globalExercises) {
  const bySourceId = new Map();
  for (const ex of globalExercises) {
    if (ex.sourceId) bySourceId.set(ex.sourceId, ex);
  }

  return function resolveEx(preferredSourceIds = [], fallbackPatterns = []) {
    for (const sid of preferredSourceIds) {
      if (bySourceId.has(sid)) return bySourceId.get(sid);
    }
    for (const pat of fallbackPatterns) {
      const rx = pat instanceof RegExp ? pat : new RegExp(pat, 'i');
      const hit = globalExercises.find((e) => rx.test(e.name));
      if (hit) return hit;
    }
    return globalExercises[0];
  };
}

function toDayExercise(ex, order, { sets, trackingType = 'reps_weight', notes = '', supersetGroup = '' }) {
  return {
    exerciseId: ex._id,
    exerciseName: ex.name,
    exerciseImageUrl: ex.imageUrl || '',
    primaryMuscle: ex.primaryMuscle || '',
    order,
    supersetGroup,
    trackingType,
    tempo: '',
    notes,
    sets,
  };
}

function buildAbsCircuitExercises(resolveEx) {
  return [
    toDayExercise(
      resolveEx(['Flat_Bench_Lying_Leg_Raise', 'Hanging_Leg_Raise'], [/leg raise/i]),
      0,
      { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
    ),
    toDayExercise(
      resolveEx(['3_4_Sit-Up'], [/sit-up/i]),
      1,
      { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
    ),
    toDayExercise(
      resolveEx(['Oblique_Crunches'], [/oblique crunch/i]),
      2,
      { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
    ),
    toDayExercise(
      resolveEx(['Reverse_Crunch'], [/reverse crunch/i]),
      3,
      { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
    ),
    toDayExercise(
      resolveEx(['Crunches'], [/^crunches$/i, /crunch/i]),
      4,
      { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
    ),
    toDayExercise(
      resolveEx(['custom-side-sit-up-crunches', 'Oblique_Crunches'], [/side sit-up/i, /oblique/i]),
      5,
      { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
    ),
  ];
}

async function seedWorkoutTemplates() {
  const globalExercises = await Exercise.find({ isGlobal: true }).lean();
  if (globalExercises.length === 0) {
    throw new Error('Global exercises must be seeded before seeding workout templates.');
  }

  const resolveEx = buildExerciseResolver(globalExercises);
  const absExercises = () => buildAbsCircuitExercises(resolveEx);

  const templates = [
    {
      sourceId: 'spartan-3day-12wk',
      trainerId: null,
      isGlobal: true,
      name: '3-Day Full Split + Abs (12 Weeks)',
      description:
        '12-week 3-day split (Chest/Shoulders/Abs, Back/Arms, Legs/Abs) with 10-min cardio finishers and dedicated 6-exercise Abs Circuit.',
      goal: 'general_fitness',
      tags: ['12-weeks', '3-day', 'full-split', 'abs'],
      workoutDays: [
        {
          name: 'Day 1 – Chest, Shoulders & Abs',
          focus: 'Chest, Shoulders, Core & Spin Finisher',
          order: 0,
          notes: 'Finish with 10 minutes on the Spinner and optional Abs Circuit.',
          exercises: [
            toDayExercise(
              resolveEx(['custom-machine-incline-press', 'Leverage_Incline_Chest_Press'], [/incline.*press/i]),
              0,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['Dumbbell_Bench_Press'], [/dumbbell bench press/i]),
              1,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['Pushups'], [/pushups/i, /push-up/i]),
              2,
              { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Dumbbell_Flyes'], [/dumbbell fly/i]),
              3,
              { sets: makeSetTargets([{ count: 3, reps: '15', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Dumbbell_Shoulder_Press'], [/dumbbell shoulder press/i]),
              4,
              { sets: makeSetTargets([{ count: 3, reps: '15', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['custom-seated-bent-over-db-row', 'Bent_Over_Two-Dumbbell_Row'], [/bent.?over.*row/i]),
              5,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Standing_Cable_Wood_Chop'], [/wood chop/i]),
              6,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Farmers_Walk'], [/farmer/i]),
              7,
              {
                notes: '20 steps per set',
                sets: makeSetTargets([{ count: 3, reps: '20', restSec: 60 }]),
              }
            ),
            toDayExercise(
              resolveEx(['custom-spinner-bike', 'Bicycling_Stationary'], [/spinner|stationary/i]),
              8,
              {
                trackingType: 'duration',
                notes: '10-minute steady or interval ride',
                sets: makeSetTargets([{ count: 1, durationSec: 600, restSec: 0 }]),
              }
            ),
          ],
        },
        {
          name: 'Day 2 – Back & Arms',
          focus: 'Back, Biceps & Triceps',
          order: 1,
          exercises: [
            toDayExercise(
              resolveEx(['Chin-Up'], [/chin-up/i]),
              0,
              { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 90 }]) }
            ),
            toDayExercise(
              resolveEx(['One-Arm_Dumbbell_Row'], [/one-arm dumbbell row/i]),
              1,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Dumbbell_Incline_Row'], [/incline row/i]),
              2,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Face_Pull'], [/face pull/i]),
              3,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Close-Grip_Barbell_Bench_Press'], [/close-grip.*bench/i]),
              4,
              { sets: makeSetTargets([{ count: 3, reps: '15', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['Cable_Rope_Overhead_Triceps_Extension'], [/overhead.*tricep/i]),
              5,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Dumbbell_Bicep_Curl'], [/dumbbell bicep curl/i]),
              6,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Hammer_Curls'], [/hammer curl/i]),
              7,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
          ],
        },
        {
          name: 'Day 3 – Legs & Abs',
          focus: 'Quads, Hamstrings, Calves, Core & Cross Trainer',
          order: 2,
          exercises: [
            toDayExercise(
              resolveEx(['Barbell_Squat', 'Barbell_Full_Squat'], [/barbell squat/i]),
              0,
              { sets: makeSetTargets([{ count: 4, reps: '12', restSec: 120 }]) }
            ),
            toDayExercise(
              resolveEx(['Romanian_Deadlift'], [/romanian deadlift/i]),
              1,
              { sets: makeSetTargets([{ count: 4, reps: '12', restSec: 90 }]) }
            ),
            toDayExercise(
              resolveEx(['Bodyweight_Walking_Lunge'], [/walking lunge|lunge/i]),
              2,
              { trackingType: 'reps_only', sets: makeSetTargets([{ count: 4, reps: '12', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['Leg_Extensions'], [/leg extension/i]),
              3,
              { sets: makeSetTargets([{ count: 4, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Seated_Calf_Raise'], [/seated calf raise/i]),
              4,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 45 }]) }
            ),
            toDayExercise(
              resolveEx(['Ab_Roller'], [/ab roller/i]),
              5,
              { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
            ),
            toDayExercise(
              resolveEx(['Crunches'], [/^crunches$/i, /crunch/i]),
              6,
              { trackingType: 'reps_only', sets: makeSetTargets([{ count: 3, reps: '15', restSec: 45 }]) }
            ),
            toDayExercise(
              resolveEx(['custom-cross-trainer', 'Elliptical_Trainer'], [/cross trainer|elliptical/i]),
              7,
              {
                trackingType: 'duration',
                notes: '10-minute cooldown/cardio finisher',
                sets: makeSetTargets([{ count: 1, durationSec: 600, restSec: 0 }]),
              }
            ),
          ],
        },
        {
          name: 'Abs Circuit (Add-On)',
          focus: 'Upper, Lower & Oblique Core',
          order: 3,
          notes: 'Perform 3 sets of 15 reps per movement at the end of training days.',
          exercises: absExercises(),
        },
      ],
    },
    {
      sourceId: 'spartan-4day-recomp-3mo',
      trainerId: null,
      isGlobal: true,
      name: '4-Day Body Recomp Split + Abs (3 Months)',
      description:
        '3-month muscle gain + fat loss 4-day split (Chest/Triceps, Legs, Back/Biceps, Shoulders/Traps) with warm-up sets, cardio finishers, and Abs Circuit.',
      goal: 'muscle_gain',
      tags: ['3-months', '4-day', 'muscle-gain', 'fat-loss', 'recomp'],
      workoutDays: [
        {
          name: 'Day 1 – Chest & Triceps',
          focus: 'Chest, Triceps & Cross Trainer',
          order: 0,
          exercises: [
            toDayExercise(
              resolveEx(['Barbell_Incline_Bench_Press_-_Medium_Grip'], [/incline bench press/i]),
              0,
              {
                notes: 'First 2 sets are warm-up (2x20), followed by 3 working sets (3x10-12)',
                sets: makeSetTargets([
                  { count: 2, reps: '20', restSec: 60 },
                  { count: 3, reps: '10-12', restSec: 90 },
                ]),
              }
            ),
            toDayExercise(
              resolveEx(['custom-pectoral-fly-machine', 'Butterfly'], [/pec.*fly|butterfly/i]),
              1,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Decline_Barbell_Bench_Press'], [/decline.*bench press/i]),
              2,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 90 }]) }
            ),
            toDayExercise(
              resolveEx(['Close-Grip_Barbell_Bench_Press'], [/close-grip.*bench/i]),
              3,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['Cable_Rope_Overhead_Triceps_Extension'], [/overhead.*tricep/i]),
              4,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Triceps_Pushdown_-_Rope_Attachment'], [/triceps pushdown/i]),
              5,
              {
                notes: 'Rope pushdown',
                sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]),
              }
            ),
            toDayExercise(
              resolveEx(['custom-cross-trainer', 'Elliptical_Trainer'], [/cross trainer|elliptical/i]),
              6,
              {
                trackingType: 'duration',
                notes: '10-minute finisher',
                sets: makeSetTargets([{ count: 1, durationSec: 600, restSec: 0 }]),
              }
            ),
          ],
        },
        {
          name: 'Day 2 – Legs',
          focus: 'Quads, Hamstrings, Glutes & Calves',
          order: 1,
          exercises: [
            toDayExercise(
              resolveEx(['Barbell_Squat', 'Barbell_Full_Squat'], [/barbell squat/i]),
              0,
              {
                notes: 'First 2 sets are warm-up (2x20), followed by 3 working sets (3x10-12)',
                sets: makeSetTargets([
                  { count: 2, reps: '20', restSec: 60 },
                  { count: 3, reps: '10-12', restSec: 120 },
                ]),
              }
            ),
            toDayExercise(
              resolveEx(['Leg_Press'], [/leg press/i]),
              1,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 90 }]) }
            ),
            toDayExercise(
              resolveEx(['Barbell_Deadlift'], [/barbell deadlift/i]),
              2,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 120 }]) }
            ),
            toDayExercise(
              resolveEx(['custom-bodyweight-glute-bridge', 'Barbell_Glute_Bridge'], [/glute bridge/i]),
              3,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Seated_Calf_Raise'], [/seated calf raise/i]),
              4,
              { sets: makeSetTargets([{ count: 3, reps: '12', restSec: 45 }]) }
            ),
          ],
        },
        {
          name: 'Day 3 – Back & Biceps',
          focus: 'Lats, Mid/Lower Back, Biceps & Spinner',
          order: 2,
          exercises: [
            toDayExercise(
              resolveEx(['Wide-Grip_Lat_Pulldown'], [/lat pulldown/i]),
              0,
              {
                notes: 'First 2 sets are warm-up (2x20), followed by 3 working sets (3x10-12)',
                sets: makeSetTargets([
                  { count: 2, reps: '20', restSec: 60 },
                  { count: 3, reps: '10-12', restSec: 75 },
                ]),
              }
            ),
            toDayExercise(
              resolveEx(['One-Arm_Dumbbell_Row'], [/one-arm dumbbell row/i]),
              1,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Seated_Cable_Rows'], [/seated cable row/i]),
              2,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['custom-barbell-hyperextension', 'Hyperextensions_Back_Extensions'], [/hyperextension/i]),
              3,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Barbell_Curl'], [/barbell curl/i]),
              4,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Machine_Preacher_Curls'], [/preacher curl/i]),
              5,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['custom-single-arm-db-curl', 'Dumbbell_Alternate_Bicep_Curl'], [/dumbbell.*curl/i]),
              6,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['custom-spinner-bike', 'Bicycling_Stationary'], [/spinner|stationary/i]),
              7,
              {
                trackingType: 'duration',
                notes: '10-minute finisher',
                sets: makeSetTargets([{ count: 1, durationSec: 600, restSec: 0 }]),
              }
            ),
          ],
        },
        {
          name: 'Day 4 – Shoulders & Traps',
          focus: 'All Three Deltoid Heads & Upper Traps',
          order: 3,
          exercises: [
            toDayExercise(
              resolveEx(['custom-machine-shoulder-press', 'Leverage_Shoulder_Press'], [/shoulder press/i]),
              0,
              { sets: makeSetTargets([{ count: 4, reps: '10-12', restSec: 75 }]) }
            ),
            toDayExercise(
              resolveEx(['Side_Lateral_Raise'], [/side lateral raise/i]),
              1,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Front_Plate_Raise'], [/front plate raise|front.*raise/i]),
              2,
              { sets: makeSetTargets([{ count: 3, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Cable_Rear_Delt_Fly'], [/rear delt/i]),
              3,
              { sets: makeSetTargets([{ count: 4, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Upright_Barbell_Row'], [/upright.*row/i]),
              4,
              { sets: makeSetTargets([{ count: 4, reps: '10-12', restSec: 60 }]) }
            ),
            toDayExercise(
              resolveEx(['Barbell_Shrug'], [/barbell shrug/i]),
              5,
              { sets: makeSetTargets([{ count: 4, reps: '10-12', restSec: 60 }]) }
            ),
          ],
        },
        {
          name: 'Abs Circuit (Add-On)',
          focus: 'Upper, Lower & Oblique Core',
          order: 4,
          notes: 'Perform 3 sets of 15 reps per movement alongside your training week.',
          exercises: absExercises(),
        },
      ],
    },
  ];

  const operations = templates.map((tpl) => ({
    updateOne: {
      filter: { sourceId: tpl.sourceId },
      update: { $set: tpl },
      upsert: true,
    },
  }));

  const result = await WorkoutTemplate.bulkWrite(operations, { ordered: false });
  const totalGlobalInDb = await WorkoutTemplate.countDocuments({ isGlobal: true });

  return {
    totalProcessed: templates.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
    totalGlobalInDb,
  };
}

module.exports = {
  seedWorkoutTemplates,
};
