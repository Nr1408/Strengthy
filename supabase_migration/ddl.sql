-- Supabase/Postgres DDL for Strengthy migration
-- Run in Supabase SQL editor or psql

-- Use Supabase's built-in `auth.users` (UUID) for authentication.
-- Do NOT create a local `auth_users` table when using Supabase Auth.
-- If you intend to keep a local users table, recreate one separately.

CREATE TABLE IF NOT EXISTS profiles (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  goals jsonb DEFAULT '[]'::jsonb,
  age integer,
  height numeric,
  height_unit text,
  current_weight numeric,
  goal_weight numeric,
  experience text,
  monthly_workouts integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exercises (
  id bigserial PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  muscle_group text,
  description text,
  custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (owner_id, name)
);

CREATE TABLE IF NOT EXISTS workouts (
  id bigserial PRIMARY KEY,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id bigserial PRIMARY KEY,
  workout_id bigint REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id bigint REFERENCES exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  reps integer NOT NULL,
  half_reps integer DEFAULT 0,
  weight numeric,
  unit text,
  is_pr boolean DEFAULT false,
  is_abs_weight_pr boolean DEFAULT false,
  is_e1rm_pr boolean DEFAULT false,
  is_volume_pr boolean DEFAULT false,
  is_rep_pr boolean DEFAULT false,
  set_type text,
  rpe numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (workout_id, exercise_id, set_number)
);

CREATE TABLE IF NOT EXISTS cardio_sets (
  id bigserial PRIMARY KEY,
  workout_id bigint REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id bigint REFERENCES exercises(id) ON DELETE CASCADE,
  set_number integer NOT NULL,
  mode text,
  duration_seconds integer,
  distance_meters numeric,
  floors integer,
  level numeric,
  split_seconds numeric,
  spm numeric,
  is_pr boolean DEFAULT false,
  is_distance_pr boolean DEFAULT false,
  is_pace_pr boolean DEFAULT false,
  is_ascent_pr boolean DEFAULT false,
  is_intensity_pr boolean DEFAULT false,
  is_split_pr boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (workout_id, exercise_id, set_number)
);

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id bigserial PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  is_used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX idx_password_reset_user_code ON password_reset_codes(user_id, code, created_at);
