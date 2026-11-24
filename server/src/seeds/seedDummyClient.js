const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { connectDB, disconnectDB } = require('../config/db');
const Trainer = require('../models/Trainer');
const Client = require('../models/Client');
const Food = require('../models/Food');
const WorkoutPlan = require('../models/WorkoutPlan');
const WorkoutTemplate = require('../models/WorkoutTemplate');
const ScheduleRule = require('../models/ScheduleRule');
const Session = require('../models/Session');
const Measurement = require('../models/Measurement');
const ProgressPhoto = require('../models/ProgressPhoto');
const DietPlan = require('../models/DietPlan');
const { Reminder } = require('../models/Reminder');
const { addDays, formatDateStr, getWeekRangeMonSun } = require('../utils/dateUtils');
const {
  buildWorkoutSnapshotFromPlan,
  ensureSessionsForDateRange,
} = require('../services/schedule.service');
const {
  calculateBmi,
  calculateEpley1RM,
  calculateSetVolume,
  round1,
} = require('../services/metrics.service');
const { computeMealsAndDailyTotals } = require('../services/nutrition.service');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) {
    c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  }
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcBuf), 0);
  return Buffer.concat([len, t, data, crc]);
}

function renderSolidCardPng(width, height, { bgTop, bgBottom, accent, silhouetteTone }) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 4 + 1);
    raw[rowStart] = 0;
    const ty = y / height;
    const baseR = Math.round(bgTop[0] * (1 - ty) + bgBottom[0] * ty);
    const baseG = Math.round(bgTop[1] * (1 - ty) + bgBottom[1] * ty);
    const baseB = Math.round(bgTop[2] * (1 - ty) + bgBottom[2] * ty);

    for (let x = 0; x < width; x += 1) {
      const nx = x / width;
      const ny = ty;
      let r = baseR;
      let g = baseG;
      let b = baseB;

      // Top accent stripe
      if (ny < 0.025) {
        [r, g, b] = accent;
      } else {
        // Minimal geometric head + torso athletic silhouette
        const dxHead = nx - 0.5;
        const dyHead = (ny - 0.27) * (height / width);
        const inHead = dxHead * dxHead + dyHead * dyHead <= 0.085 * 0.085;

        const torsoHalfW = 0.145 - Math.max(0, ny - 0.4) * 0.11;
        const inTorso = ny >= 0.39 && ny <= 0.68 && Math.abs(nx - 0.5) <= torsoHalfW;

        const inLegs =
          ny > 0.68 &&
          ny <= 0.9 &&
          ((nx >= 0.38 && nx <= 0.475) || (nx >= 0.525 && nx <= 0.62));

        if (inHead || inTorso || inLegs) {
          [r, g, b] = silhouetteTone;
        }
      }

      const idx = rowStart + 1 + x * 4;
      raw[idx] = r;
      raw[idx + 1] = g;
      raw[idx + 2] = b;
      raw[idx + 3] = 255;
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function generateDummyImages() {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const avatarPng = renderSolidCardPng(256, 256, {
    bgTop: [201, 82, 29],
    bgBottom: [158, 59, 17],
    accent: [247, 246, 243],
    silhouetteTone: [255, 255, 255],
  });

  const beforePng = renderSolidCardPng(480, 640, {
    bgTop: [232, 228, 220],
    bgBottom: [212, 206, 196],
    accent: [201, 82, 29],
    silhouetteTone: [113, 113, 122],
  });

  const afterPng = renderSolidCardPng(480, 640, {
    bgTop: [40, 44, 52],
    bgBottom: [26, 28, 34],
    accent: [232, 106, 51],
    silhouetteTone: [228, 228, 231],
  });

  fs.writeFileSync(path.join(UPLOADS_DIR, 'dummy-tanvir-avatar.png'), avatarPng);
  fs.writeFileSync(path.join(UPLOADS_DIR, 'dummy-tanvir-before-front.png'), beforePng);
  fs.writeFileSync(path.join(UPLOADS_DIR, 'dummy-tanvir-after-front.png'), afterPng);

  return {
    avatarDataUri: `data:image/png;base64,${avatarPng.toString('base64')}`,
    beforeDataUri: `data:image/png;base64,${beforePng.toString('base64')}`,
    afterDataUri: `data:image/png;base64,${afterPng.toString('base64')}`,
  };
}

function estimateTargetWeight(exName) {
  const n = String(exName || '').toLowerCase();
  if (/deadlift/.test(n)) return 85;
  if (/squat/.test(n)) return 75;
  if (/leg press/.test(n)) return 120;
  if (/incline bench|decline.*bench|close-grip/.test(n)) return 55;
  if (/pulldown|seated.*row|barbell row/.test(n)) return 50;
  if (/shoulder press/.test(n)) return 40;
  if (/shrug|upright/.test(n)) return 45;
  if (/hyperextension/.test(n)) return 20;
  if (/barbell curl|preacher/.test(n)) return 25;
  if (/calf raise/.test(n)) return 40;
  if (/pec|fly|lateral|front plate|rear delt|pushdown|overhead/.test(n)) return 15;
  if (/dumbbell/.test(n)) return 12.5;
  if (/glute bridge/.test(n)) return 20;
  return 20;
}

function cloneDaysWithoutIds(days = [], { fillWeights = false } = {}) {
  return days.map((day, dIdx) => ({
    name: day.name,
    focus: day.focus || '',
    notes: day.notes || '',
    order: day.order ?? dIdx,
    exercises: (day.exercises || []).map((ex, eIdx) => {
      const baseWeight = fillWeights && ex.trackingType === 'reps_weight' ? estimateTargetWeight(ex.exerciseName) : null;
      return {
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        exerciseImageUrl: ex.exerciseImageUrl || '',
        primaryMuscle: ex.primaryMuscle || '',
        order: ex.order ?? eIdx,
        supersetGroup: ex.supersetGroup || '',
        trackingType: ex.trackingType || 'reps_weight',
        tempo: ex.tempo || '',
        notes: ex.notes || '',
        sets: (ex.sets || []).map((s, sIdx) => ({
          setNumber: s.setNumber || sIdx + 1,
          targetReps: s.targetReps ?? '',
          targetDurationSec: s.targetDurationSec ?? null,
          targetWeight:
            fillWeights && ex.trackingType === 'reps_weight'
              ? s.targetWeight ?? (sIdx < 2 && s.targetReps === '20' ? round1(baseWeight * 0.5) : baseWeight)
              : s.targetWeight ?? null,
          weightUnit: s.weightUnit || 'kg',
          restSec: s.restSec ?? 60,
        })),
      };
    }),
  }));
}

function makeLoggedExercises(snapshot, weightDeltaKg = 0) {
  let totalVolume = 0;
  const loggedExercises = (snapshot.exercises || []).map((ex) => {
    const sets = (ex.targetSets || []).map((t) => {
      const parsedReps = Number.parseInt(String(t.targetReps || '').split('-')[0], 10);
      const reps = t.targetDurationSec ? null : Number.isFinite(parsedReps) && parsedReps > 0 ? parsedReps : 10;
      const weight =
        ex.trackingType === 'reps_weight'
          ? Math.max(2.5, round1(Number(t.targetWeight ?? 20) + weightDeltaKg))
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

function annotatePRs(loggedExercises, bestMap) {
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

function pickFood(foods, patterns = [], fallbackIdx = 0) {
  for (const pattern of patterns) {
    const rx = pattern instanceof RegExp ? pattern : new RegExp(pattern, 'i');
    const found = foods.find((f) => rx.test(f.name));
    if (found) return found;
  }
  return foods[fallbackIdx % foods.length];
}

async function seedDummyClient(trainerEmail = 'ifti36127@gmail.com') {
  const trainer = await Trainer.findOne({ email: trainerEmail.toLowerCase().trim() });
  if (!trainer) {
    throw new Error(`Trainer not found for email: ${trainerEmail}`);
  }
  const trainerId = trainer._id;

  const [tpl4Day, tpl3Day, globalFoods] = await Promise.all([
    WorkoutTemplate.findOne({ sourceId: 'spartan-4day-recomp-3mo', isGlobal: true }).lean(),
    WorkoutTemplate.findOne({ sourceId: 'spartan-3day-12wk', isGlobal: true }).lean(),
    Food.find({ isGlobal: true }).lean(),
  ]);

  if (!tpl4Day || !tpl3Day) {
    throw new Error('Built-in workout templates are missing. Run `npm run seed` first.');
  }
  if (globalFoods.length === 0) {
    throw new Error('Global food database is empty. Run `npm run seed` first.');
  }

  // Idempotent cleanup of existing dummy client for this trainer
  const existing = await Client.findOne({
    trainerId,
    email: 'tanvir.ahmed@example.com',
  });
  if (existing) {
    const cid = existing._id;
    await Promise.all([
      Session.deleteMany({ trainerId, clientId: cid }),
      ScheduleRule.deleteMany({ trainerId, clientId: cid }),
      WorkoutPlan.deleteMany({ trainerId, clientId: cid }),
      Measurement.deleteMany({ trainerId, clientId: cid }),
      ProgressPhoto.deleteMany({ trainerId, clientId: cid }),
      DietPlan.deleteMany({ trainerId, clientId: cid }),
      Reminder.deleteMany({ trainerId, clientId: cid }),
      Client.deleteOne({ _id: cid }),
    ]);
  }

  const { avatarDataUri, beforeDataUri, afterDataUri } = generateDummyImages();

  const now = new Date();
  const todayStr = formatDateStr(now);
  const todayDow = now.getDay();
  const preferredDays = [todayDow, (todayDow + 1) % 7, (todayDow + 3) % 7, (todayDow + 5) % 7];

  const client = await Client.create({
    trainerId,
    name: 'Tanvir Ahmed',
    photoUrl: avatarDataUri,
    phone: '+880 1712-448910',
    email: 'tanvir.ahmed@example.com',
    gender: 'male',
    dateOfBirth: new Date('1996-08-18'),
    heightCm: 176,
    startingWeightKg: 85,
    targetWeightKg: 75,
    targetBodyFatPct: 14,
    targetWaistCm: 80,
    goal: 'muscle_gain',
    medicalNotes:
      'No cardiovascular restrictions. Warm up shoulders and knees for 5 minutes before heavy pressing or squats.',
    injuries: [
      'Mild left wrist tightness on flat barbell bench',
      'Previous mild right ankle sprain (recovered)',
    ],
    membershipStart: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
    membershipEnd: new Date(now.getTime() + 12 * 24 * 60 * 60 * 1000),
    status: 'active',
    emergencyContact: {
      name: 'Farhana Ahmed',
      phone: '+880 1711-903421',
      relation: 'Sister',
    },
    notes:
      'Completed 12-week foundation phase dropping from 85 kg to 78 kg while retaining upper-body strength. Now running the 4-Day Body Recomp Split with 2250 kcal training-day nutrition.',
    noteEntries: [
      {
        text: 'Completed baseline 12-week 3-day split; dropped from 85.0 kg down to 78.6 kg.',
        createdAt: new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000),
      },
      {
        text: 'Transitioned to 4-Day Body Recomp Split + Abs. Added 2x20 warm-up sets on primary lifts.',
        createdAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
      },
      {
        text: 'Using wrist wraps on heavy incline pressing; left wrist tightness improved significantly.',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        text: 'Morning weigh-in hit 78.0 kg with waist down 8.5 cm from start. Keep protein at 155g+.',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
    preferredTrainingDays: preferredDays,
  });

  // 2 Workout Plans (Active 4-Day Recomp + Archived 3-Day Foundation)
  const [activePlan] = await WorkoutPlan.create([
    {
      trainerId,
      clientId: client._id,
      name: tpl4Day.name,
      description: tpl4Day.description,
      version: 2,
      isActive: true,
      workoutDays: cloneDaysWithoutIds(tpl4Day.workoutDays, { fillWeights: true }),
    },
    {
      trainerId,
      clientId: client._id,
      name: tpl3Day.name,
      description: 'Completed 12-week starter block before transitioning to 4-day recomp.',
      version: 1,
      isActive: false,
      workoutDays: cloneDaysWithoutIds(tpl3Day.workoutDays, { fillWeights: true }),
    },
  ]);

  // 4 Recurring Schedule Rules linking Days 1-4 of activePlan
  const { startDate: weekStart, endDate: weekEnd } = getWeekRangeMonSun(todayStr);
  await ScheduleRule.create([
    {
      trainerId,
      clientId: client._id,
      daysOfWeek: [preferredDays[0]],
      time: '18:30',
      durationMin: 60,
      workoutPlanId: activePlan._id,
      workoutDayId: activePlan.workoutDays[0]._id,
      workoutDayName: activePlan.workoutDays[0].name,
      startDate: weekStart,
      notes: 'Evening Chest & Triceps slot',
    },
    {
      trainerId,
      clientId: client._id,
      daysOfWeek: [preferredDays[1]],
      time: '18:30',
      durationMin: 60,
      workoutPlanId: activePlan._id,
      workoutDayId: activePlan.workoutDays[1]._id,
      workoutDayName: activePlan.workoutDays[1].name,
      startDate: weekStart,
      notes: 'Legs + seated calf raises',
    },
    {
      trainerId,
      clientId: client._id,
      daysOfWeek: [preferredDays[2]],
      time: '18:30',
      durationMin: 60,
      workoutPlanId: activePlan._id,
      workoutDayId: activePlan.workoutDays[2]._id,
      workoutDayName: activePlan.workoutDays[2].name,
      startDate: weekStart,
      notes: 'Back & Biceps + Spinner finisher',
    },
    {
      trainerId,
      clientId: client._id,
      daysOfWeek: [preferredDays[3]],
      time: '18:30',
      durationMin: 60,
      workoutPlanId: activePlan._id,
      workoutDayId: activePlan.workoutDays[3]._id,
      workoutDayName: activePlan.workoutDays[3].name,
      startDate: weekStart,
      notes: 'Shoulders & Traps + Abs Circuit',
    },
  ]);

  // 6 Historical completed sessions strictly before weekStart for PRs, 1RM charts & heatmap
  const bestMap = new Map();
  const historySpecs = [
    [21, 0, -5],
    [18, 1, -5],
    [14, 2, -2.5],
    [11, 3, -2.5],
    [7, 0, 0],
    [3, 1, 2.5],
  ];

  for (const [daysBeforeWeekStart, dayIdx, deltaKg] of historySpecs) {
    const day = activePlan.workoutDays[dayIdx] || activePlan.workoutDays[0];
    const snapshot = buildWorkoutSnapshotFromPlan(activePlan, day._id, day.name);
    const { loggedExercises, totalVolume } = makeLoggedExercises(snapshot, deltaKg);
    const prCount = annotatePRs(loggedExercises, bestMap);
    const date = addDays(weekStart, -daysBeforeWeekStart);

    await Session.create({
      trainerId,
      clientId: client._id,
      scheduleRuleId: null,
      isOneOff: true,
      date,
      time: '18:30',
      durationMin: 60,
      status: 'completed',
      startedAt: new Date(`${date}T18:30:00`),
      completedAt: new Date(`${date}T19:30:00`),
      workoutPlanId: activePlan._id,
      workoutPlanVersion: activePlan.version,
      workoutDayId: day._id,
      workoutSnapshot: snapshot,
      loggedExercises,
      totalVolume,
      prCount,
      sessionNotes: 'Solid progressive effort; form clean on working sets.',
    });
  }

  // Materialize current week sessions (so today's 18:30 session is scheduled on Today Dashboard)
  await ensureSessionsForDateRange({
    trainerId,
    startDate: weekStart,
    endDate: weekEnd,
    clientId: client._id,
  });

  // 6 Body Measurements over last 10 weeks (85.0 kg -> 78.0 kg)
  const measSeries = [
    [70, 85.0, 23.8, 102.0, 92.5, 101.0, 34.5, 59.5, 37.5, 40.5, 117.0, 'Week 1 baseline assessment'],
    [56, 83.4, 22.6, 101.5, 90.5, 99.5, 34.7, 59.0, 37.5, 40.2, 117.5, 'Early fat loss & adherence strong'],
    [42, 81.9, 21.5, 101.2, 88.4, 98.0, 35.0, 58.6, 37.6, 39.8, 118.0, 'Strength rising while weight drops'],
    [28, 80.5, 20.4, 101.0, 86.8, 96.8, 35.2, 58.4, 37.6, 39.5, 118.5, 'Transitioned to 4-Day Recomp Split'],
    [14, 79.1, 19.3, 101.3, 85.2, 95.8, 35.5, 58.2, 37.8, 39.2, 119.0, 'Visible midsection tightening'],
    [2, 78.0, 18.4, 101.6, 84.0, 95.0, 35.8, 58.1, 38.0, 39.0, 119.5, 'Reached 78 kg target milestone'],
  ];

  await Measurement.create(
    measSeries.map(
      ([daysAgo, weightKg, bodyFatPct, chestCm, waistCm, hipsCm, armsCm, thighsCm, calvesCm, neckCm, shouldersCm, notes]) => ({
        trainerId,
        clientId: client._id,
        date: addDays(todayStr, -daysAgo),
        weightKg,
        bodyFatPct,
        bmi: calculateBmi(weightKg, 176),
        chestCm,
        waistCm,
        hipsCm,
        armsCm,
        thighsCm,
        calvesCm,
        neckCm,
        shouldersCm,
        notes,
      })
    )
  );

  // 2 Progress Photos (front pose Before & After)
  await ProgressPhoto.create([
    {
      trainerId,
      clientId: client._id,
      date: addDays(todayStr, -70),
      pose: 'front',
      imageUrl: beforeDataUri,
      weightKg: 85.0,
      notes: 'Week 1 baseline front check-in (85.0 kg)',
    },
    {
      trainerId,
      clientId: client._id,
      date: addDays(todayStr, -2),
      pose: 'front',
      imageUrl: afterDataUri,
      weightKg: 78.0,
      notes: 'Week 10 recomp check-in (78.0 kg)',
    },
  ]);

  // 2 Measured Diet Plans (Training Day & Rest Day)
  const foodMap = new Map(globalFoods.map((f) => [f._id.toString(), f]));
  const mealItem = (food, qty) => {
    const serving = food.servings[food.defaultServingIndex || 0] || food.servings[0];
    return {
      foodId: food._id,
      foodName: food.name,
      quantity: qty,
      measure: serving.measure,
    };
  };

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

  const trainComputed = computeMealsAndDailyTotals(
    [
      {
        name: 'Breakfast',
        time: '08:30',
        notes: 'High-protein morning start.',
        items: [mealItem(fOats, 1.5), mealItem(fEggs, 3), mealItem(fBanana, 1)],
      },
      {
        name: 'Lunch',
        time: '13:30',
        items: [mealItem(fChicken, 2), mealItem(fRice, 1.5), mealItem(fDal, 1), mealItem(fCurd, 1)],
      },
      {
        name: 'Pre / Post Workout',
        time: '19:45',
        items: [mealItem(fWhey, 1.5), mealItem(fAlmonds, 1)],
      },
      {
        name: 'Dinner',
        time: '21:15',
        items: [mealItem(fPaneer, 1.5), mealItem(fRoti, 2), mealItem(fDal, 1)],
      },
    ],
    foodMap
  );

  const restComputed = computeMealsAndDailyTotals(
    [
      {
        name: 'Breakfast',
        time: '09:00',
        items: [mealItem(fEggs, 4), mealItem(fRoti, 2)],
      },
      {
        name: 'Lunch',
        time: '13:30',
        items: [mealItem(fChicken, 1.5), mealItem(fDal, 1.5), mealItem(fCurd, 1)],
      },
      {
        name: 'Dinner',
        time: '20:30',
        items: [mealItem(fPaneer, 1.5), mealItem(fRoti, 2), mealItem(fAlmonds, 1)],
      },
    ],
    foodMap
  );

  const [trainDiet] = await DietPlan.create([
    {
      trainerId,
      clientId: client._id,
      name: 'Body Recomp – Training Day',
      dayType: 'training',
      isActive: true,
      targets: { calories: 2250, protein: 155, carbs: 225, fat: 65, fiber: 32, waterLiters: 4 },
      meals: trainComputed.meals,
      dailyTotals: trainComputed.dailyTotals,
      supplements: [
        { name: 'Whey Protein Isolate', dosage: '1.5 scoops', timing: 'Post-workout' },
        { name: 'Creatine Monohydrate', dosage: '5g', timing: 'Daily with water' },
        { name: 'Omega-3 Fish Oil', dosage: '1000mg', timing: 'With dinner' },
      ],
      notes: 'Keep cooking oil under 2 tsp/day and hit 9,000+ steps alongside lifting days.',
      shareToken: crypto.randomBytes(12).toString('hex'),
    },
    {
      trainerId,
      clientId: client._id,
      name: 'Body Recomp – Rest Day',
      dayType: 'rest',
      isActive: false,
      targets: { calories: 1950, protein: 155, carbs: 160, fat: 70, fiber: 30, waterLiters: 3.5 },
      meals: restComputed.meals,
      dailyTotals: restComputed.dailyTotals,
      supplements: [
        { name: 'Creatine Monohydrate', dosage: '5g', timing: 'With lunch' },
        { name: 'Omega-3 Fish Oil', dosage: '1000mg', timing: 'With dinner' },
      ],
      notes: 'Lower starchy carbs on non-lifting days while keeping protein steady.',
      shareToken: crypto.randomBytes(12).toString('hex'),
    },
  ]);

  await Client.updateOne(
    { _id: client._id },
    {
      activeWorkoutPlanId: activePlan._id,
      activeDietPlanId: trainDiet._id,
    }
  );

  // 2 Open Reminders
  await Reminder.create([
    {
      trainerId,
      clientId: client._id,
      title: 'Check Tanvir wrist mobility before Day 1 incline pressing',
      dueAt: new Date(now.getTime() + 6 * 60 * 60 * 1000),
      type: 'follow_up',
      notes: 'Confirm wrist wraps feel comfortable on warm-up sets.',
      isDone: false,
    },
    {
      trainerId,
      clientId: client._id,
      title: 'Discuss membership renewal with Tanvir (12 days left)',
      dueAt: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
      type: 'membership',
      notes: 'Offer 3-month recomp continuation package.',
      isDone: false,
    },
  ]);

  const [sessionCount, measurementCount, photoCount, dietCount, ruleCount, reminderCount] =
    await Promise.all([
      Session.countDocuments({ trainerId, clientId: client._id }),
      Measurement.countDocuments({ trainerId, clientId: client._id }),
      ProgressPhoto.countDocuments({ trainerId, clientId: client._id }),
      DietPlan.countDocuments({ trainerId, clientId: client._id }),
      ScheduleRule.countDocuments({ trainerId, clientId: client._id }),
      Reminder.countDocuments({ trainerId, clientId: client._id }),
    ]);

  return {
    trainerEmail: trainer.email,
    clientId: client._id.toString(),
    clientName: client.name,
    workoutPlans: 2,
    scheduleRules: ruleCount,
    sessions: sessionCount,
    measurements: measurementCount,
    progressPhotos: photoCount,
    dietPlans: dietCount,
    reminders: reminderCount,
  };
}

if (require.main === module) {
  const targetEmail = process.argv[2] || 'ifti36127@gmail.com';
  (async () => {
    try {
      await connectDB();
      const summary = await seedDummyClient(targetEmail);
      console.log('Dummy client seeded:', summary);
    } catch (err) {
      console.error('Dummy client seed failed:', err);
      process.exitCode = 1;
    } finally {
      await disconnectDB();
    }
  })();
}

module.exports = {
  seedDummyClient,
};
