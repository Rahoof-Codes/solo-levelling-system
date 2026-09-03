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
  type DailySteps,
  type OnboardingData,
  type WorkoutPlan,
  type Workout,
  type WorkoutLog,
  type GoalType,
  type PlanType,
  Stat,
  Rank,
  QuestCategory,
  ActivityType,
  SourceType,
} from '@/types';
import { computeOnboardingResults } from '@/lib/calculations/bmr';
import { calculateLevel, calculateRank, RANK_INFO } from '@/lib/calculations/leveling';
import { calculateCaloriesBurned, calculateActivityXP, getMETValue, getActivityStat } from '@/lib/calculations/met';
import { generateWorkoutsForPlan, PLAN_METADATA, getPlanPhaseInfo } from '@/data/workoutPlans';

// --- PROFILE OPERATIONS ---

export async function getProfile(db: SQLiteDatabase): Promise<Profile | null> {
  return await db.getFirstAsync<Profile>(
    'SELECT * FROM profiles ORDER BY total_xp DESC, level DESC, updated_at DESC LIMIT 1;'
  );
}

export async function deduplicateProfiles(db: SQLiteDatabase): Promise<void> {
  try {
    const profiles = await db.getAllAsync<{ id: string }>(
      'SELECT id FROM profiles ORDER BY total_xp DESC, level DESC, updated_at DESC;'
    );
    if (profiles.length > 1) {
      const bestId = profiles[0].id;
      await db.runAsync('DELETE FROM profiles WHERE id != ?;', [bestId]);
    }
  } catch (err) {
    console.warn('[DB] Profile deduplication error:', err);
  }
}

export async function updateProfileOnboarding(
  db: SQLiteDatabase,
  data: OnboardingData & { username?: string }
): Promise<Profile> {
  const { bmr, tdee, macros } = computeOnboardingResults(data);
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const effectivePlan: PlanType = data.selected_plan === '365day' ? '365day' : '100day';

  // 1. Defensive column migration: ensure all columns exist without depending on PRAGMA
  const columns = [
    'ALTER TABLE profiles ADD COLUMN goal_type TEXT NOT NULL DEFAULT "maintain";',
    'ALTER TABLE profiles ADD COLUMN selected_plan TEXT;',
    'ALTER TABLE profiles ADD COLUMN plan_start_date TEXT;',
    'ALTER TABLE profiles ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;',
  ];
  for (const sql of columns) {
    try {
      await db.execAsync(sql);
    } catch {
      // Column already exists
    }
  }

  // 2. Check if a profile exists; if not, INSERT; if yes, UPDATE
  const existing = await db.getFirstAsync<{ id: string }>('SELECT id FROM profiles LIMIT 1;');
  if (!existing) {
    let newId = `hunter-${Date.now()}`;
    try {
      if (typeof Crypto !== 'undefined' && Crypto.randomUUID) {
        newId = Crypto.randomUUID();
      }
    } catch {}

    await db.runAsync(
      `INSERT INTO profiles (
        id, username, age, height_cm, weight_kg, sex, activity_level, goal_type,
        bmr, tdee, daily_calories, protein_g, carbs_g, fat_g,
        level, total_xp, rank, str_xp, vit_xp, agi_xp, int_xp, per_xp,
        title, selected_plan, plan_start_date, onboarding_complete, updated_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 'E', 0, 0, 0, 0, 0, 'E-Rank Hunter', ?, ?, 1, ?, 0);`,
      [
        newId,
        data.username || 'Sung Jin-Woo',
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
        effectivePlan,
        today,
        now,
      ]
    );
  } else {
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
        selected_plan = ?,
        plan_start_date = ?,
        onboarding_complete = 1,
        updated_at = ?,
        synced = 0;`,
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
        effectivePlan,
        today,
        now,
      ]
    );
  }

  // 3. Fast batched seed of workouts for the selected plan (non-fatal)
  try {
    await seedWorkoutsForPlan(db, effectivePlan, today);
  } catch (seedErr) {
    console.error('[DB] seedWorkoutsForPlan non-fatal error:', seedErr);
  }

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

export async function deduplicateQuests(db: SQLiteDatabase, dateStr?: string): Promise<void> {
  try {
    const whereClause = dateStr ? 'WHERE due_date = ?' : '';
    const params = dateStr ? [dateStr] : [];

    const dupGroups = await db.getAllAsync<{ title_lower: string; due_date: string; total: number }>(
      `SELECT LOWER(TRIM(title)) as title_lower, due_date, COUNT(*) as total
       FROM quests
       ${whereClause}
       GROUP BY LOWER(TRIM(title)), due_date
       HAVING COUNT(*) > 1;`,
      params
    );

    for (const group of dupGroups) {
      const rows = await db.getAllAsync<{ id: string; is_completed: number; updated_at: string }>(
        `SELECT id, is_completed, updated_at FROM quests
         WHERE LOWER(TRIM(title)) = ? AND due_date = ?
         ORDER BY is_completed DESC, updated_at DESC;`,
        [group.title_lower, group.due_date]
      );

      if (rows.length <= 1) continue;

      const keep = rows[0];
      const duplicates = rows.slice(1);

      for (const dup of duplicates) {
        // Re-point any quest_logs referencing dup.id to keep.id
        await db.runAsync('UPDATE quest_logs SET quest_id = ? WHERE quest_id = ?;', [keep.id, dup.id]);
        // Delete the duplicate quest
        await db.runAsync('DELETE FROM quests WHERE id = ?;', [dup.id]);
      }
    }
  } catch (err) {
    console.warn('[DB] Quest deduplication error:', err);
  }
}

export async function ensureDaily10kStepQuest(db: SQLiteDatabase, dateStr?: string): Promise<Quest> {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();
  const deterministicId = `quest-daily-steps-${date}`;

  let quest = await db.getFirstAsync<Quest>(
    "SELECT * FROM quests WHERE due_date = ? AND (title LIKE '%10,000 Steps%' OR id = ?) ORDER BY is_completed DESC, updated_at DESC LIMIT 1;",
    [date, deterministicId]
  );

  if (!quest) {
    await db.runAsync(
      `INSERT INTO quests (id, title, description, category, xp_reward, stat_affected, due_date, is_completed, is_auto_generated, updated_at, synced)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 1);`,
      [
        deterministicId,
        '10,000 Steps Daily Quest',
        'Complete 10,000 steps of movement today to boost AGI & VIT stats',
        QuestCategory.FITNESS,
        50,
        Stat.AGI,
        date,
        now,
      ]
    );
    quest = await db.getFirstAsync<Quest>('SELECT * FROM quests WHERE id = ?;', [deterministicId]);
  }

  return quest!;
}

export async function getQuestsForDate(db: SQLiteDatabase, dateStr?: string): Promise<Quest[]> {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  await ensureDaily10kStepQuest(db, date);
  await deduplicateQuests(db, date);
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

// --- WORKOUT PLAN OPERATIONS (Calendar-Based) ---

/**
 * Seed all workouts for a selected plan into the database.
 * Uses fast multi-row batch inserts in chunks of 20 to complete in <100ms.
 */
export async function seedWorkoutsForPlan(
  db: SQLiteDatabase,
  planType: PlanType,
  startDate: string
): Promise<void> {
  const effectivePlan: PlanType = planType === '365day' ? '365day' : '100day';
  const now = new Date().toISOString();
  const meta = PLAN_METADATA[effectivePlan];
  const workoutSeeds = generateWorkoutsForPlan(effectivePlan);

  try {
    await db.execAsync('PRAGMA foreign_keys = OFF;');
    await db.execAsync('DELETE FROM workouts;');
    await db.execAsync('DELETE FROM workout_plans;');
    await db.execAsync('PRAGMA foreign_keys = ON;');
  } catch (e) {
    console.warn('[DB] Clear workouts warning:', e);
  }

  // Insert plan metadata
  await db.runAsync(
    `INSERT OR REPLACE INTO workout_plans (id, name, description, difficulty, weeks, focus_stats, updated_at, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
    [
      meta.id,
      meta.name,
      meta.description,
      meta.difficulty,
      Math.ceil(meta.totalDays / 7),
      JSON.stringify(meta.focusStats),
      now,
    ]
  );

  // Fast chunked insert (20 rows per SQL statement)
  for (let i = 0; i < workoutSeeds.length; i += 20) {
    const chunk = workoutSeeds.slice(i, i + 20);
    const placeholders = chunk.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)').join(', ');
    const params: any[] = [];
    for (const w of chunk) {
      params.push(
        w.id,
        w.planId,
        w.name,
        w.week,
        w.dayNumber, // Use dayNumber as the 'day' field (absolute day 1–365)
        JSON.stringify(w.exercises),
        w.difficulty,
        w.xpValue,
        JSON.stringify(w.stats),
        now
      );
    }
    await db.runAsync(
      `INSERT OR REPLACE INTO workouts (id, plan_id, name, week, day, exercises_json, difficulty, xp_value, stats, updated_at, synced)
       VALUES ${placeholders};`,
      params
    );
  }
}

/**
 * Activate or switch a workout plan directly.
 * Ensures profile columns exist, updates selected_plan and plan_start_date, and seeds the workouts.
 */
export async function activateWorkoutPlan(
  db: SQLiteDatabase,
  planType: PlanType
): Promise<void> {
  const now = new Date().toISOString();
  const today = now.split('T')[0];
  const effectivePlan: PlanType = planType === '365day' ? '365day' : '100day';

  // Defensive migration
  const columns = [
    'ALTER TABLE profiles ADD COLUMN selected_plan TEXT;',
    'ALTER TABLE profiles ADD COLUMN plan_start_date TEXT;',
    'ALTER TABLE profiles ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;',
  ];
  for (const sql of columns) {
    try {
      await db.execAsync(sql);
    } catch {}
  }

  // Update profile unconditionally
  await db.runAsync(
    `UPDATE profiles SET
      selected_plan = ?,
      plan_start_date = COALESCE(plan_start_date, ?),
      onboarding_complete = 1,
      updated_at = ?,
      synced = 0;`,
    [effectivePlan, today, now]
  );

  // Seed workouts (non-fatal)
  try {
    await seedWorkoutsForPlan(db, effectivePlan, today);
  } catch (seedErr) {
    console.error('[DB] seedWorkoutsForPlan in activatePlan error:', seedErr);
  }
}

/**
 * Get the current plan's metadata.
 */
export async function getActivePlan(db: SQLiteDatabase): Promise<WorkoutPlan | null> {
  return await db.getFirstAsync<WorkoutPlan>('SELECT * FROM workout_plans LIMIT 1;');
}

/**
 * Calculate the current day number based on plan start date.
 */
export function calculateCurrentDayNumber(planStartDate: string): number {
  const start = new Date(planStartDate + 'T00:00:00');
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Day 1 is the start date
}

/**
 * Get today's workout based on the plan start date.
 */
export async function getTodayWorkout(
  db: SQLiteDatabase,
  planStartDate: string
): Promise<Workout | null> {
  const dayNumber = calculateCurrentDayNumber(planStartDate);
  return await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE day = ? LIMIT 1;',
    [dayNumber]
  );
}

/**
 * Get workouts for a specific week number.
 */
export async function getWeekWorkouts(
  db: SQLiteDatabase,
  weekNumber: number
): Promise<Workout[]> {
  return await db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE week = ? ORDER BY day ASC;',
    [weekNumber]
  );
}

/**
 * Get all workouts in a day range (for calendar view).
 */
export async function getWorkoutsInRange(
  db: SQLiteDatabase,
  startDay: number,
  endDay: number
): Promise<Workout[]> {
  return await db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE day >= ? AND day <= ? ORDER BY day ASC;',
    [startDay, endDay]
  );
}

/**
 * Get all completed workout log IDs for checking completion status.
 */
export async function getCompletedWorkoutIds(db: SQLiteDatabase): Promise<Set<string>> {
  const logs = await db.getAllAsync<{ workout_id: string }>(
    'SELECT DISTINCT workout_id FROM workout_logs;'
  );
  return new Set(logs.map((l) => l.workout_id));
}

/**
 * Get progress info for the current plan.
 */
export async function getCurrentPlanProgress(
  db: SQLiteDatabase
): Promise<{
  planType: PlanType | null;
  planName: string;
  currentDay: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
  phase: string;
  difficulty: string;
  completedCount: number;
  progressPercent: number;
} | null> {
  const profile = await getProfile(db);
  if (!profile?.selected_plan || !profile?.plan_start_date) return null;

  const planType = profile.selected_plan as PlanType;
  const meta = PLAN_METADATA[planType];
  const currentDay = calculateCurrentDayNumber(profile.plan_start_date);
  const clampedDay = Math.min(currentDay, meta.totalDays);
  const currentWeek = Math.ceil(clampedDay / 7);
  const totalWeeks = Math.ceil(meta.totalDays / 7);
  const phaseInfo = getPlanPhaseInfo(planType, clampedDay);

  const completedResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM workout_logs;'
  );
  const completedCount = completedResult?.count ?? 0;

  return {
    planType,
    planName: meta.name,
    currentDay: clampedDay,
    totalDays: meta.totalDays,
    currentWeek,
    totalWeeks,
    phase: phaseInfo.name,
    difficulty: phaseInfo.difficulty,
    completedCount,
    progressPercent: Math.round((clampedDay / meta.totalDays) * 100),
  };
}

// Legacy compatibility wrappers
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

export function getDayDifference(dateStr1: string, dateStr2: string): number {
  const d1 = new Date(dateStr1.split('T')[0] + 'T00:00:00Z');
  const d2 = new Date(dateStr2.split('T')[0] + 'T00:00:00Z');
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24));
}

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
  const diffDays = streak.last_activity_date ? getDayDifference(streak.last_activity_date, today) : 999;

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

export async function checkAndUpdateDailyLoginStreak(db: SQLiteDatabase): Promise<Streak> {
  return await updateStreak(db, 'login');
}

export async function getStreaks(db: SQLiteDatabase): Promise<Streak[]> {
  return await db.getAllAsync<Streak>('SELECT * FROM streaks;');
}

export interface DayActivityStatus {
  date: string;
  dayLabel: string;
  isCompleted: boolean;
  isToday: boolean;
}

export async function getPastWeekActivity(db: SQLiteDatabase): Promise<DayActivityStatus[]> {
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const results: DayActivityStatus[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayLabel = dayNames[d.getDay()];
    const isToday = dateStr === todayStr;

    // Check if any quest, workout, activity, or meal was completed on this date
    const questCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM quest_logs WHERE date(completed_at) = date(?);',
      [dateStr]
    );
    const workoutCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workout_logs WHERE date(completed_at) = date(?);',
      [dateStr]
    );
    const actCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM activities WHERE date(logged_at) = date(?);',
      [dateStr]
    );
    const mealCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM meals WHERE date(logged_at) = date(?);',
      [dateStr]
    );

    const stepCount = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM daily_steps WHERE date = ? AND (steps >= 1000 OR is_goal_reached = 1);',
      [dateStr]
    );

    const hasActivity =
      (questCount?.count ?? 0) > 0 ||
      (workoutCount?.count ?? 0) > 0 ||
      (actCount?.count ?? 0) > 0 ||
      (mealCount?.count ?? 0) > 0 ||
      (stepCount?.count ?? 0) > 0;

    results.push({
      date: dateStr,
      dayLabel,
      isCompleted: hasActivity,
      isToday,
    });
  }

  return results;
}

// --- DAILY STEPS OPERATIONS ---

export async function getTodaySteps(db: SQLiteDatabase, dateStr?: string): Promise<DailySteps> {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  let stepRecord = await db.getFirstAsync<DailySteps>(
    'SELECT * FROM daily_steps WHERE date = ? LIMIT 1;',
    [date]
  );

  if (!stepRecord) {
    const id = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO daily_steps (id, date, steps, target_steps, distance_km, calories_burned, is_goal_reached, updated_at, synced)
       VALUES (?, ?, 0, 10000, 0, 0, 0, ?, 0);`,
      [id, date, now]
    );
    stepRecord = await db.getFirstAsync<DailySteps>('SELECT * FROM daily_steps WHERE id = ?;', [id]);
  }

  return stepRecord!;
}

export async function updateTodaySteps(
  db: SQLiteDatabase,
  steps: number,
  distance_km?: number,
  calories_burned?: number,
  dateStr?: string
): Promise<{ stepRecord: DailySteps; goalJustReached: boolean }> {
  const date = dateStr ?? new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const current = await getTodaySteps(db, date);
  const target = current.target_steps || 10000;
  const isGoalReached = steps >= target ? 1 : 0;
  const goalJustReached = current.is_goal_reached === 0 && isGoalReached === 1;

  // Conversions if not provided
  const dist = distance_km !== undefined ? distance_km : Number(((steps * 0.762) / 1000).toFixed(2));
  const cal = calories_burned !== undefined ? calories_burned : Number((steps * 0.04).toFixed(1));

  await db.runAsync(
    `UPDATE daily_steps SET
      steps = ?,
      distance_km = ?,
      calories_burned = ?,
      is_goal_reached = ?,
      updated_at = ?,
      synced = 0
     WHERE id = ?;`,
    [steps, dist, cal, isGoalReached, now, current.id]
  );

  if (isGoalReached === 1) {
    // Update step streak when 10k goal is reached
    await updateStreak(db, 'steps');
  }

  const updated = (await getTodaySteps(db, date))!;
  return { stepRecord: updated, goalJustReached };
}

export async function getStepsHistory(db: SQLiteDatabase, limitDays: number = 7): Promise<DailySteps[]> {
  return await db.getAllAsync<DailySteps>(
    'SELECT * FROM daily_steps ORDER BY date DESC LIMIT ?;',
    [limitDays]
  );
}

// --- SYNC ENGINE HELPERS ---

export async function getUnsyncedRows<T>(db: SQLiteDatabase, tableName: string): Promise<T[]> {
  try {
    return await db.getAllAsync<T>(`SELECT * FROM ${tableName} WHERE synced = 0;`);
  } catch (err) {
    console.warn(`[DB] Failed to get unsynced rows for ${tableName}:`, err);
    return [];
  }
}

export async function markRowsSynced(
  db: SQLiteDatabase,
  tableName: string,
  ids: string[]
): Promise<void> {
  const validIds = ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
  if (validIds.length === 0) return;

  // Batch in chunks of 50 to prevent SQLite variable limits or statement buffer overflow
  for (let i = 0; i < validIds.length; i += 50) {
    const chunk = validIds.slice(i, i + 50);
    const placeholders = chunk.map(() => '?').join(',');
    try {
      await db.runAsync(
        `UPDATE ${tableName} SET synced = 1 WHERE id IN (${placeholders});`,
        chunk
      );
    } catch (err) {
      console.warn(`[DB] Failed to mark rows synced for ${tableName}:`, err);
    }
  }
}

export async function getLastSyncedAt(db: SQLiteDatabase): Promise<string | null> {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    const row = await db.getFirstAsync<{ value: string }>(
      "SELECT value FROM sync_metadata WHERE key = 'last_synced_at';"
    );
    return row?.value ?? null;
  } catch (err) {
    console.warn('[DB] Failed to get last_synced_at:', err);
    return null;
  }
}

export async function setLastSyncedAt(db: SQLiteDatabase, timestamp: string): Promise<void> {
  try {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `);
    await db.runAsync(
      `INSERT INTO sync_metadata (key, value) VALUES ('last_synced_at', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [timestamp]
    );
  } catch (err) {
    console.warn('[DB] Failed to set last_synced_at:', err);
  }
}

export async function upsertRemoteRows(
  db: SQLiteDatabase,
  tableName: string,
  rows: any[]
): Promise<void> {
  if (!rows || rows.length === 0) return;

  try {
    // 1. Get valid table columns from local SQLite schema
    const tableInfo = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${tableName});`);
    const validColumns = new Set(tableInfo.map((c) => c.name));

    for (const row of rows) {
      if (!row || !row.id) continue;

      const rowId = String(row.id);

      // Parse remote updated_at safely
      let remoteUpdatedAt = row.updated_at;
      if (remoteUpdatedAt && typeof remoteUpdatedAt === 'object') {
        if (remoteUpdatedAt instanceof Date) {
          remoteUpdatedAt = remoteUpdatedAt.toISOString();
        } else if (typeof remoteUpdatedAt.toDate === 'function') {
          remoteUpdatedAt = remoteUpdatedAt.toDate().toISOString();
        } else if ('seconds' in remoteUpdatedAt) {
          remoteUpdatedAt = new Date(remoteUpdatedAt.seconds * 1000).toISOString();
        } else {
          remoteUpdatedAt = new Date().toISOString();
        }
      } else if (!remoteUpdatedAt || typeof remoteUpdatedAt !== 'string') {
        remoteUpdatedAt = new Date().toISOString();
      }

      // ============================================================
      // TABLE-SPECIFIC CONFLICT / DEDUPLICATION CHECKS
      // ============================================================
      if (tableName === 'profiles') {
        const localProfile = await db.getFirstAsync<Profile>(
          'SELECT * FROM profiles ORDER BY total_xp DESC, level DESC, updated_at DESC LIMIT 1;'
        );
        if (localProfile) {
          const localXP = Number(localProfile.total_xp ?? 0);
          const remoteXP = Number(row.total_xp ?? 0);

          // If local has strictly more XP, or local is newer with equal XP, do not overwrite with remote
          if (localXP > remoteXP) {
            continue;
          }
          if (localXP === remoteXP && localProfile.updated_at && new Date(localProfile.updated_at) > new Date(remoteUpdatedAt)) {
            continue;
          }

          // Remote wins: remove duplicate local profiles and harmonize ID
          if (localProfile.id !== rowId) {
            await db.runAsync('UPDATE profiles SET id = ? WHERE id = ?;', [rowId, localProfile.id]);
          }
          await db.runAsync('DELETE FROM profiles WHERE id != ?;', [rowId]);
        }
      } else if (tableName === 'quests' && row.title && row.due_date) {
        const titleClean = String(row.title).trim();
        const existingQuest = await db.getFirstAsync<{ id: string; is_completed: number; updated_at: string }>(
          'SELECT id, is_completed, updated_at FROM quests WHERE LOWER(TRIM(title)) = LOWER(?) AND due_date = ? LIMIT 1;',
          [titleClean, String(row.due_date)]
        );

        if (existingQuest) {
          // If existing quest was already completed locally, preserve completion
          if (existingQuest.is_completed && !row.is_completed) {
            row.is_completed = 1;
          }
          // Harmonize ID so we do NOT insert a second duplicate row
          if (existingQuest.id !== rowId) {
            await db.runAsync('UPDATE quest_logs SET quest_id = ? WHERE quest_id = ?;', [rowId, existingQuest.id]);
            await db.runAsync('DELETE FROM quests WHERE id = ?;', [existingQuest.id]);
          }
        }
      } else if (tableName === 'daily_steps' && row.date) {
        const existingStep = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM daily_steps WHERE date = ? LIMIT 1;',
          [String(row.date)]
        );
        if (existingStep && existingStep.id !== rowId) {
          await db.runAsync('DELETE FROM daily_steps WHERE id = ?;', [existingStep.id]);
        }
      } else if (tableName === 'streaks' && row.type) {
        const existingStreak = await db.getFirstAsync<{ id: string }>(
          'SELECT id FROM streaks WHERE type = ? LIMIT 1;',
          [String(row.type)]
        );
        if (existingStreak && existingStreak.id !== rowId) {
          await db.runAsync('DELETE FROM streaks WHERE id = ?;', [existingStreak.id]);
        }
      } else {
        // Last-write-wins check for generic tables
        try {
          const local = await db.getFirstAsync<{ updated_at: string }>(
            `SELECT updated_at FROM ${tableName} WHERE id = ?;`,
            [rowId]
          );

          if (local && local.updated_at && new Date(local.updated_at) > new Date(remoteUpdatedAt)) {
            // Local version is newer, skip remote overwrite
            continue;
          }
        } catch {
          // Continue to insert if query fails
        }
      }

      // Build safe column & value lists from only existing SQLite columns (excluding 'synced')
      const insertCols: string[] = ['id'];
      const insertVals: any[] = [rowId];

      for (const col of Object.keys(row)) {
        if (col === 'id' || col === 'synced') continue;
        if (!validColumns.has(col)) continue;

        let val = row[col];
        if (val !== null && typeof val === 'object') {
          if (val instanceof Date) {
            val = val.toISOString();
          } else if (typeof val.toDate === 'function') {
            val = val.toDate().toISOString();
          } else if ('seconds' in val) {
            val = new Date(val.seconds * 1000).toISOString();
          } else if (Array.isArray(val) || !(val instanceof Uint8Array)) {
            val = JSON.stringify(val);
          }
        }
        insertCols.push(col);
        insertVals.push(val ?? null);
      }

      // Append synced column explicitly
      insertCols.push('synced');
      insertVals.push(1);

      const placeholders = insertCols.map(() => '?').join(',');
      const updateClauses = insertCols
        .filter((col) => col !== 'id')
        .map((col) => `${col} = excluded.${col}`)
        .join(', ');

      await db.runAsync(
        `INSERT INTO ${tableName} (${insertCols.join(',')})
         VALUES (${placeholders})
         ON CONFLICT(id) DO UPDATE SET ${updateClauses};`,
        insertVals
      );
    }
  } catch (err) {
    console.warn(`[DB] Failed to upsert remote rows for ${tableName}:`, err);
  }
}
