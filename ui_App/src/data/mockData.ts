import { Exercise, Workout, Routine, MuscleGroup } from '@/types/workout';

export const mockExercises: Exercise[] = [
  {
    id: '1',
    name: 'Bench Press',
    muscleGroup: 'chest',
    description: 'Barbell bench press for chest development',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'Squat',
    muscleGroup: 'legs',
    description: 'Barbell back squat for leg strength',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'Deadlift',
    muscleGroup: 'back',
    description: 'Conventional deadlift for posterior chain',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    name: 'Overhead Press',
    muscleGroup: 'shoulders',
    description: 'Standing barbell press',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '5',
    name: 'Barbell Row',
    muscleGroup: 'back',
    description: 'Bent over barbell row',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '6',
    name: 'Pull-ups',
    muscleGroup: 'back',
    description: 'Bodyweight pull-ups',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '7',
    name: 'Dumbbell Curl',
    muscleGroup: 'biceps',
    description: 'Standing dumbbell curls',
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '8',
    name: 'Tricep Pushdown',
    muscleGroup: 'triceps',
    description: 'Cable tricep pushdown',
    createdAt: new Date('2024-01-01'),
  },
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

export const mockRoutines: Routine[] = [
  {
    id: '1',
    name: 'Push Day',
    description: 'Chest, shoulders, and triceps focused workout',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: '1', exercise: mockExercises[0], targetSets: 4, targetReps: 8, order: 1 },
      { id: '2', exercise: mockExercises[3], targetSets: 3, targetReps: 8, order: 2 },
      { id: '3', exercise: mockExercises[7], targetSets: 3, targetReps: 12, order: 3 },
    ],
  },
  {
    id: '2',
    name: 'Pull Day',
    description: 'Back and biceps focused workout',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: '4', exercise: mockExercises[2], targetSets: 3, targetReps: 5, order: 1 },
      { id: '5', exercise: mockExercises[4], targetSets: 4, targetReps: 8, order: 2 },
      { id: '6', exercise: mockExercises[5], targetSets: 3, targetReps: 10, order: 3 },
      { id: '7', exercise: mockExercises[6], targetSets: 3, targetReps: 12, order: 4 },
    ],
  },
  {
    id: '3',
    name: 'Leg Day',
    description: 'Lower body strength and hypertrophy',
    createdAt: new Date('2024-01-01'),
    exercises: [
      { id: '8', exercise: mockExercises[1], targetSets: 4, targetReps: 5, order: 1 },
    ],
  },
];

export const muscleGroupColors: Record<MuscleGroup, string> = {
  chest: 'bg-red-500/20 text-red-400',
  back: 'bg-blue-500/20 text-blue-400',
  shoulders: 'bg-purple-500/20 text-purple-400',
  biceps: 'bg-green-500/20 text-green-400',
  triceps: 'bg-yellow-500/20 text-yellow-400',
  legs: 'bg-orange-500/20 text-orange-400',
  core: 'bg-pink-500/20 text-pink-400',
  cardio: 'bg-cyan-500/20 text-cyan-400',
  'full-body': 'bg-indigo-500/20 text-indigo-400',
};
