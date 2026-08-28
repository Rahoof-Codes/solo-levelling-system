// ============================================================
// Database Initialization & Seeding (expo-sqlite modern API)
// ============================================================

import { type SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { CREATE_TABLES_SQL } from './schema';
import { WORKOUT_PLANS } from '@/data/workoutPlans';
import { Rank, Stat, QuestCategory } from '@/types';

export const DATABASE_NAME = 'thesystem.db';

/**
 * Initialize SQLite database:
 * 1. Execute DDL statements (creates all 11 tables + metadata)
 * 2. Seed initial profile if none exists
 * 3. Seed 3 workout plans if none exist
 * 4. Seed initial streak counters if none exist
 * 5. Seed default daily quests if none exist
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  // 1. Run all table migrations
  await db.execAsync(CREATE_TABLES_SQL);

  // 1b. Migration: Add goal_type column if missing (for existing installs)
  try {
    const colCheck = await db.getFirstAsync<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM pragma_table_info('profiles') WHERE name = 'goal_type';`
    );
    if (!colCheck || colCheck.cnt === 0) {
      await db.execAsync(`ALTER TABLE profiles ADD COLUMN goal_type TEXT NOT NULL DEFAULT 'maintain';`);
    }
  } catch {
    // Column already exists or table doesn't exist yet — safe to ignore
  }

  const now = new Date().toISOString();

  // 2. Check & seed default profile
  const profile = await db.getFirstAsync<{ id: string }>('SELECT id FROM profiles LIMIT 1;');
  if (!profile) {
    const profileId = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO profiles (
        id, username, level, total_xp, rank,
        str_xp, vit_xp, agi_xp, int_xp, per_xp,
        title, onboarding_complete, updated_at, synced
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        profileId,
        'Sung Jin-Woo',
        1,
        0,
        Rank.E,
        0,
        0,
        0,
        0,
        0,
        'E-Rank Hunter',
        0, // Not completed onboarding yet
        now,
        0,
      ]
    );
  }

  // 3. Check & seed workout plans
  const existingPlans = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM workout_plans;');
  if (!existingPlans || existingPlans.count === 0) {
    for (const plan of WORKOUT_PLANS) {
      await db.runAsync(
        `INSERT INTO workout_plans (id, name, description, difficulty, weeks, focus_stats, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0);`,
        [
          plan.id,
          plan.name,
          plan.description,
          plan.difficulty,
          plan.weeks,
          JSON.stringify(plan.focusStats),
          now,
        ]
      );

      for (const workout of plan.workouts) {
        await db.runAsync(
          `INSERT INTO workouts (id, plan_id, name, week, day, exercises_json, difficulty, xp_value, stats, updated_at, synced)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0);`,
          [
            workout.id,
            plan.id,
            workout.name,
            workout.week,
            workout.day,
            JSON.stringify(workout.exercises),
            workout.difficulty,
            workout.xpValue,
            JSON.stringify(workout.stats),
            now,
          ]
        );
      }
    }
  }

  // 4. Seed initial streak records
  const existingStreaks = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM streaks;');
  if (!existingStreaks || existingStreaks.count === 0) {
    const streakTypes = ['daily_quest', 'workout', 'login', 'meal_log'];
    for (const type of streakTypes) {
      await db.runAsync(
        `INSERT INTO streaks (id, type, current_count, longest_count, last_activity_date, updated_at, synced)
         VALUES (?, ?, 0, 0, ?, ?, 0);`,
        [Crypto.randomUUID(), type, '', now]
      );
    }
  }

  // 5. Seed default daily quests if empty
  const today = new Date().toISOString().split('T')[0];
  const existingQuests = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM quests WHERE due_date = ?;', [today]);
  if (!existingQuests || existingQuests.count === 0) {
    const defaultQuests = [
      {
        title: 'Drink 2L Water',
        description: 'Stay hydrated for physical & mental alertness',
        category: QuestCategory.FOOD,
        stat: Stat.PER,
        xp: 25,
      },
      {
        title: '30-Minute Workout',
        description: 'Complete a workout session or cardio circuit',
        category: QuestCategory.FITNESS,
        stat: Stat.STR,
        xp: 50,
      },
      {
        title: '100 Push-ups Challenge',
        description: 'Complete 100 push-ups throughout the day',
        category: QuestCategory.FITNESS,
        stat: Stat.VIT,
        xp: 40,
      },
      {
        title: 'Deep Work / Study (45m)',
        description: 'Focus with zero distractions on learning or craft',
        category: QuestCategory.STUDY,
        stat: Stat.INT,
        xp: 35,
      },
    ];

    for (const q of defaultQuests) {
      await db.runAsync(
        `INSERT INTO quests (id, title, description, category, xp_reward, stat_affected, due_date, is_completed, is_auto_generated, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 0);`,
        [Crypto.randomUUID(), q.title, q.description, q.category, q.xp, q.stat, today, now]
      );
    }
  }
}
