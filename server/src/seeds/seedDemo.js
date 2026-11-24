const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { connectDB, disconnectDB } = require('../config/db');
const Trainer = require('../models/Trainer');
const Exercise = require('../models/Exercise');
const Food = require('../models/Food');
const Client = require('../models/Client');
const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutTemplate = require('../models/WorkoutTemplate');
const ScheduleRule = require('../models/ScheduleRule');
const Session = require('../models/Session');
const Measurement = require('../models/Measurement');
const ProgressPhoto = require('../models/ProgressPhoto');
const DietPlan = require('../models/DietPlan');
const DietTemplate = require('../models/DietTemplate');
const { Reminder } = require('../models/Reminder');
const { seedExercises } = require('./seedExercises');
const { seedFoods } = require('./seedFoods');
const { addDays, formatDateStr, getWeekRangeMonSun } = require('../utils/dateUtils');
const { buildWorkoutSnapshotFromPlan, ensureSessionsForDateRange } = require('../services/schedule.service');
const { calculateBmi, calculateEpley1RM, calculateSetVolume, round1 } = require('../services/metrics.service');
const { computeMealsAndDailyTotals } = require('../services/nutrition.service');

const DEMO_CREDENTIALS = {
  email: 'demo@trainerdesk.dev',
  password: 'DemoPassword123!',
};

function pickExercise(exercises, patterns = [], fallbackIdx = 0) {
  for (const pattern of patterns) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const found = exercises.find((e) => regex.test(e.name));
    if (found) return found;
  }
  return exercises[fallbackIdx % exercises.length];
}

function pickFood(foods, patterns = [], fallbackIdx = 0) {
  for (const pattern of patterns) {
    const regex = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const found = foods.find((f) => regex.test(f.name));
    if (found) return found;
  }
  return foods[fallbackIdx % foods.length];
}

function buildDayExercise(ex, order, { sets = 3, reps = '10', weight = 20, restSec = 60, supersetGroup = '', trackingType = 'reps_weight', durationSec = null, notes = '' } = {}) {
  const targetSets = Array.from({ length: sets }, (_, idx) => ({
    setNumber: idx + 1,
    targetReps: trackingType === 'duration' ? '' : String(reps),
    targetDurationSec: trackingType === 'duration' ? durationSec || 45 : null,
    targetWeight: trackingType === 'reps_weight' ? weight : null,
    weightUnit: 'kg',
    restSec,
  }));

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
    sets: targetSets,
  };
}

function makeLoggedExercisesFromSnapshot(snapshot, weightBumpKg = 0) {
  let totalVolume = 0;
  const loggedExercises = (snapshot.exercises || []).map((ex) => {
    const sets = (ex.targetSets || []).map((t) => {
      const reps = t.targetDurationSec ? null : Number.parseInt(t.targetReps, 10) || 10;
      const weight =
        ex.trackingType === 'reps_weight'
          ? Math.max(0, Number(t.targetWeight ?? 20) + weightBumpKg)
          : null;
      if (weight !== null && reps !== null) {
        totalVolume += calculateSetVolume(weight, reps);
      }
      return {
        setNumber: t.setNumber,
        reps,
        durationSec: t.targetDurationSec ?? null,
        weight,
        weightUnit: t.weightUnit || 'kg',
        completed: true,
        isPR: false,
        prTypes: [],
        loggedAt: new Date(),
      };
    });
    return {
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      notes: '',
      sets,
    };
  });
  return { loggedExercises, totalVolume: round1(totalVolume) };
}

function annotateHistoricalPRs(loggedExercises, bestMap) {
  let prCount = 0;
  for (const ex of loggedExercises) {
    const id = ex.exerciseId.toString();
    const best = bestMap.get(id) || { hasHistory: false, maxWeight: 0, max1RM: 0 };
    for (const s of ex.sets) {
      if (s.weight > 0 && s.reps > 0) {
        const est1RM = calculateEpley1RM(s.weight, s.reps);
        if (best.hasHistory) {
          const types = [];
          if (s.weight > best.maxWeight) {
            types.push('max_weight');
            best.maxWeight = s.weight;
          }
          if (est1RM > best.max1RM) {
            types.push('est_1rm');
            best.max1RM = est1RM;
          }
          if (types.length > 0) {
            s.isPR = true;
            s.prTypes = types;
            prCount += 1;
          }
        } else {
          best.maxWeight = Math.max(best.maxWeight, s.weight);
          best.max1RM = Math.max(best.max1RM, est1RM);
        }
      }
    }
    best.hasHistory = true;
    bestMap.set(id, best);
  }
  return prCount;
}

async function seedDemoAccount({ ensureBaseSeeds = true } = {}) {
  if (ensureBaseSeeds) {
    const [exCount, foodCount] = await Promise.all([
      Exercise.countDocuments({ isGlobal: true }),
      Food.countDocuments({ isGlobal: true }),
    ]);
    if (exCount === 0) await seedExercises();
    if (foodCount === 0) await seedFoods();
  }

  const [globalExercises, globalFoods] = await Promise.all([
    Exercise.find({ isGlobal: true }).lean(),
    Food.find({ isGlobal: true }).lean(),
  ]);

  if (globalExercises.length === 0 || globalFoods.length === 0) {
    throw new Error('Global exercises and foods must exist before seeding the demo account.');
  }

  // Idempotent cleanup ONLY for demo trainer email
  const existingTrainer = await Trainer.findOne({ email: DEMO_CREDENTIALS.email });
  if (existingTrainer) {
    const tid = existingTrainer._id;
    await Promise.all([
      Session.deleteMany({ trainerId: tid }),
      ScheduleRule.deleteMany({ trainerId: tid }),
      WorkoutPlan.deleteMany({ trainerId: tid }),
      WorkoutTemplate.deleteMany({ trainerId: tid }),
      Measurement.deleteMany({ trainerId: tid }),
      ProgressPhoto.deleteMany({ trainerId: tid }),
      DietPlan.deleteMany({ trainerId: tid }),
      DietTemplate.deleteMany({ trainerId: tid }),
      Reminder.deleteMany({ trainerId: tid }),
      Client.deleteMany({ trainerId: tid }),
      Trainer.deleteOne({ _id: tid }),
    ]);
  }

  const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 10);
  const demoTrainer = await Trainer.create({
    name: 'Coach Arjun Mehta',
    email: DEMO_CREDENTIALS.email,
    passwordHash,
    role: 'trainer',
    phone: '+91 98201 44510',
    gymName: 'Iron Craft Performance Studio',
    bio: 'CSCS strength & body-recomposition coach focused on evidence-based progression and sustainable Indian nutrition.',
    preferences: {
      weightUnit: 'kg',
      theme: 'light',
      defaultSessionDuration: 60,
      timezone: 'Asia/Kolkata',
    },
    favoriteExercises: globalExercises.slice(0, 6).map((e) => e._id),
  });
  const trainerId = demoTrainer._id;

  // Pick domain exercises
  const exBench = pickExercise(globalExercises, [/bench press/i, /chest/i], 0);
  const exInclineDb = pickExercise(globalExercises, [/incline dumbbell/i, /dumbbell bench/i], 1);
  const exShoulderPress = pickExercise(globalExercises, [/shoulder press/i, /overhead/i], 2);
  const exLatRaise = pickExercise(globalExercises, [/lateral raise/i], 3);
  const exTricepPush = pickExercise(globalExercises, [/tricep/i, /dip/i], 4);
  const exSquat = pickExercise(globalExercises, [/barbell.*squat/i, /squat/i], 5);
  const exRdl = pickExercise(globalExercises, [/romanian deadlift/i, /deadlift/i], 6);
  const exLegPress = pickExercise(globalExercises, [/leg press/i, /lunge/i], 7);
  const exRow = pickExercise(globalExercises, [/barbell row/i, /dumbbell row/i, /row/i], 8);
  const exPulldown = pickExercise(globalExercises, [/lat pulldown/i, /pullup/i, /chin/i], 9);
  const exCurl = pickExercise(globalExercises, [/bicep curl/i, /barbell curl/i, /curl/i], 10);
  const exPlank = pickExercise(globalExercises, [/plank/i, /crunch/i, /ab/i], 11);

  // Create 5 realistic clients
  const now = new Date();
  const membershipStart = new Date(now.getTime() - 52 * 24 * 60 * 60 * 1000);
  const membershipSoon = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);
  const membershipRegular = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

  const [rohan, priya, kabir, ananya, vikram] = await Client.create([
    {
      trainerId,
      name: 'Rohan Sharma',
      phone: '+91 98111 22304',
      email: 'rohan.sharma@example.com',
      gender: 'male',
      dateOfBirth: new Date('1996-05-14'),
      heightCm: 177,
      startingWeightKg: 72,
      targetWeightKg: 78,
      targetBodyFatPct: 12,
      goal: 'muscle_gain',
      medicalNotes: 'No major contraindications. Focus on scapular control on pressing.',
      membershipStart,
      membershipEnd: membershipSoon,
      status: 'active',
      preferredTrainingDays: [1, 3, 5],
      noteEntries: [
        {
          text: 'Hit 80kg x 8 smoothly on flat bench. Ready to progress by 2.5kg next week.',
          createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
        },
        {
          text: 'Membership renewal coming up in 8 days — remind after Friday session.',
          createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      trainerId,
      name: 'Priya Nair',
      phone: '+91 98450 77812',
      email: 'priya.nair@example.com',
      gender: 'female',
      dateOfBirth: new Date('1994-11-02'),
      heightCm: 163,
      startingWeightKg: 68,
      targetWeightKg: 60,
      targetWaistCm: 72,
      goal: 'fat_loss',
      injuries: ['Mild right patellar sensitivity'],
      medicalNotes: 'Keep knee flexion controlled on lunges; warm up quads for 5 min.',
      membershipStart,
      membershipEnd: membershipRegular,
      status: 'active',
      preferredTrainingDays: [1, 2, 4, 6],
      noteEntries: [
        {
          text: 'Consistent 9k daily step count and hitting protein target 6/7 days.',
          createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
        },
      ],
    },
    {
      trainerId,
      name: 'Kabir Malhotra',
      phone: '+91 99002 31456',
      email: 'kabir.m@example.com',
      gender: 'male',
      dateOfBirth: new Date('1992-02-20'),
      heightCm: 181,
      startingWeightKg: 84,
      targetWeightKg: 86,
      goal: 'strength',
      membershipStart,
      membershipEnd: membershipRegular,
      status: 'active',
      preferredTrainingDays: [1, 3, 5],
    },
    {
      trainerId,
      name: 'Ananya Verma',
      phone: '+91 97654 11908',
      email: 'ananya.v@example.com',
      gender: 'female',
      dateOfBirth: new Date('1998-08-09'),
      heightCm: 166,
      startingWeightKg: 59,
      targetWeightKg: 58,
      goal: 'endurance',
      membershipStart,
      membershipEnd: membershipRegular,
      status: 'active',
      preferredTrainingDays: [2, 4, 6],
    },
    {
      trainerId,
      name: 'Vikram Deshmukh',
      phone: '+91 98220 66541',
      email: 'vikram.d@example.com',
      gender: 'male',
      dateOfBirth: new Date('1989-12-27'),
      heightCm: 175,
      startingWeightKg: 90,
      targetWeightKg: 82,
      goal: 'general_fitness',
      medicalNotes: 'Desk job — prioritize thoracic mobility and hip hinge posture.',
      membershipStart,
      membershipEnd: membershipRegular,
      status: 'active',
      preferredTrainingDays: [0, 2, 5],
    },
  ]);

  // Create WorkoutPlans for each client
  const [rohanPlan, priyaPlan, kabirPlan, ananyaPlan, vikramPlan] = await WorkoutPlan.create([
    {
      trainerId,
      clientId: rohan._id,
      name: 'Lean Mass Push / Pull / Legs',
      description: 'Progressive overload hypertrophy block with antagonist supersets.',
      version: 2,
      isActive: true,
      workoutDays: [
        {
          name: 'Day A – Upper Push',
          focus: 'Chest, Shoulders & Triceps',
          order: 0,
          exercises: [
            buildDayExercise(exBench, 0, { sets: 4, reps: '8', weight: 75, restSec: 120 }),
            buildDayExercise(exInclineDb, 1, { sets: 3, reps: '10', weight: 26, restSec: 90 }),
            buildDayExercise(exShoulderPress, 2, { sets: 3, reps: '10', weight: 40, restSec: 90 }),
            buildDayExercise(exLatRaise, 3, {
              sets: 3,
              reps: '15',
              weight: 10,
              restSec: 45,
              supersetGroup: 'A',
            }),
            buildDayExercise(exTricepPush, 4, {
              sets: 3,
              reps: '12',
              weight: 25,
              restSec: 60,
              supersetGroup: 'A',
            }),
          ],
        },
        {
          name: 'Day B – Upper Pull',
          focus: 'Back, Rear Delts & Biceps',
          order: 1,
          exercises: [
            buildDayExercise(exRow, 0, { sets: 4, reps: '8', weight: 70, restSec: 90 }),
            buildDayExercise(exPulldown, 1, { sets: 3, reps: '10', weight: 55, restSec: 75 }),
            buildDayExercise(exCurl, 2, { sets: 3, reps: '12', weight: 15, restSec: 60 }),
          ],
        },
        {
          name: 'Day C – Lower & Core',
          focus: 'Quads, Hamstrings & Trunk',
          order: 2,
          exercises: [
            buildDayExercise(exSquat, 0, { sets: 4, reps: '6', weight: 95, restSec: 150 }),
            buildDayExercise(exRdl, 1, { sets: 3, reps: '8', weight: 85, restSec: 120 }),
            buildDayExercise(exPlank, 2, {
              sets: 3,
              trackingType: 'duration',
              durationSec: 60,
              restSec: 45,
            }),
          ],
        },
      ],
    },
    {
      trainerId,
      clientId: priya._id,
      name: 'Metabolic Full-Body Sculpt',
      description: 'Knee-friendly compound lifts paired with core circuits.',
      version: 1,
      isActive: true,
      workoutDays: [
        {
          name: 'Day A – Lower & Glutes',
          focus: 'Posterior Chain & Core',
          order: 0,
          exercises: [
            buildDayExercise(exRdl, 0, { sets: 3, reps: '10', weight: 45, restSec: 90 }),
            buildDayExercise(exLegPress, 1, { sets: 3, reps: '12', weight: 80, restSec: 75 }),
            buildDayExercise(exPlank, 2, {
              sets: 3,
              trackingType: 'duration',
              durationSec: 45,
              restSec: 45,
            }),
          ],
        },
        {
          name: 'Day B – Upper Tone & Conditioning',
          focus: 'Push / Pull Balance',
          order: 1,
          exercises: [
            buildDayExercise(exInclineDb, 0, { sets: 3, reps: '12', weight: 12, restSec: 60 }),
            buildDayExercise(exPulldown, 1, { sets: 3, reps: '12', weight: 35, restSec: 60 }),
            buildDayExercise(exLatRaise, 2, { sets: 3, reps: '15', weight: 5, restSec: 45 }),
          ],
        },
      ],
    },
    {
      trainerId,
      clientId: kabir._id,
      name: 'Powerbuilding 3-Day Block',
      description: 'Heavy primary barbell lifts with volume accessories.',
      version: 1,
      isActive: true,
      workoutDays: [
        {
          name: 'Day 1 – Heavy Squat & Pull',
          focus: 'Squat & Upper Back',
          order: 0,
          exercises: [
            buildDayExercise(exSquat, 0, { sets: 4, reps: '5', weight: 125, restSec: 180 }),
            buildDayExercise(exRow, 1, { sets: 4, reps: '8', weight: 80, restSec: 90 }),
            buildDayExercise(exCurl, 2, { sets: 3, reps: '10', weight: 17.5, restSec: 60 }),
          ],
        },
        {
          name: 'Day 2 – Heavy Bench & Hinge',
          focus: 'Bench & Posterior Chain',
          order: 1,
          exercises: [
            buildDayExercise(exBench, 0, { sets: 4, reps: '5', weight: 95, restSec: 180 }),
            buildDayExercise(exRdl, 1, { sets: 3, reps: '6', weight: 110, restSec: 120 }),
            buildDayExercise(exTricepPush, 2, { sets: 3, reps: '10', weight: 30, restSec: 60 }),
          ],
        },
      ],
    },
    {
      trainerId,
      clientId: ananya._id,
      name: 'Athletic Endurance Circuit',
      description: 'Tempo strength and timed core stamina.',
      version: 1,
      isActive: true,
      workoutDays: [
        {
          name: 'Day A – Stamina & Core',
          focus: 'Full Body Circuit',
          order: 0,
          exercises: [
            buildDayExercise(exLegPress, 0, { sets: 3, reps: '15', weight: 65, restSec: 45 }),
            buildDayExercise(exShoulderPress, 1, { sets: 3, reps: '12', weight: 20, restSec: 45 }),
            buildDayExercise(exPlank, 2, {
              sets: 3,
              trackingType: 'duration',
              durationSec: 60,
              restSec: 30,
            }),
          ],
        },
      ],
    },
    {
      trainerId,
      clientId: vikram._id,
      name: 'Posture & Functional Strength',
      description: 'Balanced 45-min strength & mobility sessions.',
      version: 1,
      isActive: true,
      workoutDays: [
        {
          name: 'Full Body Reset',
          focus: 'Posture & General Strength',
          order: 0,
          exercises: [
            buildDayExercise(exPulldown, 0, { sets: 3, reps: '12', weight: 45, restSec: 60 }),
            buildDayExercise(exInclineDb, 1, { sets: 3, reps: '10', weight: 18, restSec: 60 }),
            buildDayExercise(exPlank, 2, {
              sets: 3,
              trackingType: 'duration',
              durationSec: 40,
              restSec: 45,
            }),
          ],
        },
      ],
    },
  ]);

  await Promise.all([
    Client.updateOne({ _id: rohan._id }, { activeWorkoutPlanId: rohanPlan._id }),
    Client.updateOne({ _id: priya._id }, { activeWorkoutPlanId: priyaPlan._id }),
    Client.updateOne({ _id: kabir._id }, { activeWorkoutPlanId: kabirPlan._id }),
    Client.updateOne({ _id: ananya._id }, { activeWorkoutPlanId: ananyaPlan._id }),
    Client.updateOne({ _id: vikram._id }, { activeWorkoutPlanId: vikramPlan._id }),
  ]);

  // 2 Reusable WorkoutTemplates
  await WorkoutTemplate.create([
    {
      trainerId,
      name: 'Upper / Lower Hypertrophy',
      description: '4-day classic hypertrophy template with superset finishers.',
      goal: 'muscle_gain',
      tags: ['hypertrophy', '4-day'],
      workoutDays: rohanPlan.workoutDays.slice(0, 2).map((d) => d.toObject()),
    },
    {
      trainerId,
      name: 'Full-Body Metabolic Circuit',
      description: '3-day fat-loss circuit blending compound lifts and timed planks.',
      goal: 'fat_loss',
      tags: ['circuit', 'fat-loss'],
      workoutDays: priyaPlan.workoutDays.map((d) => d.toObject()),
    },
  ]);

  // ScheduleRules anchored so TODAY ALWAYS has 4 scheduled clients (07:00, 08:30, 10:00, 17:30)
  const todayStr = formatDateStr(now);
  const { startDate: weekStart, endDate: weekEnd } = getWeekRangeMonSun(todayStr);
  const todayDow = now.getDay();
  const nextDow = (todayDow + 2) % 7;
  const thirdDow = (todayDow + 4) % 7;

  await ScheduleRule.create([
    {
      trainerId,
      clientId: rohan._id,
      daysOfWeek: [todayDow, nextDow, thirdDow],
      time: '07:00',
      durationMin: 60,
      workoutPlanId: rohanPlan._id,
      workoutDayId: rohanPlan.workoutDays[0]._id,
      workoutDayName: rohanPlan.workoutDays[0].name,
      startDate: weekStart,
    },
    {
      trainerId,
      clientId: priya._id,
      daysOfWeek: [todayDow, (todayDow + 3) % 7],
      time: '08:30',
      durationMin: 60,
      workoutPlanId: priyaPlan._id,
      workoutDayId: priyaPlan.workoutDays[0]._id,
      workoutDayName: priyaPlan.workoutDays[0].name,
      startDate: weekStart,
    },
    {
      trainerId,
      clientId: kabir._id,
      daysOfWeek: [todayDow, nextDow],
      time: '10:00',
      durationMin: 75,
      workoutPlanId: kabirPlan._id,
      workoutDayId: kabirPlan.workoutDays[0]._id,
      workoutDayName: kabirPlan.workoutDays[0].name,
      startDate: weekStart,
    },
    {
      trainerId,
      clientId: ananya._id,
      daysOfWeek: [todayDow, (todayDow + 1) % 7, (todayDow + 4) % 7],
      time: '17:30',
      durationMin: 45,
      workoutPlanId: ananyaPlan._id,
      workoutDayId: ananyaPlan.workoutDays[0]._id,
      workoutDayName: ananyaPlan.workoutDays[0].name,
      startDate: weekStart,
    },
    {
      trainerId,
      clientId: vikram._id,
      daysOfWeek: [(todayDow + 1) % 7, (todayDow + 5) % 7],
      time: '19:00',
      durationMin: 45,
      workoutPlanId: vikramPlan._id,
      workoutDayId: vikramPlan.workoutDays[0]._id,
      workoutDayName: vikramPlan.workoutDays[0].name,
      startDate: weekStart,
    },
  ]);

  // Seed historical completed sessions strictly before weekStart so charts/heatmaps are populated
  const historyBestByClient = new Map();
  const buildHistoricalCompleted = async (client, plan, dayIdx, daysBeforeWeekStart, time, bumpKg) => {
    const day = plan.workoutDays[dayIdx] || plan.workoutDays[0];
    const snapshot = buildWorkoutSnapshotFromPlan(plan, day._id, day.name);
    const { loggedExercises, totalVolume } = makeLoggedExercisesFromSnapshot(snapshot, bumpKg);
    const cid = client._id.toString();
    if (!historyBestByClient.has(cid)) historyBestByClient.set(cid, new Map());
    const prCount = annotateHistoricalPRs(loggedExercises, historyBestByClient.get(cid));
    const date = addDays(weekStart, -daysBeforeWeekStart);

    await Session.create({
      trainerId,
      clientId: client._id,
      scheduleRuleId: null,
      isOneOff: true,
      date,
      time,
      durationMin: 60,
      status: 'completed',
      startedAt: new Date(`${date}T${time}:00`),
      completedAt: new Date(`${date}T${time}:00`),
      workoutPlanId: plan._id,
      workoutPlanVersion: plan.version,
      workoutDayId: day._id,
      workoutSnapshot: snapshot,
      loggedExercises,
      totalVolume,
      prCount,
    });
  };

  // Rohan (5 completed sessions over 3 weeks showing progression)
  await buildHistoricalCompleted(rohan, rohanPlan, 0, 21, '07:00', -5);
  await buildHistoricalCompleted(rohan, rohanPlan, 1, 18, '07:00', -2.5);
  await buildHistoricalCompleted(rohan, rohanPlan, 0, 14, '07:00', 0);
  await buildHistoricalCompleted(rohan, rohanPlan, 2, 10, '07:00', 2.5);
  await buildHistoricalCompleted(rohan, rohanPlan, 0, 5, '07:00', 5);

  // Priya (4 completed sessions)
  await buildHistoricalCompleted(priya, priyaPlan, 0, 19, '08:30', -2.5);
  await buildHistoricalCompleted(priya, priyaPlan, 1, 13, '08:30', 0);
  await buildHistoricalCompleted(priya, priyaPlan, 0, 7, '08:30', 2.5);
  await buildHistoricalCompleted(priya, priyaPlan, 1, 3, '08:30', 5);

  // Kabir (4 completed sessions)
  await buildHistoricalCompleted(kabir, kabirPlan, 0, 20, '10:00', -5);
  await buildHistoricalCompleted(kabir, kabirPlan, 1, 15, '10:00', 0);
  await buildHistoricalCompleted(kabir, kabirPlan, 0, 9, '10:00', 2.5);
  await buildHistoricalCompleted(kabir, kabirPlan, 1, 4, '10:00', 5);

  // Vikram: 2 missed sessions within last 30 days (< weekStart) to trigger "2+ missed" alert
  const vikramSnapshot = buildWorkoutSnapshotFromPlan(
    vikramPlan,
    vikramPlan.workoutDays[0]._id,
    vikramPlan.workoutDays[0].name
  );
  await Session.create([
    {
      trainerId,
      clientId: vikram._id,
      scheduleRuleId: null,
      isOneOff: true,
      date: addDays(weekStart, -6),
      time: '19:00',
      durationMin: 45,
      status: 'missed',
      missedReason: 'Work travel',
      workoutPlanId: vikramPlan._id,
      workoutPlanVersion: vikramPlan.version,
      workoutDayId: vikramPlan.workoutDays[0]._id,
      workoutSnapshot: vikramSnapshot,
    },
    {
      trainerId,
      clientId: vikram._id,
      scheduleRuleId: null,
      isOneOff: true,
      date: addDays(weekStart, -2),
      time: '19:00',
      durationMin: 45,
      status: 'missed',
      missedReason: 'Late office meeting',
      workoutPlanId: vikramPlan._id,
      workoutPlanVersion: vikramPlan.version,
      workoutDayId: vikramPlan.workoutDays[0]._id,
      workoutSnapshot: vikramSnapshot,
    },
  ]);

  // Materialize current week's sessions from ScheduleRules
  await ensureSessionsForDateRange({ trainerId, startDate: weekStart, endDate: weekEnd });

  // Mark earliest session today (Rohan 07:00) as completed so Today Dashboard shows both Completed & Remaining
  const rohanTodaySession = await Session.findOne({
    trainerId,
    clientId: rohan._id,
    date: todayStr,
  });
  if (rohanTodaySession) {
    const { loggedExercises, totalVolume } = makeLoggedExercisesFromSnapshot(
      rohanTodaySession.workoutSnapshot,
      7.5
    );
    const prCount = annotateHistoricalPRs(
      loggedExercises,
      historyBestByClient.get(rohan._id.toString())
    );
    rohanTodaySession.status = 'completed';
    rohanTodaySession.startedAt = new Date();
    rohanTodaySession.completedAt = new Date();
    rohanTodaySession.loggedExercises = loggedExercises;
    rohanTodaySession.totalVolume = totalVolume;
    rohanTodaySession.prCount = prCount;
    rohanTodaySession.sessionNotes = 'Strong top sets; shoulder felt stable throughout.';
    await rohanTodaySession.save();
  }

  // Body Measurements (5 entries each for Rohan, Priya, Kabir)
  const measDocs = [];
  const pushMeasurements = (client, series) => {
    series.forEach(([daysAgo, weightKg, bodyFatPct, waistCm, chestCm, armsCm, notes]) => {
      measDocs.push({
        trainerId,
        clientId: client._id,
        date: addDays(todayStr, -daysAgo),
        weightKg,
        bodyFatPct,
        bmi: calculateBmi(weightKg, client.heightCm),
        waistCm,
        chestCm,
        armsCm,
        notes,
      });
    });
  };

  pushMeasurements(rohan, [
    [28, 72.0, 15.2, 79.0, 98.0, 35.0, 'Baseline assessment'],
    [21, 72.8, 15.0, 79.0, 98.5, 35.3, 'Appetite & sleep solid'],
    [14, 73.5, 14.8, 78.8, 99.2, 35.6, 'Bench volume up'],
    [7, 74.1, 14.5, 78.5, 99.8, 36.0, 'Lean gain on pace'],
    [1, 74.6, 14.3, 78.4, 100.4, 36.2, 'Morning weigh-in'],
  ]);

  pushMeasurements(priya, [
    [28, 68.0, 29.5, 81.0, 91.0, 29.0, 'Initial consult'],
    [21, 67.1, 29.0, 80.0, 90.8, 28.9, '10k steps consistent'],
    [14, 66.3, 28.4, 78.8, 90.5, 28.8, 'Zero knee pain'],
    [7, 65.4, 27.8, 77.6, 90.2, 28.7, 'Waist trending down cleanly'],
    [1, 64.8, 27.2, 76.8, 90.0, 28.7, 'Great energy in morning sessions'],
  ]);

  pushMeasurements(kabir, [
    [28, 84.0, 16.5, 84.5, 106.0, 38.5, 'Strength block start'],
    [21, 84.4, 16.4, 84.5, 106.5, 38.7, 'Squat depth crisp'],
    [14, 84.7, 16.2, 84.2, 107.0, 38.9, 'High carbs on squat days'],
    [7, 85.1, 16.0, 84.0, 107.4, 39.1, 'Upper back thickness up'],
    [1, 85.3, 15.9, 83.8, 107.8, 39.3, 'Ready for 130kg top set'],
  ]);

  await Measurement.create(measDocs);

  // Diet Plans & Templates with real Foods
  const fOats = pickFood(globalFoods, [/oats/i, /oatmeal/i], 0);
  const fWhey = pickFood(globalFoods, [/whey/i, /protein/i], 1);
  const fEggs = pickFood(globalFoods, [/egg/i], 2);
  const fChicken = pickFood(globalFoods, [/chicken breast/i, /chicken/i], 3);
  const fPaneer = pickFood(globalFoods, [/paneer/i, /cottage cheese/i], 4);
  const fRice = pickFood(globalFoods, [/basmati rice/i, /rice/i], 5);
  const fRoti = pickFood(globalFoods, [/roti/i, /chapati/i], 6);
  const fDal = pickFood(globalFoods, [/dal/i, /lentil/i], 7);
  const fCurd = pickFood(globalFoods, [/curd/i, /yogurt/i, /dahi/i], 8);
  const fBanana = pickFood(globalFoods, [/banana/i], 9);
  const fAlmonds = pickFood(globalFoods, [/almond/i, /peanut/i], 10);

  const foodMap = new Map(globalFoods.map((f) => [f._id.toString(), f]));
  const mealItemFor = (food, qty) => {
    const serving = food.servings[food.defaultServingIndex || 0] || food.servings[0];
    return {
      foodId: food._id,
      foodName: food.name,
      quantity: qty,
      measure: serving.measure,
    };
  };

  const rohanTrainMealsRaw = [
    {
      name: 'Breakfast',
      time: '08:30',
      notes: 'Post-workout meal within 45 min.',
      items: [mealItemFor(fOats, 2), mealItemFor(fWhey, 1), mealItemFor(fBanana, 1)],
    },
    {
      name: 'Lunch',
      time: '13:30',
      items: [mealItemFor(fChicken, 2), mealItemFor(fRice, 2), mealItemFor(fCurd, 1)],
    },
    {
      name: 'Evening Snack',
      time: '17:30',
      items: [mealItemFor(fEggs, 3), mealItemFor(fAlmonds, 1)],
    },
    {
      name: 'Dinner',
      time: '21:00',
      items: [mealItemFor(fPaneer, 1.5), mealItemFor(fRoti, 3), mealItemFor(fDal, 1)],
    },
  ];
  const rohanTrainComputed = computeMealsAndDailyTotals(rohanTrainMealsRaw, foodMap);

  const rohanRestMealsRaw = [
    {
      name: 'Breakfast',
      time: '09:00',
      items: [mealItemFor(fEggs, 4), mealItemFor(fRoti, 2)],
    },
    {
      name: 'Lunch',
      time: '13:30',
      items: [mealItemFor(fChicken, 1.5), mealItemFor(fDal, 1.5), mealItemFor(fCurd, 1)],
    },
    {
      name: 'Dinner',
      time: '20:30',
      items: [mealItemFor(fPaneer, 1.5), mealItemFor(fRoti, 2)],
    },
  ];
  const rohanRestComputed = computeMealsAndDailyTotals(rohanRestMealsRaw, foodMap);

  const priyaFatLossMealsRaw = [
    {
      name: 'Breakfast',
      time: '08:00',
      items: [mealItemFor(fOats, 1), mealItemFor(fWhey, 1)],
    },
    {
      name: 'Lunch',
      time: '13:00',
      items: [mealItemFor(fPaneer, 1), mealItemFor(fRoti, 2), mealItemFor(fDal, 1), mealItemFor(fCurd, 1)],
    },
    {
      name: 'Evening Snack',
      time: '17:00',
      items: [mealItemFor(fEggs, 2), mealItemFor(fBanana, 1)],
    },
    {
      name: 'Dinner',
      time: '20:00',
      items: [mealItemFor(fChicken, 1.5), mealItemFor(fRice, 1)],
    },
  ];
  const priyaComputed = computeMealsAndDailyTotals(priyaFatLossMealsRaw, foodMap);

  const [rohanDietTrain, , priyaDiet] = await DietPlan.create([
    {
      trainerId,
      clientId: rohan._id,
      name: 'Lean Gain — Training Days',
      dayType: 'training',
      isActive: true,
      targets: { calories: 2800, protein: 165, carbs: 340, fat: 75, fiber: 35, waterLiters: 4 },
      meals: rohanTrainComputed.meals,
      dailyTotals: rohanTrainComputed.dailyTotals,
      supplements: [
        { name: 'Creatine Monohydrate', dosage: '5g', timing: 'Post-workout' },
        { name: 'Omega-3 Fish Oil', dosage: '1000mg', timing: 'With dinner' },
      ],
      notes: 'Prioritize hydration during morning sessions.',
      shareToken: crypto.randomBytes(12).toString('hex'),
    },
    {
      trainerId,
      clientId: rohan._id,
      name: 'Lean Gain — Rest Days',
      dayType: 'rest',
      isActive: false,
      targets: { calories: 2450, protein: 165, carbs: 250, fat: 80, fiber: 35, waterLiters: 3.5 },
      meals: rohanRestComputed.meals,
      dailyTotals: rohanRestComputed.dailyTotals,
      supplements: [{ name: 'Creatine Monohydrate', dosage: '5g', timing: 'With lunch' }],
      shareToken: crypto.randomBytes(12).toString('hex'),
    },
    {
      trainerId,
      clientId: priya._id,
      name: 'Sustainable Fat Loss Plan',
      dayType: 'all',
      isActive: true,
      targets: { calories: 1750, protein: 125, carbs: 175, fat: 55, fiber: 30, waterLiters: 3.2 },
      meals: priyaComputed.meals,
      dailyTotals: priyaComputed.dailyTotals,
      supplements: [{ name: 'Vitamin D3', dosage: '2000 IU', timing: 'With breakfast' }],
      notes: 'Keep 1 tsp oil limit per meal when cooking vegetables.',
      shareToken: crypto.randomBytes(12).toString('hex'),
    },
  ]);

  await Promise.all([
    Client.updateOne({ _id: rohan._id }, { activeDietPlanId: rohanDietTrain._id }),
    Client.updateOne({ _id: priya._id }, { activeDietPlanId: priyaDiet._id }),
  ]);

  await DietTemplate.create([
    {
      trainerId,
      name: 'Lean Muscle Gain 2800 kcal',
      description: 'High-carb Indian home-cooked meals with whey post-workout.',
      goal: 'muscle_gain',
      tags: ['high-protein', 'lean-bulk'],
      targets: { calories: 2800, protein: 165, carbs: 340, fat: 75, fiber: 35, waterLiters: 4 },
      meals: rohanTrainComputed.meals,
      dailyTotals: rohanTrainComputed.dailyTotals,
    },
    {
      trainerId,
      name: 'High-Protein Indian Fat Loss',
      description: '1750 kcal everyday roti/dal/paneer/chicken structure.',
      goal: 'fat_loss',
      tags: ['fat-loss', 'indian-staples'],
      targets: { calories: 1750, protein: 125, carbs: 175, fat: 55, fiber: 30, waterLiters: 3 },
      meals: priyaComputed.meals,
      dailyTotals: priyaComputed.dailyTotals,
    },
  ]);

  // Seed 3 Reminders (2 open, 1 completed)
  await Reminder.create([
    {
      trainerId,
      clientId: vikram._id,
      title: 'Check in with Vikram (2 missed sessions in last 30 days)',
      dueAt: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      type: 'follow_up',
      notes: 'Offer 07:30 morning slot if evening meetings keep running late.',
      isDone: false,
    },
    {
      trainerId,
      clientId: rohan._id,
      title: 'Discuss 3-month membership renewal with Rohan',
      dueAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      type: 'membership',
      notes: 'Current term ends in 8 days.',
      isDone: false,
    },
    {
      trainerId,
      clientId: priya._id,
      title: 'Log 4-week waist & body-fat reassessment for Priya',
      dueAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      type: 'measurement',
      isDone: true,
      completedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
    },
  ]);

  const [sessionCount, measurementCount, dietCount, reminderCount] = await Promise.all([
    Session.countDocuments({ trainerId }),
    Measurement.countDocuments({ trainerId }),
    DietPlan.countDocuments({ trainerId }),
    Reminder.countDocuments({ trainerId }),
  ]);

  return {
    trainerEmail: DEMO_CREDENTIALS.email,
    trainerId: trainerId.toString(),
    clients: 5,
    sessions: sessionCount,
    measurements: measurementCount,
    dietPlans: dietCount,
    reminders: reminderCount,
  };
}

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      const summary = await seedDemoAccount({ ensureBaseSeeds: true });
      console.log('Demo account seeded:', summary);
      console.log(`Login email: ${DEMO_CREDENTIALS.email}`);
    } catch (err) {
      console.error('Demo seed failed:', err);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}

module.exports = {
  DEMO_CREDENTIALS,
  seedDemoAccount,
};
