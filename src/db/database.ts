import { type SQLiteDatabase } from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';
import { Rank, Stat, QuestCategory } from '@/types';
import { deduplicateQuests } from './operations';

export const DATABASE_NAME = 'thesystem.db';

/**
 * Initialize SQLite database:
 * 1. Execute DDL statements (creates all 11 tables + metadata)
 * 2. Run column migrations for existing installs
 * 3. Seed initial profile if none exists & deduplicate profiles
 * 4. Seed initial streak counters if none exist
 * 5. Seed default daily quests if none exist & deduplicate quests
 * 6. Initialize daily steps record
 */
export async function initializeDatabase(db: SQLiteDatabase): Promise<void> {
  // 1. Run all table migrations
  await db.execAsync(CREATE_TABLES_SQL);

  // 1b. Defensive column migrations (direct ALTER TABLE — safe to ignore error if column already exists)
  const migrations = [
    'ALTER TABLE profiles ADD COLUMN goal_type TEXT NOT NULL DEFAULT "maintain";',
    'ALTER TABLE profiles ADD COLUMN selected_plan TEXT;',
    'ALTER TABLE profiles ADD COLUMN plan_start_date TEXT;',
    'ALTER TABLE profiles ADD COLUMN onboarding_complete INTEGER NOT NULL DEFAULT 0;',
  ];
  for (const sql of migrations) {
    try {
      await db.execAsync(sql);
    } catch {
      // Column already exists or already migrated
    }
  }

  const now = new Date().toISOString();

  // 2. Check & seed default profile
  const profile = await db.getFirstAsync<{ id: string }>('SELECT id FROM profiles LIMIT 1;');
  if (!profile) {
    const profileId = 'main_profile';
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

  // 3. Defensive profile deduplication: ensure exactly ONE profile exists locally
  const allProfiles = await db.getAllAsync<{ id: string }>(
    'SELECT id FROM profiles ORDER BY total_xp DESC, level DESC, updated_at DESC;'
  );
  if (allProfiles.length > 1) {
    const bestId = allProfiles[0].id;
    await db.runAsync('DELETE FROM profiles WHERE id != ?;', [bestId]);
  }

  // 4. Seed initial streak records with deterministic IDs
  const existingStreaks = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM streaks;');
  if (!existingStreaks || existingStreaks.count === 0) {
    const streakTypes = ['daily_quest', 'workout', 'login', 'meal_log', 'steps'];
    for (const type of streakTypes) {
      await db.runAsync(
        `INSERT INTO streaks (id, type, current_count, longest_count, last_activity_date, updated_at, synced)
         VALUES (?, ?, 0, 0, ?, ?, 1)
         ON CONFLICT(id) DO NOTHING;`,
        [`streak-${type}`, type, '', now]
      );
    }
  }

  // 5. Seed default daily quests if empty (deterministic IDs, marked synced = 1 to prevent remote spam)
  const today = new Date().toISOString().split('T')[0];
  const existingQuests = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM quests WHERE due_date = ?;', [today]);
  if (!existingQuests || existingQuests.count === 0) {
    const defaultQuests = [
      {
        slug: 'steps',
        title: '10,000 Steps Daily Quest',
        description: 'Complete 10,000 steps of movement today to boost AGI & VIT stats',
        category: QuestCategory.FITNESS,
        stat: Stat.AGI,
        xp: 50,
      },
      {
        slug: 'water',
        title: 'Drink 2L Water',
        description: 'Stay hydrated for physical & mental alertness',
        category: QuestCategory.FOOD,
        stat: Stat.PER,
        xp: 25,
      },
      {
        slug: 'workout',
        title: '30-Minute Workout',
        description: 'Complete a workout session or cardio circuit',
        category: QuestCategory.FITNESS,
        stat: Stat.STR,
        xp: 50,
      },
      {
        slug: 'pushups',
        title: '100 Push-ups Challenge',
        description: 'Complete 100 push-ups throughout the day',
        category: QuestCategory.FITNESS,
        stat: Stat.VIT,
        xp: 40,
      },
      {
        slug: 'study',
        title: 'Deep Work / Study (45m)',
        description: 'Focus with zero distractions on learning or craft',
        category: QuestCategory.STUDY,
        stat: Stat.INT,
        xp: 35,
      },
    ];

    for (const q of defaultQuests) {
      const qId = `quest-daily-${q.slug}-${today}`;
      await db.runAsync(
        `INSERT INTO quests (id, title, description, category, xp_reward, stat_affected, due_date, is_completed, is_auto_generated, updated_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, 1, ?, 1)
         ON CONFLICT(id) DO NOTHING;`,
        [qId, q.title, q.description, q.category, q.xp, q.stat, today, now]
      );
    }
  }

  // Clean up any existing duplicate quests locally
  await deduplicateQuests(db);

  // 6. Check & initialize today's daily_steps row with deterministic ID
  const existingSteps = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM daily_steps WHERE date = ?;', [today]);
  if (!existingSteps || existingSteps.count === 0) {
    await db.runAsync(
      `INSERT INTO daily_steps (id, date, steps, target_steps, distance_km, calories_burned, is_goal_reached, updated_at, synced)
       VALUES (?, ?, 0, 10000, 0, 0, 0, ?, 1)
       ON CONFLICT(id) DO NOTHING;`,
      [`steps-${today}`, today, now]
    );
  }
}
