// ============================================================
// Database Schema — SQL DDL for all local tables
// ============================================================

/**
 * All CREATE TABLE statements for the local SQLite database.
 * Every table (except sync_metadata) has:
 *   - id TEXT PRIMARY KEY (UUID)
 *   - updated_at TEXT NOT NULL (ISO 8601)
 *   - synced INTEGER NOT NULL DEFAULT 0
 */
export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;

  -- Player profile: body stats, nutrition targets, RPG stats
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY NOT NULL,
    username TEXT NOT NULL DEFAULT 'Hunter',
    age INTEGER,
    height_cm REAL,
    weight_kg REAL,
    sex TEXT,
    activity_level TEXT,
    goal_type TEXT NOT NULL DEFAULT 'maintain',
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
    selected_plan TEXT,
    plan_start_date TEXT,
    onboarding_complete INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Quest definitions (daily + custom)
  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'custom',
    xp_reward INTEGER NOT NULL DEFAULT 10,
    stat_affected TEXT NOT NULL DEFAULT 'VIT',
    due_date TEXT NOT NULL,
    is_completed INTEGER NOT NULL DEFAULT 0,
    is_auto_generated INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Quest completion history
  CREATE TABLE IF NOT EXISTS quest_logs (
    id TEXT PRIMARY KEY NOT NULL,
    quest_id TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    stat_affected TEXT NOT NULL,
    photo_url TEXT,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (quest_id) REFERENCES quests(id)
  );

  -- Workout plan metadata (seeded with 3 plans)
  CREATE TABLE IF NOT EXISTS workout_plans (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    weeks INTEGER NOT NULL DEFAULT 4,
    focus_stats TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Individual workout definitions within plans
  CREATE TABLE IF NOT EXISTS workouts (
    id TEXT PRIMARY KEY NOT NULL,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL,
    week INTEGER NOT NULL,
    day INTEGER NOT NULL,
    exercises_json TEXT NOT NULL DEFAULT '[]',
    difficulty TEXT NOT NULL DEFAULT 'beginner',
    xp_value INTEGER NOT NULL DEFAULT 50,
    stats TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
  );

  -- Workout completion log
  CREATE TABLE IF NOT EXISTS workout_logs (
    id TEXT PRIMARY KEY NOT NULL,
    workout_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    completed_at TEXT NOT NULL,
    xp_earned INTEGER NOT NULL,
    duration_actual INTEGER,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (workout_id) REFERENCES workouts(id),
    FOREIGN KEY (plan_id) REFERENCES workout_plans(id)
  );

  -- Meal log entries
  CREATE TABLE IF NOT EXISTS meals (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    calories REAL NOT NULL DEFAULT 0,
    protein_g REAL NOT NULL DEFAULT 0,
    carbs_g REAL NOT NULL DEFAULT 0,
    fat_g REAL NOT NULL DEFAULT 0,
    logged_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Activity/exercise log
  CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL DEFAULT 'other',
    description TEXT,
    duration_min INTEGER NOT NULL DEFAULT 0,
    met_value REAL NOT NULL DEFAULT 3.0,
    calories_burned REAL NOT NULL DEFAULT 0,
    xp_earned INTEGER NOT NULL DEFAULT 0,
    stat_affected TEXT NOT NULL DEFAULT 'VIT',
    logged_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- XP gain audit trail (for charting stat growth over time)
  CREATE TABLE IF NOT EXISTS stats_history (
    id TEXT PRIMARY KEY NOT NULL,
    stat TEXT NOT NULL,
    xp_gained INTEGER NOT NULL,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    logged_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Daily Step Tracking
  CREATE TABLE IF NOT EXISTS daily_steps (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL UNIQUE,
    steps INTEGER NOT NULL DEFAULT 0,
    target_steps INTEGER NOT NULL DEFAULT 10000,
    distance_km REAL NOT NULL DEFAULT 0,
    calories_burned REAL NOT NULL DEFAULT 0,
    is_goal_reached INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Streak tracking
  CREATE TABLE IF NOT EXISTS streaks (
    id TEXT PRIMARY KEY NOT NULL,
    type TEXT NOT NULL,
    current_count INTEGER NOT NULL DEFAULT 0,
    longest_count INTEGER NOT NULL DEFAULT 0,
    last_activity_date TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    synced INTEGER NOT NULL DEFAULT 0
  );

  -- Sync metadata (key-value store for sync state)
  CREATE TABLE IF NOT EXISTS sync_metadata (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`;


export const SYNCABLE_TABLES = [
  'profiles',
  'quests',
  'quest_logs',
  'workout_plans',
  'workouts',
  'workout_logs',
  'meals',
  'activities',
  'stats_history',
  'streaks',
  'daily_steps',
] as const;

export type SyncableTable = (typeof SYNCABLE_TABLES)[number];
