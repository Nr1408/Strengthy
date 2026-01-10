export type MuscleGroup = 
  | 'chest' 
  | 'back' 
  | 'shoulders' 
  | 'biceps' 
  | 'triceps' 
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'forearms'
  | 'core' 
  | 'cardio';

export type CardioMode =
  | 'treadmill'
  | 'bike'
  | 'elliptical'
  | 'stairs'
  | 'row';

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  description?: string;
  createdAt: Date;
}

export interface WorkoutSet {
  id: string;
  reps: number;
  weight: number;
  isPR: boolean;
  completed: boolean;
  unit?: 'lbs' | 'kg';
  // Detailed PR types (optional for unsaved/local sets)
  absWeightPR?: boolean;
  e1rmPR?: boolean;
  volumePR?: boolean;
  repPR?: boolean;
  type?: 'W' | 'S' | 'F' | 'D';
  rpe?: number;
  // Optional cardio-specific fields (when exercise.muscleGroup === 'cardio')
  cardioMode?: CardioMode;
  // duration in seconds
  cardioDurationSeconds?: number;
  // primary distance metric (meters or converted from km/mi on client)
  cardioDistance?: number;
  // optional display unit for cardio distance
  cardioDistanceUnit?: 'km' | 'mile';
  // second scalar metric (level, incline, SPM, etc.)
  cardioStat?: number;
  // Detailed cardio PR flags
  cardioDistancePR?: boolean;
  cardioPacePR?: boolean;
  cardioAscentPR?: boolean;
  cardioIntensityPR?: boolean;
  cardioSplitPR?: boolean;
}

export interface WorkoutExercise {
  id: string;
  exercise: Exercise;
  sets: WorkoutSet[];
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  date: Date;
  exercises: WorkoutExercise[];
  duration?: number; // in minutes
  notes?: string;
  completed: boolean;
}

export interface RoutineExercise {
  id: string;
  exercise: Exercise;
  targetSets: number;
  targetReps: number;
  order: number;
}

export interface Routine {
  id: string;
  name: string;
  description?: string;
  exercises: RoutineExercise[];
  createdAt: Date;
}
