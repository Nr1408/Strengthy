import type { Exercise } from '@/types/workout';

// Explicit equipment type used by the manual `raw` dataset
export type Equipment =
  | 'Barbell'
  | 'Dumbbell'
  | 'Kettlebell'
  | 'Cable'
  | 'Machine'
  | 'Bodyweight';

function mapGroup(g: string) {
  const s = g.trim().toLowerCase();
  if (s.includes('chest')) return 'chest';
  if (s.includes('back')) return 'back';
  if (s.includes('shoulder')) return 'shoulders';
  if (s.includes('bicep') || s === 'arms') return 'biceps';
  if (s.includes('tricep')) return 'triceps';
  if (s.includes('quad') || s.includes('front squat') || s.includes('back squat') || s.includes('squat') || s.includes('lunge') || s.includes('leg press') || s.includes('leg extension') || s.includes('step-up') || s.includes('split squat') || s.includes('sissy')) return 'quads';
  // Glutes/hip-specific checks should run before hamstrings to avoid misclassification
  if (s.includes('glute') || s.includes('hip thrust') || s.includes('abduction')) return 'glutes';
  if (s.includes('ham') || s.includes('rdl') || s.includes('stiff') || s.includes('good morning') || s.includes('leg curl') || s.includes('pull-through') || s.includes('nordic')) return 'hamstrings';
  if (s.includes('calf')) return 'calves';
  if (s.includes('wrist') || s.includes('forearm') || s.includes('pinch') || s.includes('hang') || s.includes('farmer') || s.includes('wrist roller')) return 'forearms';
  if (s.includes('core') || s.includes('ab')) return 'core';
  if (s.includes('cardio')) return 'cardio';
  return 'other';
}

// Manual exercise dataset. Each entry MUST include an explicit `equipment` string
// from the `Equipment` union above — no keyword-based inference is used.
const raw: Array<{ name: string; group: string; equipment: Equipment }> = [
  // --- BARBELL ---
  { name: 'Barbell High Bar Back Squat', group: 'QUADS', equipment: 'Barbell' },
  { name: 'Barbell Low Bar Back Squat', group: 'QUADS', equipment: 'Barbell' },
  { name: 'Barbell Front Squat', group: 'QUADS', equipment: 'Barbell' },
  { name: 'Barbell Zercher Squat', group: 'QUADS', equipment: 'Barbell' },
  { name: 'Barbell Hack Squat', group: 'QUADS', equipment: 'Barbell' },
  { name: 'Barbell Romanian Deadlift', group: 'HAMSTRINGS', equipment: 'Barbell' },
  { name: 'Barbell Stiff-Leg Deadlift', group: 'HAMSTRINGS', equipment: 'Barbell' },
  { name: 'Barbell Good Morning', group: 'HAMSTRINGS', equipment: 'Barbell' },
  { name: 'Barbell Wrist Curl', group: 'FOREARMS', equipment: 'Barbell' },
  { name: 'Barbell Reverse Wrist Curl', group: 'FOREARMS', equipment: 'Barbell' },
  { name: 'Behind-the-Back Barbell Wrist Curl', group: 'FOREARMS', equipment: 'Barbell' },
  { name: 'Barbell Incline Bench Press', group: 'CHEST', equipment: 'Barbell' },
  { name: 'Barbell Flat Bench Press', group: 'CHEST', equipment: 'Barbell' },
  { name: 'Barbell Decline Bench Press', group: 'CHEST', equipment: 'Barbell' },
  { name: 'Barbell Bent-Over Row', group: 'BACK', equipment: 'Barbell' },
  { name: 'Barbell Pendlay Row', group: 'BACK', equipment: 'Barbell' },
  { name: 'Barbell T-Bar Row', group: 'BACK', equipment: 'Barbell' },
  { name: 'Barbell Shrugs', group: 'BACK', equipment: 'Barbell' },
  { name: 'Barbell Overhead Press', group: 'SHOULDERS', equipment: 'Barbell' },
  { name: 'Barbell Front Raise', group: 'SHOULDERS', equipment: 'Barbell' },
  { name: 'Barbell Upright Row', group: 'SHOULDERS', equipment: 'Barbell' },
  { name: 'Barbell Bicep Curl', group: 'BICEPS', equipment: 'Barbell' },
  { name: 'Barbell Reverse Curl', group: 'BICEPS', equipment: 'Barbell' },
  { name: 'Barbell Spider Curl', group: 'BICEPS', equipment: 'Barbell' },
  { name: 'Barbell Close-Grip Bench Press', group: 'TRICEPS', equipment: 'Barbell' },
  { name: 'Barbell Floor Press', group: 'TRICEPS', equipment: 'Barbell' },
  { name: 'Barbell Ab Rollout', group: 'CORE', equipment: 'Barbell' },
  { name: 'Barbell Hip Thrust', group: 'GLUTES', equipment: 'Barbell' },
  { name: 'EZ-Bar Bicep Curl', group: 'BICEPS', equipment: 'Barbell' },
  { name: 'EZ-Bar Preacher Curl', group: 'BICEPS', equipment: 'Barbell' },
  { name: 'EZ-Bar Skull Crusher', group: 'TRICEPS', equipment: 'Barbell' },
  { name: 'EZ-Bar JM Press', group: 'TRICEPS', equipment: 'Barbell' },

  // --- DUMBBELL ---
  { name: 'Dumbbell Goblet Squat', group: 'QUADS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Bulgarian Split Squat', group: 'QUADS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Walking Lunge', group: 'QUADS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Step-Up', group: 'QUADS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Romanian Deadlift', group: 'HAMSTRINGS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Single-Leg RDL', group: 'HAMSTRINGS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Single-Leg Calf Raise', group: 'CALVES', equipment: 'Dumbbell' },
  { name: "Dumbbell Farmer’s Walk on Toes", group: 'CALVES', equipment: 'Dumbbell' },
  { name: 'Dumbbell Wrist Curl', group: 'FOREARMS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Reverse Wrist Curl', group: 'FOREARMS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Zottman Curl', group: 'FOREARMS', equipment: 'Dumbbell' },
  { name: "Dumbbell Farmer's Walk", group: 'FOREARMS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Incline Bench Press', group: 'CHEST', equipment: 'Dumbbell' },
  { name: 'Dumbbell Flat Bench Press', group: 'CHEST', equipment: 'Dumbbell' },
  { name: 'Dumbbell Decline Bench Press', group: 'CHEST', equipment: 'Dumbbell' },
  { name: 'Dumbbell Flat Chest Fly', group: 'CHEST', equipment: 'Dumbbell' },
  { name: 'Dumbbell Pullover', group: 'BACK', equipment: 'Dumbbell' },
  { name: 'Single-Arm Dumbbell Row', group: 'BACK', equipment: 'Dumbbell' },
  { name: 'Dumbbell Chest-Supported Row', group: 'BACK', equipment: 'Dumbbell' },
  { name: 'Dumbbell Shrugs', group: 'BACK', equipment: 'Dumbbell' },
  { name: 'Dumbbell Shoulder Press', group: 'SHOULDERS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Front Raise', group: 'SHOULDERS', equipment: 'Dumbbell' },
  { name: 'Arnold Press', group: 'SHOULDERS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Lateral Raise', group: 'SHOULDERS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Upright Row', group: 'SHOULDERS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Rear Delt Fly', group: 'SHOULDERS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Alternating Bicep Curl', group: 'BICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Incline Curl', group: 'BICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Hammer Curl', group: 'BICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Concentration Curl', group: 'BICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Overhead Extension', group: 'TRICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Flat Skull Crusher', group: 'TRICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Kickback', group: 'TRICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Tate Press', group: 'TRICEPS', equipment: 'Dumbbell' },
  { name: 'Dumbbell Russian Twist', group: 'CORE', equipment: 'Dumbbell' },
  { name: 'Dumbbell Hip Thrust', group: 'GLUTES', equipment: 'Dumbbell' },

  // --- CABLE ---
  { name: 'Cable Pull-Through', group: 'HAMSTRINGS', equipment: 'Cable' },
  { name: 'Cable Reverse Bicep Curl', group: 'FOREARMS', equipment: 'Cable' },
  { name: 'Low-to-High Cable Fly', group: 'CHEST', equipment: 'Cable' },
  { name: 'High-to-Low Cable Crossover', group: 'CHEST', equipment: 'Cable' },
  { name: 'Cable Chest Press', group: 'CHEST', equipment: 'Cable' },
  { name: 'Wide Grip Lat Pulldown', group: 'BACK', equipment: 'Cable' },
  { name: 'Close Grip Lat Pulldown', group: 'BACK', equipment: 'Cable' },
  { name: 'Underhand Lat Pulldown', group: 'BACK', equipment: 'Cable' },
  { name: 'Single-Arm Cable Lat Pulldown', group: 'BACK', equipment: 'Cable' },
  { name: 'Straight-Arm Cable Pulldown', group: 'BACK', equipment: 'Cable' },
  { name: 'Seated Cable Row', group: 'BACK', equipment: 'Cable' },
  { name: 'Upright Cable Shrugs', group: 'BACK', equipment: 'Cable' },
  { name: 'Cable Front Raise', group: 'SHOULDERS', equipment: 'Cable' },
  { name: 'Cable Lateral Raise', group: 'SHOULDERS', equipment: 'Cable' },
  { name: 'Cable Face Pull', group: 'SHOULDERS', equipment: 'Cable' },
  { name: 'Cable Rear Delt Fly', group: 'SHOULDERS', equipment: 'Cable' },
  { name: 'Cable Rope Hammer Curl', group: 'BICEPS', equipment: 'Cable' },
  { name: 'Straight Bar Cable Curl', group: 'BICEPS', equipment: 'Cable' },
  { name: 'Behind-the-Back Cable Curl', group: 'BICEPS', equipment: 'Cable' },
  { name: 'Cable Preacher Curl', group: 'BICEPS', equipment: 'Cable' },
  { name: 'High Cable Hercules Curl', group: 'BICEPS', equipment: 'Cable' },
  { name: 'Cable Rope Pushdown', group: 'TRICEPS', equipment: 'Cable' },
  { name: 'Cable Straight Bar Pushdown', group: 'TRICEPS', equipment: 'Cable' },
  { name: 'Cable Overhead Rope Extension', group: 'TRICEPS', equipment: 'Cable' },
  { name: 'Cable Cross-Body Extension', group: 'TRICEPS', equipment: 'Cable' },
  { name: 'Cable Single-Arm Underhand Pushdown', group: 'TRICEPS', equipment: 'Cable' },
  { name: 'Cable Rope Crunch', group: 'CORE', equipment: 'Cable' },
  { name: 'Cable Woodchop', group: 'CORE', equipment: 'Cable' },
  { name: 'Cable Glute Kickback', group: 'GLUTES', equipment: 'Cable' },

  // --- MACHINE ---
  { name: 'Leg Press Machine', group: 'QUADS', equipment: 'Machine' },
  { name: 'Hack Squat Machine', group: 'QUADS', equipment: 'Machine' },
  { name: 'Pendulum Squat Machine', group: 'QUADS', equipment: 'Machine' },
  { name: 'V-Squat Machine', group: 'QUADS', equipment: 'Machine' },
  { name: 'Leg Extension Machine', group: 'QUADS', equipment: 'Machine' },
  { name: 'Sissy Squat Machine', group: 'QUADS', equipment: 'Machine' },
  { name: 'Smith Machine Squat', group: 'QUADS', equipment: 'Machine' },
  { name: 'Smith Machine Incline Press', group: 'CHEST', equipment: 'Machine' },
  { name: 'Smith Machine Close-Grip Bench', group: 'TRICEPS', equipment: 'Machine' },
  { name: 'Lying Leg Curl Machine', group: 'HAMSTRINGS', equipment: 'Machine' },
  { name: 'Seated Leg Curl Machine', group: 'HAMSTRINGS', equipment: 'Machine' },
  { name: 'Standing Single-Leg Curl Machine', group: 'HAMSTRINGS', equipment: 'Machine' },
  { name: 'Seated Calf Raise Machine', group: 'CALVES', equipment: 'Machine' },
  { name: 'Standing Calf Raise Machine', group: 'CALVES', equipment: 'Machine' },
  { name: 'Donkey Calf Raise Machine', group: 'CALVES', equipment: 'Machine' },
  { name: 'Leg Press Calf Press', group: 'CALVES', equipment: 'Machine' },
  { name: 'Incline Machine Chest Press', group: 'CHEST', equipment: 'Machine' },
  { name: 'Machine Chest Press', group: 'CHEST', equipment: 'Machine' },
  { name: 'Pec Deck Machine', group: 'CHEST', equipment: 'Machine' },
  { name: 'Assisted Pull-up Machine', group: 'BACK', equipment: 'Machine' },
  { name: 'Machine T-Bar Row', group: 'BACK', equipment: 'Machine' },
  { name: 'Hammer Strength Row Machine', group: 'BACK', equipment: 'Machine' },
  { name: 'Shoulder Press Machine', group: 'SHOULDERS', equipment: 'Machine' },
  { name: 'Machine Lateral Raise', group: 'SHOULDERS', equipment: 'Machine' },
  { name: 'Reverse Pec Deck Machine', group: 'SHOULDERS', equipment: 'Machine' },
  { name: 'Machine Bicep Curl', group: 'BICEPS', equipment: 'Machine' },
  { name: 'Preacher Curl Machine', group: 'BICEPS', equipment: 'Machine' },
  { name: 'Tricep Dip Machine', group: 'TRICEPS', equipment: 'Machine' },
  { name: 'Seated Tricep Extension Machine', group: 'TRICEPS', equipment: 'Machine' },
  { name: 'Ab Crunch Machine', group: 'CORE', equipment: 'Machine' },
  { name: "Captain's Chair Knee Raise", group: 'CORE', equipment: 'Machine' },
  { name: 'Treadmill Run', group: 'CARDIO', equipment: 'Machine' },
  { name: 'Stationary Bike', group: 'CARDIO', equipment: 'Machine' },
  { name: 'Elliptical Trainer', group: 'CARDIO', equipment: 'Machine' },
  { name: 'Stair Climber', group: 'CARDIO', equipment: 'Machine' },
  { name: 'Rowing Machine', group: 'CARDIO', equipment: 'Machine' },
  { name: 'Machine Hip Abduction', group: 'GLUTES', equipment: 'Machine' },
  { name: 'Machine Hip Thrust', group: 'GLUTES', equipment: 'Machine' },

  // --- BODYWEIGHT ---
  { name: 'Glute Ham Raise', group: 'HAMSTRINGS', equipment: 'Bodyweight' },
  { name: 'Nordic Hamstring Curl', group: 'HAMSTRINGS', equipment: 'Bodyweight' },
  { name: 'Wrist Roller', group: 'FOREARMS', equipment: 'Bodyweight' },
  { name: 'Plate Pinches', group: 'FOREARMS', equipment: 'Bodyweight' },
  { name: 'Dead Hang', group: 'FOREARMS', equipment: 'Bodyweight' },
  { name: 'Chest Dips', group: 'CHEST', equipment: 'Bodyweight' },
  { name: 'Pull-ups', group: 'BACK', equipment: 'Bodyweight' },
  { name: 'Chin-ups', group: 'BICEPS', equipment: 'Bodyweight' },
  { name: 'Inverted Row (Underhand Grip)', group: 'BICEPS', equipment: 'Bodyweight' },
  { name: 'Bodyweight Dips', group: 'TRICEPS', equipment: 'Bodyweight' },
  { name: 'Bench Dips', group: 'TRICEPS', equipment: 'Bodyweight' },
  { name: 'Diamond Push-ups', group: 'TRICEPS', equipment: 'Bodyweight' },
  { name: 'Hanging Leg Raise', group: 'CORE', equipment: 'Bodyweight' },
  { name: 'Weighted Sit-Up', group: 'CORE', equipment: 'Bodyweight' },
  { name: 'Burpees', group: 'CARDIO', equipment: 'Bodyweight' },
  { name: 'Mountain Climbers', group: 'CARDIO', equipment: 'Bodyweight' },
  { name: 'Jump Squats', group: 'CARDIO', equipment: 'Bodyweight' },
  { name: 'Plank Jacks', group: 'CARDIO', equipment: 'Bodyweight' },
  { name: 'Skaters', group: 'CARDIO', equipment: 'Bodyweight' },
  { name: 'Push-ups', group: 'CHEST', equipment: 'Bodyweight' },
  { name: 'Incline Push-ups', group: 'CHEST', equipment: 'Bodyweight' },
  { name: 'Decline Push-ups', group: 'CHEST', equipment: 'Bodyweight' },
  { name: 'Bodyweight Squat', group: 'QUADS', equipment: 'Bodyweight' },
  { name: 'Back Extension', group: 'GLUTES', equipment: 'Bodyweight' }
  ,
  // --- KETTLEBELL ---
  { name: 'Kettlebell Swing', group: 'HAMSTRINGS', equipment: 'Kettlebell' },
  { name: 'Kettlebell Goblet Squat', group: 'QUADS', equipment: 'Kettlebell' },
  { name: 'Kettlebell Turkish Get-Up', group: 'CORE', equipment: 'Kettlebell' },
  { name: 'Kettlebell Clean and Press', group: 'SHOULDERS', equipment: 'Kettlebell' },
  { name: 'Kettlebell Snatch', group: 'SHOULDERS', equipment: 'Kettlebell' },
  { name: 'Kettlebell Single-Leg RDL', group: 'HAMSTRINGS', equipment: 'Kettlebell' },
  { name: 'Kettlebell Farmer’s Walk', group: 'FOREARMS', equipment: 'Kettlebell' },
  { name: 'Kettlebell Gorilla Row', group: 'BACK', equipment: 'Kettlebell' },
  { name: 'Kettlebell Halo', group: 'SHOULDERS', equipment: 'Kettlebell' }
];

// Sorting order for equipment groups. Kettlebell intentionally appears after
// Dumbbell and before Cable.
const equipmentOrder: Equipment[] = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Cable',
  'Machine',
  'Bodyweight',
];

// Stable sort the raw dataset by equipment group according to the manual order.
const sortedRaw = raw.slice().sort((a, b) => {
  const ai = equipmentOrder.indexOf(a.equipment);
  const bi = equipmentOrder.indexOf(b.equipment);
  // Items with unknown equipment go last
  const aPos = ai === -1 ? equipmentOrder.length : ai;
  const bPos = bi === -1 ? equipmentOrder.length : bi;
  return aPos - bPos;
});

export const libraryExercises: Exercise[] = sortedRaw.map((r, i) => ({
  id: `lib-${i + 1}`,
  name: r.name,
  muscleGroup: mapGroup(r.group),
  equipment: r.equipment,
  description: '',
  createdAt: new Date(),
}));

export default libraryExercises;


