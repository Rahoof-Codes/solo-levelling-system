// ============================================================
// Database Operations — Local-First CRUD & XP Progression
// ============================================================

import { type SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import {
  type Profile,
  type Quest,
  type Meal,
  type Activity,
  type StatsHistory,
  type Streak,
  type DailyCalorieSummary,
  type OnboardingData,
  type WorkoutPlan,
  type Workout,
  type WorkoutLog,
  type GoalType,
  Stat,
  Rank,
  QuestCategory,
  ActivityType,
  SourceType,
} from '@/types';
import { computeOnboardingResults } from '@/lib/calculations/bmr';
import { calculateLevel, calculateRank, RANK_INFO } from '@/lib/calculations/leveling';
import { calculateCaloriesBurned, calculateActivityXP, getMETValue, getActivityStat } from '@/lib/calculations/met';

// --- PROFILE OPERATIONS ---

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  return await db.getFirstAsync<Profile>('SELECT * FROM profiles LIMIT 1;');
}

export async function updateProfileOnboarding(
  db: SQLiteDatabase,
  data: OnboardingData & { username?: string }
): Promise<Profile> {
  const { bmr, tdee, macros } = computeOnboardingResults(data);
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE profiles SET
      username = COALESCE(?, username),
      age = ?,
      height_cm = ?,
      weight_kg = ?,
      sex = ?,
      activity_level = ?,
      goal_type = ?,
      bmr = ?,
      tdee = ?,
      daily_calories = ?,
      protein_g = ?,
      carbs_g = ?,
      fat_g = ?,
      onboarding_complete = 1,
      updated_at = ?,
      synced = 0
    WHERE id = (SELECT id FROM profiles LIMIT 1);`,
    [
      data.username ?? null,
      data.age,
      data.height_cm,
      data.weight_kg,
      data.sex,
      data.activity_level,
      data.goal_type,
      bmr,
      tdee,
      macros.daily_calories,
      macros.protein_g,
      macros.carbs_g,
      macros.fat_g,
      now,
    ]
  );

  const profile = await getProfile(db);
  if (!profile) throw new Error('Profile not found after onboarding update');
  return profile;
}

export async function updateProfileGoal(
  db: SQLiteDatabase,
  goalType: GoalType
): Promise<Profile> {
  const current = await getProfile(db);
  if (!current) throw new Error('Profile not found');

  const { calculateMacros } = require('@/lib/calculations/bmr');
  const tdee = current.tdee ?? 2000;
  const macros = calculateMacros(tdee, goalType);
  const now = new Date().toISOString();

  await db.runAsync(
    `UPDATE profiles SET
      goal_type = ?,
      daily_calories = ?,
      protein_g = ?,
      carbs_g = ?,
      fat_g = ?,
      updated_at = ?,
      synced = 0
    WHERE id = ?;`,
    [
      goalType,
      macros.daily_calories,
      macros.protein_g,
      macros.carbs_g,
      macros.fat_g,
      now,
      current.id,
    ]
  );

  const updated = (await getProfile(db))!;
  return updated;
}

// --- XP & STAT PROGRESSION ---

export async function awardXP(
  db: SQLiteDatabase,
  stat: Stat,
  xpAmount: number,
  sourceType: SourceType,
  sourceId: string
): Promise<{ newProfile: Profile; leveledUp: boolean; rankChanged: boolean }> {
  const currentProfile = await getProfile(db);
  if (!currentProfile) throw new Error('Profile does not exist');

  const oldLevel = currentProfile.level;
  const oldRank = currentProfile.rank;

  const newTotalXP = currentProfile.total_xp + xpAmount;
  const newLevel = calculateLevel(newTotalXP);
  const newRank = calculateRank(newLevel);
  const newTitle = RANK_INFO[newRank].title;

  const statColumn = `${stat.toLowerCase()}_xp`;
  const currentStatXP = (currentProfile as any)[statColumn] || 0;
  const newStatXP = currentStatXP + xpAmount;
  const now = new Date().toISOString();

  // 1. Update Profile
  await db.runAsync(
    `UPDATE profiles SET
      total_xp = ?,
      level = ?,
      rank = ?,
      title = ?,
      ${statColumn} = ?,
      updated_at = ?,
      synced = 0
    WHERE id = ?;`,
    [newTotalXP, newLevel, newRank, newTitle, newStatXP, now, currentProfile.id]
  );

  // 2. Insert into Stats History (XP gain audit trail)
  const historyId = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO stats_history (id, stat, xp_gained, source_type, source_id, logged_at, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
    [historyId, stat, xpAmount, sourceType, sourceId, now, now]
  );

  const updatedProfile = (await getProfile(db))!;
  return {
    newProfile: updatedProfile,
    leveledUp: newLevel > oldLevel,
    rankChanged: newRank !== oldRank,
  };
}

// --- QUESTS OPERATIONS ---

export async function getQuestsForDate(db: SQLiteDatabase, dateStr?: string): Promise<Quest[]> {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  return await db.getAllAsync<Quest>(
    'SELECT * FROM quests WHERE due_date = ? ORDER BY is_completed ASC, xp_reward DESC;',
    [date]
  );
}

export async function createQuest(
  db: SQLiteDatabase,
  data: {
    title: string;
    description?: string;
    category: QuestCategory;
    xp_reward: number;
    stat_affected: Stat;
    due_date?: string;
  }
): Promise<Quest> {
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  const dueDate = data.due_date ?? now.split('T')[0];

  await db.runAsync(
    `INSERT INTO quests (id, title, description, category, xp_reward, stat_affected, due_date, is_completed, is_auto_generated, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, ?, 0);`,
    [id, data.title, data.description ?? null, data.category, data.xp_reward, data.stat_affected, dueDate, now]
  );

  const created = await db.getFirstAsync<Quest>('SELECT * FROM quests WHERE id = ?;', [id]);
  return created!;
}

export async function completeQuest(
  db: SQLiteDatabase,
  questId: string,
  photoUrl?: string
): Promise<{ quest: Quest; xpResult: { newProfile: Profile; leveledUp: boolean; rankChanged: boolean } }> {
  const quest = await db.getFirstAsync<Quest>('SELECT * FROM quests WHERE id = ?;', [questId]);
  if (!quest) throw new Error('Quest not found');
  if (quest.is_completed) throw new Error('Quest is already completed');

  const now = new Date().toISOString();

  // 1. Mark quest completed
  await db.runAsync(
    'UPDATE quests SET is_completed = 1, updated_at = ?, synced = 0 WHERE id = ?;',
    [now, questId]
  );

  // 2. Insert into quest logs
  const logId = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO quest_logs (id, quest_id, completed_at, xp_earned, stat_affected, photo_url, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
    [logId, questId, now, quest.xp_reward, quest.stat_affected, photoUrl ?? null, now]
  );

  // 3. Award XP & update profile
  const xpResult = await awardXP(db, quest.stat_affected, quest.xp_reward, 'quest', questId);

  // 4. Update Daily Quest Streak
  await updateStreak(db, 'daily_quest');

  const updatedQuest = (await db.getFirstAsync<Quest>('SELECT * FROM quests WHERE id = ?;', [questId]))!;
  return { quest: updatedQuest, xpResult };
}

// --- WORKOUT OPERATIONS ---

export async function getWorkoutPlans(db: SQLiteDatabase): Promise<WorkoutPlan[]> {
  return await db.getAllAsync<WorkoutPlan>('SELECT * FROM workout_plans ORDER BY weeks ASC;');
}

export async function getWorkoutsForPlan(db: SQLiteDatabase, planId: string): Promise<Workout[]> {
  return await db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE plan_id = ? ORDER BY week ASC, day ASC;',
    [planId]
  );
}

export async function completeWorkout(
  db: SQLiteDatabase,
  workoutId: string,
  durationActual?: number
): Promise<{ log: WorkoutLog; xpResult: { newProfile: Profile; leveledUp: boolean; rankChanged: boolean } }> {
  const { log, pendingXP } = await completeWorkoutWithoutXP(db, workoutId, durationActual);
  const xpResult = await claimWorkoutXP(db, pendingXP.workoutId, pendingXP.stat, pendingXP.xp);
  return { log, xpResult };
}

/**
 * Complete a workout without awarding XP yet (two-step flow).
 * Returns the log and pending XP info for the claim modal.
 */
export async function completeWorkoutWithoutXP(
  db: SQLiteDatabase,
  workoutId: string,
  durationActual?: number
): Promise<{ log: WorkoutLog; pendingXP: { xp: number; stat: Stat; workoutId: string; workoutName: string } }> {
  const workout = await db.getFirstAsync<Workout>('SELECT * FROM workouts WHERE id = ?;', [workoutId]);
  if (!workout) throw new Error('Workout not found');

  const now = new Date().toISOString();
  const stats: Stat[] = JSON.parse(workout.stats || '["STR"]');
  const primaryStat = stats[0] || Stat.STR;

  // 1. Insert into workout logs
  const logId = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO workout_logs (id, workout_id, plan_id, completed_at, xp_earned, duration_actual, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
    [logId, workout.id, workout.plan_id, now, workout.xp_value, durationActual ?? null, now]
  );

  // 2. Update workout streak
  await updateStreak(db, 'workout');

  const log = (await db.getFirstAsync<WorkoutLog>('SELECT * FROM workout_logs WHERE id = ?;', [logId]))!;
  return {
    log,
    pendingXP: {
      xp: workout.xp_value,
      stat: primaryStat,
      workoutId: workout.id,
      workoutName: workout.name,
    },
  };
}

/**
 * Claim XP for a previously completed workout.
 */
export async function claimWorkoutXP(
  db: SQLiteDatabase,
  workoutId: string,
  stat: Stat,
  xpAmount: number
): Promise<{ newProfile: Profile; leveledUp: boolean; rankChanged: boolean }> {
  return await awardXP(db, stat, xpAmount, 'workout', workoutId);
}

// --- MEALS & CALORIE OPERATIONS ---

export async function logMeal(
  db: SQLiteDatabase,
  data: {
    name: string;
    calories: number;
    protein_g?: number;
    carbs_g?: number;
    fat_g?: number;
  }
): Promise<Meal> {
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO meals (id, name, calories, protein_g, carbs_g, fat_g, logged_at, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0);`,
    [
      id,
      data.name,
      data.calories,
      data.protein_g ?? 0,
      data.carbs_g ?? 0,
      data.fat_g ?? 0,
      now,
      now,
    ]
  );

  await updateStreak(db, 'meal_log');

  const meal = await db.getFirstAsync<Meal>('SELECT * FROM meals WHERE id = ?;', [id]);
  return meal!;
}

export async function getTodayMeals(db: SQLiteDatabase): Promise<Meal[]> {
  const today = new Date().toISOString().split('T')[0];
  return await db.getAllAsync<Meal>(
    "SELECT * FROM meals WHERE date(logged_at) = date(?) ORDER BY logged_at DESC;",
    [today]
  );
}

export async function getDailyCalorieSummary(db: SQLiteDatabase): Promise<DailyCalorieSummary> {
  const profile = await getProfile(db);
  const target = profile?.daily_calories ?? 2000;
  const today = new Date().toISOString().split('T')[0];

  const mealStats = await db.getFirstAsync<{
    total_cal: number | null;
    total_p: number | null;
    total_c: number | null;
    total_f: number | null;
  }>(
    `SELECT
      SUM(calories) as total_cal,
      SUM(protein_g) as total_p,
      SUM(carbs_g) as total_c,
      SUM(fat_g) as total_f
     FROM meals
     WHERE date(logged_at) = date(?);`,
    [today]
  );

  const actStats = await db.getFirstAsync<{ total_burned: number | null }>(
    `SELECT SUM(calories_burned) as total_burned FROM activities WHERE date(logged_at) = date(?);`,
    [today]
  );

  const consumed = mealStats?.total_cal ?? 0;
  const burned = actStats?.total_burned ?? 0;

  return {
    consumed,
    burned,
    target,
    net: consumed - burned,
    protein_consumed: mealStats?.total_p ?? 0,
    carbs_consumed: mealStats?.total_c ?? 0,
    fat_consumed: mealStats?.total_f ?? 0,
  };
}

// --- ACTIVITIES & EXERCISE OPERATIONS ---

export async function logActivity(
  db: SQLiteDatabase,
  data: {
    type: ActivityType;
    description?: string;
    duration_min: number;
  }
): Promise<{ activity: Activity; xpResult: { newProfile: Profile; leveledUp: boolean; rankChanged: boolean } }> {
  const { activity, pendingXP } = await logActivityWithoutXP(db, data);
  const xpResult = await claimActivityXP(db, activity.id, pendingXP.stat, pendingXP.xp);
  return { activity, xpResult };
}

/**
 * Log an activity without awarding XP yet (two-step flow).
 * Returns the activity and pending XP info for the claim modal.
 */
export async function logActivityWithoutXP(
  db: SQLiteDatabase,
  data: {
    type: ActivityType;
    description?: string;
    duration_min: number;
  }
): Promise<{ activity: Activity; pendingXP: { xp: number; stat: Stat; calories: number } }> {
  const profile = await getProfile(db);
  const weight_kg = profile?.weight_kg ?? 70;
  const met = getMETValue(data.type);
  const caloriesBurned = calculateCaloriesBurned(met, weight_kg, data.duration_min);
  const xpEarned = calculateActivityXP(data.duration_min, met);
  const stat = getActivityStat(data.type);

  const id = Crypto.randomUUID();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO activities (id, type, description, duration_min, met_value, calories_burned, xp_earned, stat_affected, logged_at, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
    [
      id,
      data.type,
      data.description ?? null,
      data.duration_min,
      met,
      caloriesBurned,
      xpEarned,
      stat,
      now,
      now,
    ]
  );

  const activity = (await db.getFirstAsync<Activity>('SELECT * FROM activities WHERE id = ?;', [id]))!;
  return { activity, pendingXP: { xp: xpEarned, stat, calories: caloriesBurned } };
}

/**
 * Claim XP for a previously logged activity.
 */
export async function claimActivityXP(
  db: SQLiteDatabase,
  activityId: string,
  stat: Stat,
  xpAmount: number
): Promise<{ newProfile: Profile; leveledUp: boolean; rankChanged: boolean }> {
  return await awardXP(db, stat, xpAmount, 'activity', activityId);
}

export async function getTodayActivities(db: SQLiteDatabase): Promise<Activity[]> {
  const today = new Date().toISOString().split('T')[0];
  return await db.getAllAsync<Activity>(
    "SELECT * FROM activities WHERE date(logged_at) = date(?) ORDER BY logged_at DESC;",
    [today]
  );
}

// --- STREAK MANAGEMENT ---

export async function updateStreak(db: SQLiteDatabase, type: string): Promise<Streak> {
  const streak = await db.getFirstAsync<Streak>('SELECT * FROM streaks WHERE type = ?;', [type]);
  const today = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  if (!streak) {
    const id = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO streaks (id, type, current_count, longest_count, last_activity_date, updated_at, synced)
       VALUES (?, ?, 1, 1, ?, ?, 0);`,
      [id, type, today, now]
    );
    return (await db.getFirstAsync<Streak>('SELECT * FROM streaks WHERE id = ?;', [id]))!;
  }

  // If already updated today, do nothing
  if (streak.last_activity_date === today) {
    return streak;
  }

  // Calculate day difference
  const lastDate = streak.last_activity_date ? new Date(streak.last_activity_date) : null;
  const currentDate = new Date(today);
  const diffDays = lastDate
    ? Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 3600 * 24))
    : 999;

  let newCurrent = streak.current_count;
  if (diffDays === 1) {
    // Consecutive day
    newCurrent += 1;
  } else if (diffDays > 1) {
    // Streak broken
    newCurrent = 1;
  } else if (!streak.last_activity_date) {
    newCurrent = 1;
  }

  const newLongest = Math.max(newCurrent, streak.longest_count);

  await db.runAsync(
    `UPDATE streaks SET
      current_count = ?,
      longest_count = ?,
      last_activity_date = ?,
      updated_at = ?,
      synced = 0
     WHERE id = ?;`,
    [newCurrent, newLongest, today, now, streak.id]
  );

  return (await db.getFirstAsync<Streak>('SELECT * FROM streaks WHERE id = ?;', [streak.id]))!;
}

export async function getStreaks(db: SQLiteDatabase): Promise<Streak[]> {
  return await db.getAllAsync<Streak>('SELECT * FROM streaks;');
}

// --- SYNC ENGINE HELPERS ---

export async function getUnsyncedRows<T>(db: SQLiteDatabase, tableName: string): Promise<T[]> {
  return await db.getAllAsync<T>(`SELECT * FROM ${tableName} WHERE synced = 0;`);
}

export async function markRowsSynced(
  db: SQLiteDatabase,
  tableName: string,
  ids: string[]
): Promise<void> {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE ${tableName} SET synced = 1 WHERE id IN (${placeholders});`,
    ids
  );
}

export async function getLastSyncedAt(db: SQLiteDatabase): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM sync_metadata WHERE key = 'last_synced_at';"
  );
  return row?.value ?? null;
}

export async function setLastSyncedAt(db: SQLiteDatabase, timestamp: string): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_metadata (key, value) VALUES ('last_synced_at', ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
    [timestamp]
  );
}

export async function upsertRemoteRows(
  db: SQLiteDatabase,
  tableName: string,
  rows: any[]
): Promise<void> {
  if (rows.length === 0) return;

  for (const row of rows) {
    // Last-write-wins: check local row's updated_at
    const local = await db.getFirstAsync<{ updated_at: string }>(
      `SELECT updated_at FROM ${tableName} WHERE id = ?;`,
      [row.id]
    );

    if (local && new Date(local.updated_at) > new Date(row.updated_at)) {
      // Local version is newer, skip remote overwrite
      continue;
    }

    const columns = Object.keys(row);
    const placeholders = columns.map(() => '?').join(',');
    const values = columns.map((col) => row[col]);

    const updateClauses = columns
      .filter((col) => col !== 'id')
      .map((col) => `${col} = excluded.${col}`)
      .join(', ');

    await db.runAsync(
      `INSERT INTO ${tableName} (${columns.join(',')}, synced)
       VALUES (${placeholders}, 1)
       ON CONFLICT(id) DO UPDATE SET ${updateClauses}, synced = 1;`,
      values
    );
  }
}
