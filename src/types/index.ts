// ============================================================
// The System — Type Definitions
// ============================================================

// --- Enums ---

export enum Stat {
  STR = 'STR',
  VIT = 'VIT',
  AGI = 'AGI',
  INT = 'INT',
  PER = 'PER',
}

export enum Rank {
  E = 'E',
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S',
}

export enum QuestCategory {
  FITNESS = 'fitness',
  STUDY = 'study',
  FOOD = 'food',
  CUSTOM = 'custom',
}

export enum ActivityType {
  RUNNING = 'running',
  WALKING = 'walking',
  CYCLING = 'cycling',
  SWIMMING = 'swimming',
  LIFTING = 'lifting',
  HIIT = 'hiit',
  YOGA = 'yoga',
  STUDY = 'study',
  MEDITATION = 'meditation',
  OTHER = 'other',
}

export type Sex = 'male' | 'female';

export type GoalType = 'lose_weight' | 'maintain' | 'gain_weight';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'exceedingly_active';

export type StreakType = 'daily_quest' | 'workout' | 'login' | 'meal_log';

export type SourceType = 'quest' | 'workout' | 'activity' | 'meal';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

// --- Database Row Interfaces ---
// Every table (except sync_metadata) has: id, updated_at, synced

export interface Profile {
  id: string;
  username: string;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  sex: Sex | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType;
  bmr: number | null;
  tdee: number | null;
  daily_calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  level: number;
  total_xp: number;
  rank: Rank;
  str_xp: number;
  vit_xp: number;
  agi_xp: number;
  int_xp: number;
  per_xp: number;
  title: string | null;
  onboarding_complete: number; // 0 or 1
  updated_at: string;
  synced: number; // 0 or 1
}

export interface Quest {
  id: string;
  title: string;
  description: string | null;
  category: QuestCategory;
  xp_reward: number;
  stat_affected: Stat;
  due_date: string;
  is_completed: number; // 0 or 1
  is_auto_generated: number; // 0 or 1
  updated_at: string;
  synced: number;
}

export interface QuestLog {
  id: string;
  quest_id: string;
  completed_at: string;
  xp_earned: number;
  stat_affected: Stat;
  photo_url: string | null;
  updated_at: string;
  synced: number;
}

export interface WorkoutPlan {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  weeks: number;
  focus_stats: string; // JSON array of Stat, e.g. '["STR","VIT"]'
  updated_at: string;
  synced: number;
}

export interface Exercise {
  name: string;
  sets?: number;
  reps?: number;
  duration_min?: number;
}

export interface Workout {
  id: string;
  plan_id: string;
  name: string;
  week: number;
  day: number;
  exercises_json: string; // JSON array of Exercise
  difficulty: Difficulty;
  xp_value: number;
  stats: string; // JSON array of Stat, e.g. '["STR","VIT"]'
  updated_at: string;
  synced: number;
}

export interface WorkoutLog {
  id: string;
  workout_id: string;
  plan_id: string;
  completed_at: string;
  xp_earned: number;
  duration_actual: number | null;
  updated_at: string;
  synced: number;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
  updated_at: string;
  synced: number;
}

export interface Activity {
  id: string;
  type: ActivityType;
  description: string | null;
  duration_min: number;
  met_value: number;
  calories_burned: number;
  xp_earned: number;
  stat_affected: Stat;
  logged_at: string;
  updated_at: string;
  synced: number;
}

export interface StatsHistory {
  id: string;
  stat: Stat;
  xp_gained: number;
  source_type: SourceType;
  source_id: string;
  logged_at: string;
  updated_at: string;
  synced: number;
}

export interface Streak {
  id: string;
  type: StreakType;
  current_count: number;
  longest_count: number;
  last_activity_date: string;
  updated_at: string;
  synced: number;
}

export interface SyncMetadata {
  key: string;
  value: string;
}

// --- Utility Types ---

export interface XPProgress {
  currentLevel: number;
  currentRank: Rank;
  xpInCurrentLevel: number;
  xpNeededForNextLevel: number;
  percentage: number;
  totalXP: number;
}

export interface MacroTargets {
  daily_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DailyCalorieSummary {
  consumed: number;
  burned: number;
  target: number;
  net: number;
  protein_consumed: number;
  carbs_consumed: number;
  fat_consumed: number;
}

export interface OnboardingData {
  age: number;
  height_cm: number;
  weight_kg: number;
  sex: Sex;
  activity_level: ActivityLevel;
  goal_type: GoalType;
}
