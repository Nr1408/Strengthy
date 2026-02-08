import type { Exercise, Workout, Routine, MuscleGroup } from '@/types/workout';
import { libraryExercises } from '@/data/libraryExercises';

// Updated exercise library to match requested routines (names + muscle groups)
export const mockExercises: Exercise[] = [
  // Push Day
  { id: 'ex-bench-flat', name: 'Barbell Flat Bench Press', muscleGroup: 'chest', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-incline-db-bench', name: 'Dumbbell Incline Bench Press', muscleGroup: 'chest', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-shoulder-press-machine', name: 'Shoulder Press Machine', muscleGroup: 'shoulders', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-lateral-raise', name: 'Dumbbell Lateral Raise', muscleGroup: 'shoulders', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-pec-deck', name: 'Pec Deck Machine', muscleGroup: 'chest', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-cable-rope-pushdown', name: 'Cable Rope Pushdown', muscleGroup: 'triceps', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-overhead-extension', name: 'Dumbbell Overhead Extension', muscleGroup: 'triceps', description: '', createdAt: new Date('2024-01-01') },

  // Pull Day
  { id: 'ex-pull-ups', name: 'Pull-ups (Wide or Narrow)', muscleGroup: 'back', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-bentover-row', name: 'Barbell Bent-Over Row', muscleGroup: 'back', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-seated-cable-row', name: 'Seated Cable Row (V-Bar)', muscleGroup: 'back', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-cable-face-pull', name: 'Cable Face Pull', muscleGroup: 'shoulders', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-bb-bicep-curl', name: 'Barbell Bicep Curl', muscleGroup: 'biceps', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-hammer-curl', name: 'Dumbbell Hammer Curl', muscleGroup: 'biceps', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-hanging-leg-raise', name: 'Hanging Leg Raise', muscleGroup: 'core', description: '', createdAt: new Date('2024-01-01') },

  // Leg Day
  { id: 'ex-back-squat', name: 'Barbell Back Squat', muscleGroup: 'quads', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-leg-press', name: 'Leg Press Machine', muscleGroup: 'quads', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-lying-leg-curl', name: 'Lying Leg Curl Machine', muscleGroup: 'hamstrings', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-rdl', name: 'Dumbbell Romanian Deadlift', muscleGroup: 'hamstrings', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-leg-extension', name: 'Leg Extension Machine', muscleGroup: 'quads', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-standing-calf-raise', name: 'Standing Calf Raise Machine', muscleGroup: 'calves', description: '', createdAt: new Date('2024-01-01') },

  // Upper Body A
  { id: 'ex-incline-bench-barbell', name: 'Barbell Incline Bench Press', muscleGroup: 'chest', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-wide-lat-pulldown', name: 'Wide Grip Lat Pulldown', muscleGroup: 'back', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-shoulder-press', name: 'Dumbbell Shoulder Press', muscleGroup: 'shoulders', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-chest-supported-row', name: 'Dumbbell Chest-Supported Row', muscleGroup: 'back', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-ez-skull-crusher', name: 'EZ-Bar Skull Crusher', muscleGroup: 'triceps', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-cable-bicep-curl', name: 'Cable Bicep Curl', muscleGroup: 'biceps', description: '', createdAt: new Date('2024-01-01') },

  // Lower Body A
  { id: 'ex-hack-squat', name: 'Hack Squat Machine', muscleGroup: 'quads', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-bb-rdl', name: 'Barbell Romanian Deadlift (RDL)', muscleGroup: 'hamstrings', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-db-bulgarian-split', name: 'Dumbbell Bulgarian Split Squat', muscleGroup: 'quads', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-seated-leg-curl', name: 'Seated Leg Curl Machine', muscleGroup: 'hamstrings', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-seated-calf-raise', name: 'Seated Calf Raise Machine', muscleGroup: 'calves', description: '', createdAt: new Date('2024-01-01') },
  { id: 'ex-cable-rope-crunch', name: 'Cable Rope Crunch', muscleGroup: 'core', description: '', createdAt: new Date('2024-01-01') },
];

export const mockWorkouts: Workout[] = [
  {
    id: '1',
    name: 'Push Day',
    date: new Date(),
    completed: true,
    duration: 65,
    exercises: [
      {
        id: '1',
        exercise: mockExercises[0],
        sets: [
          { id: '1', reps: 8, weight: 135, isPR: false, completed: true },
          { id: '2', reps: 8, weight: 155, isPR: false, completed: true },
          { id: '3', reps: 6, weight: 175, isPR: true, completed: true },
        ],
      },
      {
        id: '2',
        exercise: mockExercises[3],
        sets: [
          { id: '4', reps: 8, weight: 95, isPR: false, completed: true },
          { id: '5', reps: 8, weight: 105, isPR: false, completed: true },
          { id: '6', reps: 6, weight: 115, isPR: false, completed: true },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Leg Day',
    date: new Date(Date.now() - 86400000),
    completed: true,
    duration: 55,
    exercises: [
      {
        id: '3',
        exercise: mockExercises[1],
        sets: [
          { id: '7', reps: 5, weight: 225, isPR: false, completed: true },
          { id: '8', reps: 5, weight: 245, isPR: false, completed: true },
          { id: '9', reps: 3, weight: 275, isPR: true, completed: true },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Pull Day',
    date: new Date(Date.now() - 172800000),
    completed: true,
    duration: 70,
    exercises: [
      {
        id: '4',
        exercise: mockExercises[2],
        sets: [
          { id: '10', reps: 5, weight: 275, isPR: false, completed: true },
          { id: '11', reps: 5, weight: 315, isPR: false, completed: true },
          { id: '12', reps: 3, weight: 365, isPR: false, completed: true },
        ],
      },
      {
        id: '5',
        exercise: mockExercises[4],
        sets: [
          { id: '13', reps: 8, weight: 135, isPR: false, completed: true },
          { id: '14', reps: 8, weight: 155, isPR: false, completed: true },
          { id: '15', reps: 8, weight: 155, isPR: false, completed: true },
        ],
      },
    ],
  },
];

// Helper to find exercise by name from the main exercise library
function ex(name: string): Exercise {
  const found = libraryExercises.find((e) => e.name === name);
  if (!found) throw new Error(`Exercise not found in library: ${name}`);
  return found;
}

export const mockRoutines: Routine[] = [
  {
    id: 'r-push',
    name: 'Push Day',
    description: 'Focus: Pushing movements',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: 'r-push-1', exercise: ex('Barbell Flat Bench Press'), targetSets: 3, targetReps: 6, order: 1 },
      { id: 'r-push-2', exercise: ex('Dumbbell Incline Bench Press'), targetSets: 3, targetReps: 10, order: 2 },
      { id: 'r-push-3', exercise: ex('Shoulder Press Machine'), targetSets: 3, targetReps: 10, order: 3 },
      { id: 'r-push-4', exercise: ex('Dumbbell Lateral Raise'), targetSets: 4, targetReps: 15, order: 4 },
      { id: 'r-push-5', exercise: ex('Pec Deck Machine'), targetSets: 3, targetReps: 12, order: 5 },
      { id: 'r-push-6', exercise: ex('Cable Rope Pushdown'), targetSets: 3, targetReps: 12, order: 6 },
      { id: 'r-push-7', exercise: ex('Dumbbell Overhead Extension'), targetSets: 3, targetReps: 10, order: 7 },
    ],
  },
  {
    id: 'r-pull',
    name: 'Pull Day',
    description: 'Focus: Pulling movements',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: 'r-pull-1', exercise: ex('Pull-ups'), targetSets: 3, targetReps: 12, order: 1 },
      { id: 'r-pull-2', exercise: ex('Barbell Bent-Over Row'), targetSets: 3, targetReps: 8, order: 2 },
      { id: 'r-pull-3', exercise: ex('Seated Cable Row'), targetSets: 3, targetReps: 12, order: 3 },
      { id: 'r-pull-4', exercise: ex('Cable Face Pull'), targetSets: 3, targetReps: 15, order: 4 },
      { id: 'r-pull-5', exercise: ex('Barbell Bicep Curl'), targetSets: 3, targetReps: 8, order: 5 },
      { id: 'r-pull-6', exercise: ex('Dumbbell Hammer Curl'), targetSets: 3, targetReps: 12, order: 6 },
      { id: 'r-pull-7', exercise: ex('Hanging Leg Raise'), targetSets: 3, targetReps: 15, order: 7 },
    ],
  },
  {
    id: 'r-legs',
    name: 'Leg Day',
    description: 'Focus: Total lower body',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: 'r-legs-1', exercise: ex('Barbell High Bar Back Squat'), targetSets: 3, targetReps: 6, order: 1 },
      { id: 'r-legs-2', exercise: ex('Leg Press Machine'), targetSets: 3, targetReps: 10, order: 2 },
      { id: 'r-legs-3', exercise: ex('Lying Leg Curl Machine'), targetSets: 3, targetReps: 12, order: 3 },
      { id: 'r-legs-4', exercise: ex('Dumbbell Romanian Deadlift'), targetSets: 3, targetReps: 10, order: 4 },
      { id: 'r-legs-5', exercise: ex('Leg Extension Machine'), targetSets: 3, targetReps: 15, order: 5 },
      { id: 'r-legs-6', exercise: ex('Standing Calf Raise Machine'), targetSets: 4, targetReps: 15, order: 6 },
    ],
  },
  {
    id: 'r-upper-a',
    name: 'Upper Body A',
    description: 'Hypertrophy focus • Upper body',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: 'r-ul-ua-1', exercise: ex('Barbell Incline Bench Press'), targetSets: 3, targetReps: 8, order: 1 },
      { id: 'r-ul-ua-2', exercise: ex('Wide Grip Lat Pulldown'), targetSets: 3, targetReps: 10, order: 2 },
      { id: 'r-ul-ua-3', exercise: ex('Dumbbell Shoulder Press'), targetSets: 3, targetReps: 10, order: 3 },
      { id: 'r-ul-ua-4', exercise: ex('Dumbbell Chest-Supported Row'), targetSets: 3, targetReps: 12, order: 4 },
      { id: 'r-ul-ua-5', exercise: ex('EZ-Bar Skull Crusher'), targetSets: 3, targetReps: 12, order: 5 },
      { id: 'r-ul-ua-6', exercise: ex('Straight Bar Cable Curl'), targetSets: 3, targetReps: 15, order: 6 },
    ],
  },
  {
    id: 'r-lower-a',
    name: 'Lower Body A',
    description: 'Hypertrophy focus • Lower body',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: 'r-ul-la-1', exercise: ex('Hack Squat Machine'), targetSets: 3, targetReps: 10, order: 1 },
      { id: 'r-ul-la-2', exercise: ex('Barbell Romanian Deadlift'), targetSets: 3, targetReps: 8, order: 2 },
      { id: 'r-ul-la-3', exercise: ex('Dumbbell Bulgarian Split Squat'), targetSets: 3, targetReps: 10, order: 3 },
      { id: 'r-ul-la-4', exercise: ex('Seated Leg Curl Machine'), targetSets: 3, targetReps: 12, order: 4 },
      { id: 'r-ul-la-5', exercise: ex('Seated Calf Raise Machine'), targetSets: 4, targetReps: 15, order: 5 },
      { id: 'r-ul-la-6', exercise: ex('Cable Rope Crunch'), targetSets: 3, targetReps: 20, order: 6 },
    ],
  },
  {
    id: 'r-upper-strength',
    name: 'Upper Body – Strength Focus',
    description: 'Strength focus • Upper body compound presses and pulls',
    createdAt: new Date(),
    exercises: [
      { id: 'r-us-1', exercise: ex('Barbell Flat Bench Press'), targetSets: 4, targetReps: 5, order: 1 },
      { id: 'r-us-2', exercise: ex('Barbell Bent-Over Row'), targetSets: 4, targetReps: 5, order: 2 },
      { id: 'r-us-3', exercise: ex('Barbell Overhead Press'), targetSets: 3, targetReps: 5, order: 3 },
      { id: 'r-us-4', exercise: ex('Pull-ups'), targetSets: 3, targetReps: 6, order: 4 },
      { id: 'r-us-5', exercise: ex('EZ-Bar Skull Crusher'), targetSets: 3, targetReps: 8, order: 5 },
      { id: 'r-us-6', exercise: ex('Barbell Bicep Curl'), targetSets: 3, targetReps: 8, order: 6 },
    ],
  },
  {
    id: 'r-lower-strength',
    name: 'Lower Body – Strength Focus',
    description: 'Strength focus • Heavy squats, pulls, and core',
    createdAt: new Date(),
    exercises: [
      { id: 'r-ls-1', exercise: ex('Barbell High Bar Back Squat'), targetSets: 4, targetReps: 5, order: 1 },
      { id: 'r-ls-2', exercise: ex('Barbell Romanian Deadlift'), targetSets: 4, targetReps: 6, order: 2 },
      { id: 'r-ls-3', exercise: ex('Leg Press Machine'), targetSets: 3, targetReps: 8, order: 3 },
      { id: 'r-ls-4', exercise: ex('Standing Calf Raise Machine'), targetSets: 4, targetReps: 10, order: 4 },
      { id: 'r-ls-5', exercise: ex('Hanging Leg Raise'), targetSets: 3, targetReps: 12, order: 5 },
    ],
  },
  {
    id: 'r-upper-hypertrophy',
    name: 'Upper Body – Hypertrophy',
    description: 'Hypertrophy focus • Upper body volume and isolation',
    createdAt: new Date(),
    exercises: [
      { id: 'r-uh-1', exercise: ex('Dumbbell Incline Bench Press'), targetSets: 4, targetReps: 10, order: 1 },
      { id: 'r-uh-2', exercise: ex('Wide Grip Lat Pulldown'), targetSets: 4, targetReps: 10, order: 2 },
      { id: 'r-uh-3', exercise: ex('Dumbbell Shoulder Press'), targetSets: 3, targetReps: 12, order: 3 },
      { id: 'r-uh-4', exercise: ex('Dumbbell Chest-Supported Row'), targetSets: 3, targetReps: 12, order: 4 },
      { id: 'r-uh-5', exercise: ex('Dumbbell Lateral Raise'), targetSets: 4, targetReps: 15, order: 5 },
      { id: 'r-uh-6', exercise: ex('Cable Rope Pushdown'), targetSets: 3, targetReps: 12, order: 6 },
      { id: 'r-uh-7', exercise: ex('Straight Bar Cable Curl'), targetSets: 3, targetReps: 12, order: 7 },
    ],
  },
  {
    id: 'r-lower-hypertrophy',
    name: 'Lower Body – Hypertrophy',
    description: 'Hypertrophy focus • Quad, hamstring, and calf volume',
    createdAt: new Date(),
    exercises: [
      { id: 'r-lh-1', exercise: ex('Hack Squat Machine'), targetSets: 4, targetReps: 10, order: 1 },
      { id: 'r-lh-2', exercise: ex('Dumbbell Romanian Deadlift'), targetSets: 3, targetReps: 12, order: 2 },
      { id: 'r-lh-3', exercise: ex('Seated Leg Curl Machine'), targetSets: 3, targetReps: 12, order: 3 },
      { id: 'r-lh-4', exercise: ex('Leg Extension Machine'), targetSets: 3, targetReps: 15, order: 4 },
      { id: 'r-lh-5', exercise: ex('Seated Calf Raise Machine'), targetSets: 4, targetReps: 15, order: 5 },
    ],
  },
  {
    id: 'r-full-a',
    name: 'Full Body A',
    description: 'Full body • Heavy lower, push, and pull',
    createdAt: new Date(),
    exercises: [
      { id: 'r-fba-1', exercise: ex('Barbell High Bar Back Squat'), targetSets: 3, targetReps: 6, order: 1 },
      { id: 'r-fba-2', exercise: ex('Barbell Flat Bench Press'), targetSets: 3, targetReps: 6, order: 2 },
      { id: 'r-fba-3', exercise: ex('Seated Cable Row'), targetSets: 3, targetReps: 10, order: 3 },
      { id: 'r-fba-4', exercise: ex('Dumbbell Shoulder Press'), targetSets: 3, targetReps: 10, order: 4 },
      { id: 'r-fba-5', exercise: ex('Cable Rope Pushdown'), targetSets: 2, targetReps: 12, order: 5 },
    ],
  },
  {
    id: 'r-full-b',
    name: 'Full Body B',
    description: 'Full body • Hinge, incline press, vertical pull',
    createdAt: new Date(),
    exercises: [
      { id: 'r-fbb-1', exercise: ex('Barbell Romanian Deadlift'), targetSets: 3, targetReps: 8, order: 1 },
      { id: 'r-fbb-2', exercise: ex('Dumbbell Incline Bench Press'), targetSets: 3, targetReps: 10, order: 2 },
      { id: 'r-fbb-3', exercise: ex('Pull-ups'), targetSets: 3, targetReps: 8, order: 3 },
      { id: 'r-fbb-4', exercise: ex('Dumbbell Lateral Raise'), targetSets: 3, targetReps: 15, order: 4 },
      { id: 'r-fbb-5', exercise: ex('Straight Bar Cable Curl'), targetSets: 2, targetReps: 12, order: 5 },
    ],
  },
  {
    id: 'r-glutes-hamstrings',
    name: 'Glutes + Hamstrings Focus',
    description: 'Posterior chain focus • Glutes and hamstrings',
    createdAt: new Date(),
    exercises: [
      { id: 'r-gh-1', exercise: ex('Barbell Hip Thrust'), targetSets: 4, targetReps: 8, order: 1 },
      { id: 'r-gh-2', exercise: ex('Barbell Romanian Deadlift'), targetSets: 4, targetReps: 8, order: 2 },
      { id: 'r-gh-3', exercise: ex('Lying Leg Curl Machine'), targetSets: 3, targetReps: 12, order: 3 },
      { id: 'r-gh-4', exercise: ex('Seated Leg Curl Machine'), targetSets: 3, targetReps: 12, order: 4 },
      { id: 'r-gh-5', exercise: ex('Cable Glute Kickback'), targetSets: 3, targetReps: 15, order: 5 },
      { id: 'r-gh-6', exercise: ex('Back Extension'), targetSets: 3, targetReps: 15, order: 6 },
    ],
  },
  {
    id: 'r-arms-shoulders',
    name: 'Arms + Shoulders Pump',
    description: 'Pump-focused • Delts, biceps, and triceps',
    createdAt: new Date(),
    exercises: [
      { id: 'r-asp-1', exercise: ex('Dumbbell Shoulder Press'), targetSets: 4, targetReps: 10, order: 1 },
      { id: 'r-asp-2', exercise: ex('Dumbbell Lateral Raise'), targetSets: 4, targetReps: 15, order: 2 },
      { id: 'r-asp-3', exercise: ex('Cable Face Pull'), targetSets: 3, targetReps: 15, order: 3 },
      { id: 'r-asp-4', exercise: ex('EZ-Bar Bicep Curl'), targetSets: 3, targetReps: 10, order: 4 },
      { id: 'r-asp-5', exercise: ex('Dumbbell Hammer Curl'), targetSets: 3, targetReps: 12, order: 5 },
      { id: 'r-asp-6', exercise: ex('Cable Rope Pushdown'), targetSets: 3, targetReps: 12, order: 6 },
      { id: 'r-asp-7', exercise: ex('Cable Overhead Rope Extension'), targetSets: 3, targetReps: 12, order: 7 },
    ],
  },
  {
    id: 'r-conditioning-bodyweight',
    name: 'Conditioning / Cardio + Bodyweight',
    description: 'High-intensity conditioning • Cardio and bodyweight circuits',
    createdAt: new Date(),
    exercises: [
      { id: 'r-cond-1', exercise: ex('Jump Squats'), targetSets: 3, targetReps: 20, order: 1 },
      { id: 'r-cond-2', exercise: ex('Burpees'), targetSets: 3, targetReps: 15, order: 2 },
      { id: 'r-cond-3', exercise: ex('Mountain Climbers'), targetSets: 3, targetReps: 30, order: 3 },
      { id: 'r-cond-4', exercise: ex('Plank Jacks'), targetSets: 3, targetReps: 25, order: 4 },
      { id: 'r-cond-5', exercise: ex('Rowing Machine'), targetSets: 3, targetReps: 500, order: 5 },
    ],
  },
];

export const muscleGroupColors: Record<MuscleGroup, string> = {
  chest: 'bg-red-500/20 text-red-400',
  back: 'bg-blue-500/20 text-blue-400',
  shoulders: 'bg-purple-600/20 text-purple-500',
  biceps: 'bg-green-500/20 text-green-400',
  triceps: 'bg-yellow-500/20 text-yellow-400',
  quads: 'bg-orange-500/20 text-orange-400',
  hamstrings: 'bg-violet-500/20 text-violet-400',
  glutes: 'bg-rose-500/20 text-rose-400',
  calves: 'bg-amber-500/20 text-amber-400',
  forearms: 'bg-emerald-500/20 text-emerald-400',
  core: 'bg-pink-500/20 text-pink-400',
  cardio: 'bg-cyan-500/20 text-cyan-400',
  other: 'bg-slate-500/20 text-slate-400',
};
