const Exercise = require('../models/Exercise');
const { MUSCLE_GROUPS, EQUIPMENT_TYPES } = require('../models/Exercise');

const DATASET_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';

const CURATED_GYM_EXERCISES = [
  {
    sourceId: 'custom-machine-incline-press',
    name: 'Machine Incline Chest Press',
    fallbackSourceId: 'Leverage_Incline_Chest_Press',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders', 'triceps'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Adjust the seat so the handles align with your upper chest.',
      'Grip the handles with elbows slightly below shoulder level and press smoothly until arms are nearly extended.',
      'Lower back with control without letting the weight stack slam.',
    ],
    tips: ['Keep shoulder blades retracted into the backrest throughout every rep.'],
  },
  {
    sourceId: 'custom-pectoral-fly-machine',
    name: 'Pectoral Fly Machine (Pec Deck)',
    fallbackSourceId: 'Butterfly',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Sit upright with your back flat against the pad and adjust the arms so your hands line up with mid-chest.',
      'Bring the arms together in front of your chest in a smooth arc and squeeze for one second.',
      'Return slowly until you feel a comfortable stretch across the chest.',
    ],
    tips: ['Avoid letting your shoulders roll forward at the peak contraction.'],
  },
  {
    sourceId: 'custom-machine-shoulder-press',
    name: 'Machine Shoulder Press',
    fallbackSourceId: 'Leverage_Shoulder_Press',
    primaryMuscle: 'shoulders',
    secondaryMuscles: ['triceps', 'traps'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Set the seat height so the handles start just above shoulder level.',
      'Brace your core and press overhead until elbows are nearly locked out.',
      'Lower under control back to chin/ear height.',
    ],
    tips: ['Keep lower back pressed against the seat rather than arching excessively.'],
  },
  {
    sourceId: 'custom-seated-bent-over-db-row',
    name: 'Seated Bent-Over Dumbbell Row',
    fallbackSourceId: 'Bent_Over_Two-Dumbbell_Row',
    primaryMuscle: 'back',
    secondaryMuscles: ['lats', 'biceps', 'shoulders'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Sit near the edge of a flat bench with feet planted and hinge your torso forward over your thighs while holding dumbbells.',
      'Pull both dumbbells toward your hips by driving your elbows back and squeezing your shoulder blades.',
      'Lower the dumbbells smoothly under control.',
    ],
    tips: ['Keep your spine neutral and avoid jerking with the lower back.'],
  },
  {
    sourceId: 'custom-barbell-hyperextension',
    name: 'Barbell Hyperextension',
    fallbackSourceId: 'Hyperextensions_Back_Extensions',
    primaryMuscle: 'lower_back',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'barbell',
    difficulty: 'intermediate',
    category: 'strength',
    instructions: [
      'Position your hips over a 45-degree hyperextension bench while holding a light barbell across your upper chest or arms hanging down.',
      'Hinge at the hips to lower your torso with a flat back.',
      'Squeeze glutes and lower back to raise your torso back to neutral alignment without hyperextending.',
    ],
    tips: ['Stop once your torso forms a straight line with your legs.'],
  },
  {
    sourceId: 'custom-single-arm-db-curl',
    name: 'Single-Arm Dumbbell Bicep Curl',
    fallbackSourceId: 'Dumbbell_Alternate_Bicep_Curl',
    primaryMuscle: 'biceps',
    secondaryMuscles: ['forearms'],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Stand tall holding a dumbbell in each hand with elbows pinned near your sides.',
      'Curl one dumbbell up while rotating your palm upward (supinating) and squeeze at the top.',
      'Lower slowly before repeating on the opposite arm or completing all reps on one side.',
    ],
    tips: ['Avoid swinging your torso; keep upper arms stationary.'],
  },
  {
    sourceId: 'custom-side-sit-up-crunches',
    name: 'Side Sit-Up Crunches',
    fallbackSourceId: 'Oblique_Crunches',
    primaryMuscle: 'abdominals',
    secondaryMuscles: ['lower_back'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Lie on your side on a mat with knees bent and top hand lightly behind your head.',
      'Crunch laterally to lift your shoulder blade off the mat while squeezing the obliques.',
      'Lower slowly and complete all reps before switching sides.',
    ],
    tips: ['Lead with your ribcage rather than pulling on your neck.'],
  },
  {
    sourceId: 'custom-bodyweight-glute-bridge',
    name: 'Bodyweight Glute Bridge',
    fallbackSourceId: 'Barbell_Glute_Bridge',
    primaryMuscle: 'glutes',
    secondaryMuscles: ['hamstrings', 'abdominals'],
    equipment: 'bodyweight',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Lie on your back with knees bent, feet hip-width apart and flat on the floor.',
      'Drive through your heels to lift your hips until knees, hips, and shoulders align.',
      'Pause and squeeze your glutes for one second, then lower under control.',
    ],
    tips: ['Tuck your ribs slightly down so the lower back does not overarch.'],
  },
  {
    sourceId: 'custom-spinner-bike',
    name: 'Spinner (Spin Bike)',
    fallbackSourceId: 'Bicycling_Stationary',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'hamstrings', 'calves'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'cardio',
    instructions: [
      'Adjust saddle height to hip level and set resistance to a challenging yet sustainable pace.',
      'Pedal with smooth cadence while keeping your core lightly braced and shoulders relaxed.',
      'Vary resistance intervals or maintain steady Zone 2 heart rate for the prescribed duration.',
    ],
    tips: ['Keep knees tracking straight over toes throughout each pedal stroke.'],
  },
  {
    sourceId: 'custom-cross-trainer',
    name: 'Cross Trainer (Elliptical)',
    fallbackSourceId: 'Elliptical_Trainer',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['quadriceps', 'glutes', 'full_body'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'cardio',
    instructions: [
      'Step onto the pedals, grip the moving handles, and select your target resistance or incline.',
      'Drive evenly through both legs and push/pull the handles in rhythm.',
      'Maintain upright posture for the full prescribed time.',
    ],
    tips: ['Keep full feet planted on the pedals rather than rising onto toes.'],
  },
  {
    sourceId: 'custom-bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    fallbackSourceId: 'Bodyweight_Walking_Lunge',
    primaryMuscle: 'quadriceps',
    secondaryMuscles: ['glutes', 'hamstrings'],
    equipment: 'dumbbell',
    difficulty: 'intermediate',
    category: 'strength',
    instructions: [
      'Stand a stride length in front of a bench and rest the top of your rear foot behind you on the pad.',
      'Lower your back knee toward the floor while keeping your front knee tracking over toes.',
      'Drive through your front midfoot to return to standing.',
    ],
    tips: ['Slight forward torso lean emphasizes glutes; upright torso emphasizes quads.'],
  },
  {
    sourceId: 'custom-incline-treadmill-walk',
    name: 'Incline Treadmill Walk',
    fallbackSourceId: 'Running_Treadmill',
    primaryMuscle: 'cardio',
    secondaryMuscles: ['glutes', 'calves', 'hamstrings'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'cardio',
    instructions: [
      'Set treadmill incline between 6% and 12% at a brisk walking speed.',
      'Walk upright with natural arm swing without hanging onto the front console.',
      'Maintain steady breathing for the target duration.',
    ],
    tips: ['Avoid holding the handrails so heart rate and glute recruitment stay high.'],
  },
  {
    sourceId: 'custom-cable-chest-fly-high-low',
    name: 'Cable Chest Fly (High-to-Low)',
    fallbackSourceId: 'Cable_Crossover',
    primaryMuscle: 'chest',
    secondaryMuscles: ['shoulders'],
    equipment: 'cable',
    difficulty: 'intermediate',
    category: 'strength',
    instructions: [
      'Set both cable pulleys above shoulder height, step forward into a staggered stance.',
      'With a slight bend in your elbows, sweep handles downward and inward toward your lower chest.',
      'Control the return back to a comfortable chest stretch.',
    ],
    tips: ['Keep elbow angle locked throughout the fly motion.'],
  },
  {
    sourceId: 'custom-assisted-pull-up',
    name: 'Assisted Pull-Up Machine',
    fallbackSourceId: 'Chin-Up',
    primaryMuscle: 'lats',
    secondaryMuscles: ['biceps', 'back'],
    equipment: 'machine',
    difficulty: 'beginner',
    category: 'strength',
    instructions: [
      'Select counterweight assistance and kneel or stand onto the support pad.',
      'Grip the overhead bar slightly wider than shoulder-width and pull your chest toward the bar.',
      'Lower with full control to a dead hang before the next rep.',
    ],
    tips: ['Remember that higher counterweight equals more assistance and lighter body load.'],
  },
];

function mapMuscle(rawMuscle) {
  if (!rawMuscle) return 'full_body';
  const normalized = String(rawMuscle).trim().toLowerCase();
  if (normalized === 'middle back') return 'back';
  if (normalized === 'lower back') return 'lower_back';
  if (MUSCLE_GROUPS.includes(normalized)) return normalized;
  return 'full_body';
}

function mapEquipment(rawEquipment) {
  if (!rawEquipment) return 'bodyweight';
  const normalized = String(rawEquipment).trim().toLowerCase();
  const mapping = {
    'body only': 'bodyweight',
    'e-z curl bar': 'ez_bar',
    kettlebells: 'kettlebell',
    'foam roll': 'foam_roll',
    'medicine ball': 'medicine_ball',
    'exercise ball': 'other',
  };
  if (mapping[normalized]) return mapping[normalized];
  if (EQUIPMENT_TYPES.includes(normalized)) return normalized;
  return 'other';
}

function mapDifficulty(rawLevel) {
  const normalized = String(rawLevel || '').trim().toLowerCase();
  if (normalized === 'beginner') return 'beginner';
  if (normalized === 'expert') return 'advanced';
  return 'intermediate';
}

function mapCategory(rawCategory, mappedEquipment, name) {
  const cat = String(rawCategory || '').trim().toLowerCase();
  if (
    mappedEquipment === 'foam_roll' ||
    /mobility|warm.?up|smr|foam roll|band pull/i.test(name)
  ) {
    return 'mobility';
  }
  if (cat === 'cardio') return 'cardio';
  if (cat === 'stretching') return 'stretching';
  return 'strength';
}

function selectExercises(rawList) {
  return rawList.filter(
    (item) =>
      item &&
      item.id &&
      item.name &&
      Array.isArray(item.images) &&
      item.images.length > 0 &&
      Array.isArray(item.instructions) &&
      item.instructions.length > 0
  );
}

function toExerciseDoc(item) {
  const primaryMuscle = mapMuscle(item.primaryMuscles?.[0]);
  const secondaryMuscles = Array.from(
    new Set(
      (item.secondaryMuscles || [])
        .map(mapMuscle)
        .filter((m) => m !== primaryMuscle)
    )
  );
  const equipment = mapEquipment(item.equipment);
  const category = mapCategory(item.category, equipment, item.name);
  const difficulty = mapDifficulty(item.level);

  const imageUrl = `${IMAGE_BASE_URL}${item.images[0]}`;
  const secondaryImageUrl = item.images[1] ? `${IMAGE_BASE_URL}${item.images[1]}` : '';

  return {
    trainerId: null,
    isGlobal: true,
    sourceId: item.id,
    name: item.name,
    imageUrl,
    secondaryImageUrl,
    imagePublicId: '',
    mediaUrl: '',
    primaryMuscle,
    secondaryMuscles,
    equipment,
    difficulty,
    category,
    instructions: item.instructions,
    tips: [],
  };
}

function buildCuratedDocs(rawMap) {
  const docs = [];
  for (const item of CURATED_GYM_EXERCISES) {
    const ref = rawMap.get(item.fallbackSourceId);
    if (!ref || !Array.isArray(ref.images) || ref.images.length === 0) continue;
    docs.push({
      trainerId: null,
      isGlobal: true,
      sourceId: item.sourceId,
      name: item.name,
      imageUrl: `${IMAGE_BASE_URL}${ref.images[0]}`,
      secondaryImageUrl: ref.images[1] ? `${IMAGE_BASE_URL}${ref.images[1]}` : '',
      imagePublicId: '',
      mediaUrl: '',
      primaryMuscle: item.primaryMuscle,
      secondaryMuscles: item.secondaryMuscles || [],
      equipment: item.equipment,
      difficulty: item.difficulty,
      category: item.category,
      instructions: item.instructions,
      tips: item.tips || [],
    });
  }
  return docs;
}

async function seedExercises() {
  const response = await fetch(DATASET_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch free-exercise-db: ${response.status} ${response.statusText}`);
  }

  const rawExercises = await response.json();
  const chosen = selectExercises(rawExercises);
  const rawMap = new Map(chosen.map((item) => [item.id, item]));
  const docs = [...chosen.map(toExerciseDoc), ...buildCuratedDocs(rawMap)];

  const operations = docs.map((doc) => ({
    updateOne: {
      filter: { sourceId: doc.sourceId },
      update: { $set: doc },
      upsert: true,
    },
  }));

  const result = await Exercise.bulkWrite(operations, { ordered: false });
  const totalGlobalInDb = await Exercise.countDocuments({ isGlobal: true });

  return {
    totalProcessed: docs.length,
    upserted: result.upsertedCount || 0,
    modified: result.modifiedCount || 0,
    matched: result.matchedCount || 0,
    totalGlobalInDb,
  };
}

module.exports = {
  seedExercises,
  mapMuscle,
  mapEquipment,
  mapDifficulty,
  mapCategory,
};
