-- ============================================================
-- The System — Remote Supabase PostgreSQL Schema
-- Run this in your Supabase SQL Editor to enable cloud sync.
-- ============================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL DEFAULT 'Hunter',
  age INTEGER,
  height_cm REAL,
  weight_kg REAL,
  sex TEXT,
  activity_level TEXT,
  bmr REAL,
  tdee REAL,
  daily_calories REAL,
  protein_g REAL,
  carbs_g REAL,
  fat_g REAL,
  level INTEGER NOT NULL DEFAULT 1,
  total_xp INTEGER NOT NULL DEFAULT 0,
  rank TEXT NOT NULL DEFAULT 'E',
  str_xp INTEGER NOT NULL DEFAULT 0,
  vit_xp INTEGER NOT NULL DEFAULT 0,
  agi_xp INTEGER NOT NULL DEFAULT 0,
  int_xp INTEGER NOT NULL DEFAULT 0,
  per_xp INTEGER NOT NULL DEFAULT 0,
  title TEXT,
  onboarding_complete INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Quests Table
CREATE TABLE IF NOT EXISTS public.quests (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'custom',
  xp_reward INTEGER NOT NULL DEFAULT 10,
  stat_affected TEXT NOT NULL DEFAULT 'VIT',
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_completed INTEGER NOT NULL DEFAULT 0,
  is_auto_generated INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Quest Logs Table
CREATE TABLE IF NOT EXISTS public.quest_logs (
  id UUID PRIMARY KEY,
  quest_id UUID REFERENCES public.quests(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_earned INTEGER NOT NULL,
  stat_affected TEXT NOT NULL,
  photo_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Workout Plans Table
CREATE TABLE IF NOT EXISTS public.workout_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  weeks INTEGER NOT NULL DEFAULT 4,
  focus_stats TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Workouts Table
CREATE TABLE IF NOT EXISTS public.workouts (
  id TEXT PRIMARY KEY,
  plan_id TEXT REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  week INTEGER NOT NULL,
  day INTEGER NOT NULL,
  exercises_json TEXT NOT NULL DEFAULT '[]',
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  xp_value INTEGER NOT NULL DEFAULT 50,
  stats TEXT NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Workout Logs Table
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id UUID PRIMARY KEY,
  workout_id TEXT REFERENCES public.workouts(id) ON DELETE CASCADE,
  plan_id TEXT REFERENCES public.workout_plans(id) ON DELETE CASCADE,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  xp_earned INTEGER NOT NULL,
  duration_actual INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Meals Table
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  calories REAL NOT NULL DEFAULT 0,
  protein_g REAL NOT NULL DEFAULT 0,
  carbs_g REAL NOT NULL DEFAULT 0,
  fat_g REAL NOT NULL DEFAULT 0,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  duration_min INTEGER NOT NULL DEFAULT 0,
  met_value REAL NOT NULL DEFAULT 3.0,
  calories_burned REAL NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  stat_affected TEXT NOT NULL DEFAULT 'VIT',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Stats History Table
CREATE TABLE IF NOT EXISTS public.stats_history (
  id UUID PRIMARY KEY,
  stat TEXT NOT NULL,
  xp_gained INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Streaks Table
CREATE TABLE IF NOT EXISTS public.streaks (
  id UUID PRIMARY KEY,
  type TEXT NOT NULL,
  current_count INTEGER NOT NULL DEFAULT 0,
  longest_count INTEGER NOT NULL DEFAULT 0,
  last_activity_date TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stats_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

-- Allow public/anon access for initial single-user development
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to quests" ON public.quests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to quest_logs" ON public.quest_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to workout_plans" ON public.workout_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to workouts" ON public.workouts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to workout_logs" ON public.workout_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to meals" ON public.meals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to activities" ON public.activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to stats_history" ON public.stats_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to streaks" ON public.streaks FOR ALL USING (true) WITH CHECK (true);
