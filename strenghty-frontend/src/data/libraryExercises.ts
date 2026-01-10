import type { Exercise } from '@/types/workout';

function mapGroup(g: string) {
  const s = g.trim().toLowerCase();
  if (s.includes('chest')) return 'chest';
  if (s.includes('back')) return 'back';
  if (s.includes('shoulder')) return 'shoulders';
  if (s.includes('bicep') || s === 'arms') return 'biceps';
  if (s.includes('tricep')) return 'triceps';
  if (s.includes('quad') || s.includes('front squat') || s.includes('back squat') || s.includes('squat') || s.includes('lunge') || s.includes('leg press') || s.includes('leg extension') || s.includes('step-up') || s.includes('split squat') || s.includes('sissy')) return 'quads';
  if (s.includes('ham') || s.includes('rdl') || s.includes('stiff') || s.includes('good morning') || s.includes('glute ham') || s.includes('leg curl') || s.includes('pull-through') || s.includes('nordic')) return 'hamstrings';
  if (s.includes('calf')) return 'calves';
  if (s.includes('wrist') || s.includes('forearm') || s.includes('pinch') || s.includes('hang') || s.includes('farmer') || s.includes('wrist roller')) return 'forearms';
  if (s.includes('glute')) return 'hamstrings';
  if (s.includes('core') || s.includes('ab')) return 'core';
  if (s.includes('cardio')) return 'cardio';
  return 'calves';
}

const raw: Array<{ name: string; group: string }> = [
  // Quads
  { name: 'Barbell High Bar Back Squat', group: 'QUADS' },
  { name: 'Barbell Low Bar Back Squat', group: 'QUADS' },
  { name: 'Barbell Front Squat', group: 'QUADS' },
  { name: 'Barbell Zercher Squat', group: 'QUADS' },
  { name: 'Barbell Hack Squat', group: 'QUADS' },
  { name: 'Dumbbell Goblet Squat', group: 'QUADS' },
  { name: 'Dumbbell Bulgarian Split Squat', group: 'QUADS' },
  { name: 'Dumbbell Walking Lunge', group: 'QUADS' },
  { name: 'Dumbbell Step-Up', group: 'QUADS' },
  { name: 'Leg Press Machine', group: 'QUADS' },
  { name: 'Hack Squat Machine', group: 'QUADS' },
  { name: 'Pendulum Squat Machine', group: 'QUADS' },
  { name: 'V-Squat Machine', group: 'QUADS' },
  { name: 'Leg Extension Machine', group: 'QUADS' },
  { name: 'Sissy Squat Machine', group: 'QUADS' },
  { name: 'Smith Machine Squat', group: 'QUADS' },

  // Hamstrings
  { name: 'Barbell Romanian Deadlift', group: 'HAMSTRINGS' },
  { name: 'Barbell Stiff-Leg Deadlift', group: 'HAMSTRINGS' },
  { name: 'Barbell Good Morning', group: 'HAMSTRINGS' },
  { name: 'Dumbbell Romanian Deadlift', group: 'HAMSTRINGS' },
  { name: 'Dumbbell Single-Leg RDL', group: 'HAMSTRINGS' },
  { name: 'Lying Leg Curl Machine', group: 'HAMSTRINGS' },
  { name: 'Seated Leg Curl Machine', group: 'HAMSTRINGS' },
  { name: 'Standing Single-Leg Curl Machine', group: 'HAMSTRINGS' },
  { name: 'Cable Pull-Through', group: 'HAMSTRINGS' },
  { name: 'Glute Ham Raise', group: 'HAMSTRINGS' },
  { name: 'Nordic Hamstring Curl', group: 'HAMSTRINGS' },

  // Calves
  { name: 'Seated Calf Raise Machine', group: 'CALVES' },
  { name: 'Standing Calf Raise Machine', group: 'CALVES' },
  { name: 'Donkey Calf Raise Machine', group: 'CALVES' },
  { name: 'Leg Press Calf Press', group: 'CALVES' },
  { name: 'Dumbbell Single-Leg Calf Raise', group: 'CALVES' },
  { name: "Dumbbell Farmer’s Walk on Toes", group: 'CALVES' },
  
  // Forearms
  { name: 'Barbell Wrist Curl', group: 'FOREARMS' },
  { name: 'Barbell Reverse Wrist Curl', group: 'FOREARMS' },
  { name: 'Dumbbell Wrist Curl', group: 'FOREARMS' },
  { name: 'Dumbbell Reverse Wrist Curl', group: 'FOREARMS' },
  { name: 'Dumbbell Zottman Curl', group: 'FOREARMS' },
  { name: 'Barbell Reverse Bicep Curl', group: 'FOREARMS' },
  { name: 'EZ-Bar Reverse Bicep Curl', group: 'FOREARMS' },
  { name: 'Cable Reverse Bicep Curl', group: 'FOREARMS' },
  { name: "Dumbbell Farmer's Walk", group: 'FOREARMS' },
  { name: 'Behind-the-Back Barbell Wrist Curl', group: 'FOREARMS' },
  { name: 'Wrist Roller', group: 'FOREARMS' },
  { name: 'Plate Pinches', group: 'FOREARMS' },
  { name: 'Dead Hang', group: 'FOREARMS' },
  // Glute-specific exercises removed to avoid misclassification under calves
  { name: 'Barbell Incline Bench Press', group: 'CHEST' },
  { name: 'Dumbbell Incline Bench Press', group: 'CHEST' },
  { name: 'Incline Machine Chest Press', group: 'CHEST' },
  { name: 'Low-to-High Cable Fly', group: 'CHEST' },
  { name: 'Smith Machine Incline Press', group: 'CHEST' },
  { name: 'Barbell Flat Bench Press', group: 'CHEST' },
  { name: 'Barbell Decline Bench Press', group: 'CHEST' },
  { name: 'Dumbbell Flat Bench Press', group: 'CHEST' },
  { name: 'Dumbbell Decline Bench Press', group: 'CHEST' },
  { name: 'Dumbbell Flat Chest Fly', group: 'CHEST' },
  { name: 'Machine Chest Press', group: 'CHEST' },
  { name: 'Pec Deck Machine', group: 'CHEST' },
  { name: 'High-to-Low Cable Crossover', group: 'CHEST' },
  { name: 'Cable Chest Press', group: 'CHEST' },
  { name: 'Chest Dips', group: 'CHEST' },
  { name: 'Wide Grip Lat Pulldown', group: 'BACK' },
  { name: 'Close Grip Lat Pulldown', group: 'BACK' },
  { name: 'Underhand Lat Pulldown', group: 'BACK' },
  { name: 'Single-Arm Cable Lat Pulldown', group: 'BACK' },
  { name: 'Straight-Arm Cable Pulldown', group: 'BACK' },
  { name: 'Dumbbell Pullover', group: 'BACK' },
  { name: 'Pull-ups', group: 'BACK' },
  { name: 'Assisted Pull-up Machine', group: 'BACK' },
  { name: 'Barbell Bent-Over Row', group: 'BACK' },
  { name: 'Barbell Pendlay Row', group: 'BACK' },
  { name: 'Barbell T-Bar Row', group: 'BACK' },
  { name: 'Seated Cable Row', group: 'BACK' },
  { name: 'Single-Arm Dumbbell Row', group: 'BACK' },
  { name: 'Dumbbell Chest-Supported Row', group: 'BACK' },
  { name: 'Meadows Row', group: 'BACK' },
  { name: 'Machine T-Bar Row', group: 'BACK' },
  { name: 'Hammer Strength Row Machine', group: 'BACK' },
  { name: 'Barbell Overhead Press', group: 'SHOULDERS' },
  { name: 'Dumbbell Shoulder Press', group: 'SHOULDERS' },
  { name: 'Dumbbell Front Raise', group: 'SHOULDERS' },
  { name: 'Barbell Front Raise', group: 'SHOULDERS' },
  { name: 'Cable Front Raise', group: 'SHOULDERS' },
  { name: 'Shoulder Press Machine', group: 'SHOULDERS' },
  { name: 'Arnold Press', group: 'SHOULDERS' },
  { name: 'Dumbbell Lateral Raise', group: 'SHOULDERS' },
  { name: 'Cable Lateral Raise', group: 'SHOULDERS' },
  { name: 'Machine Lateral Raise', group: 'SHOULDERS' },
  { name: 'Barbell Upright Row', group: 'SHOULDERS' },
  { name: 'Dumbbell Upright Row', group: 'SHOULDERS' },
  { name: 'Dumbbell Rear Delt Fly', group: 'SHOULDERS' },
  { name: 'Cable Face Pull', group: 'SHOULDERS' },
  { name: 'Cable Rear Delt Fly', group: 'SHOULDERS' },
  { name: 'Reverse Pec Deck Machine', group: 'SHOULDERS' },
  // Biceps library (replaced with curated list)
  { name: 'Barbell Bicep Curl', group: 'BICEPS' },
  { name: 'EZ-Bar Bicep Curl', group: 'BICEPS' },
  { name: 'EZ-Bar Preacher Curl', group: 'BICEPS' },
  { name: 'Barbell Reverse Curl', group: 'BICEPS' },
  { name: 'Barbell Spider Curl', group: 'BICEPS' },
  { name: 'Dumbbell Alternating Bicep Curl', group: 'BICEPS' },
  { name: 'Dumbbell Incline Curl', group: 'BICEPS' },
  { name: 'Dumbbell Hammer Curl', group: 'BICEPS' },
  { name: 'Dumbbell Concentration Curl', group: 'BICEPS' },
  { name: 'Dumbbell Zottman Curl', group: 'BICEPS' },
  { name: 'Cable Rope Hammer Curl', group: 'BICEPS' },
  { name: 'Straight Bar Cable Curl', group: 'BICEPS' },
  { name: 'Behind-the-Back Cable Curl', group: 'BICEPS' },
  { name: 'Cable Preacher Curl', group: 'BICEPS' },
  { name: 'High Cable Hercules Curl', group: 'BICEPS' },
  { name: 'Machine Bicep Curl', group: 'BICEPS' },
  { name: 'Preacher Curl Machine', group: 'BICEPS' },
  { name: 'Chin-ups', group: 'BICEPS' },
  { name: 'Inverted Row (Underhand Grip)', group: 'BICEPS' },
  
  // Additional tricep-focused exercises
  { name: 'Barbell Close-Grip Bench Press', group: 'TRICEPS' },
  { name: 'EZ-Bar Skull Crusher', group: 'TRICEPS' },
  { name: 'Barbell Floor Press', group: 'TRICEPS' },
  { name: 'EZ-Bar JM Press', group: 'TRICEPS' },
  { name: 'Dumbbell Overhead Extension', group: 'TRICEPS' },
  { name: 'Dumbbell Flat Skull Crusher', group: 'TRICEPS' },
  { name: 'Dumbbell Kickback', group: 'TRICEPS' },
  { name: 'Dumbbell Tate Press', group: 'TRICEPS' },
  { name: 'Cable Rope Pushdown', group: 'TRICEPS' },
  { name: 'Cable Straight Bar Pushdown', group: 'TRICEPS' },
  { name: 'Cable Overhead Rope Extension', group: 'TRICEPS' },
  { name: 'Cable Cross-Body Extension', group: 'TRICEPS' },
  { name: 'Cable Single-Arm Underhand Pushdown', group: 'TRICEPS' },
  { name: 'Tricep Dip Machine', group: 'TRICEPS' },
  { name: 'Seated Tricep Extension Machine', group: 'TRICEPS' },
  { name: 'Smith Machine Close-Grip Bench', group: 'TRICEPS' },
  { name: 'Bodyweight Dips', group: 'TRICEPS' },
  { name: 'Bench Dips', group: 'TRICEPS' },
  { name: 'Diamond Push-ups', group: 'TRICEPS' },
  { name: 'Cable Rope Crunch', group: 'CORE' },
  { name: 'Cable Woodchop', group: 'CORE' },
  { name: 'Ab Crunch Machine', group: 'CORE' },
  { name: 'Hanging Leg Raise', group: 'CORE' },
  { name: "Captain's Chair Knee Raise", group: 'CORE' },
  { name: 'Barbell Ab Rollout', group: 'CORE' },
  { name: 'Dumbbell Russian Twist', group: 'CORE' },
  { name: 'Weighted Sit-Up', group: 'CORE' },

  // Cardio machines
  { name: 'Treadmill Run', group: 'CARDIO' },
  { name: 'Stationary Bike', group: 'CARDIO' },
  { name: 'Elliptical Trainer', group: 'CARDIO' },
  { name: 'Stair Climber', group: 'CARDIO' },
  { name: 'Rowing Machine', group: 'CARDIO' },
];

export const libraryExercises: Exercise[] = raw.map((r, i) => ({
  id: `lib-${i + 1}`,
  name: r.name,
  muscleGroup: mapGroup(r.group),
  description: '',
  createdAt: new Date(),
}));

export default libraryExercises;
