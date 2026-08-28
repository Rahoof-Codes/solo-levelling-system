// ============================================================
// Seeded Workout Plans — Static JSON bundled with the app
// Works offline from first install, no server needed.
// ============================================================

import type { Difficulty, Exercise } from '@/types';
import { Stat } from '@/types';

export interface WorkoutPlanSeed {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  weeks: number;
  focusStats: Stat[];
  workouts: WorkoutSeed[];
}

export interface WorkoutSeed {
  id: string;
  name: string;
  week: number;
  day: number;
  exercises: Exercise[];
  difficulty: Difficulty;
  xpValue: number;
  stats: Stat[];
}

// Pre-generated UUIDs for deterministic seeding (app won't duplicate on re-seed)
export const WORKOUT_PLANS: WorkoutPlanSeed[] = [
  // ====================================================
  // PLAN 1: Foundation — Beginner Full-Body (STR + VIT)
  // ====================================================
  {
    id: 'plan-foundation-001',
    name: 'Foundation',
    description:
      'Beginner full-body program. Build a solid base with compound movements and bodyweight exercises. 3 sessions per week for 4 weeks.',
    difficulty: 'beginner',
    weeks: 4,
    focusStats: [Stat.STR, Stat.VIT],
    workouts: [
      // Week 1
      {
        id: 'fw1d1-001',
        name: 'Week 1 — Full Body A',
        week: 1,
        day: 1,
        exercises: [
          { name: 'Push-ups', sets: 3, reps: 8 },
          { name: 'Bodyweight Squats', sets: 3, reps: 12 },
          { name: 'Plank', sets: 3, duration_min: 0.5 },
          { name: 'Dumbbell Rows', sets: 3, reps: 10 },
        ],
        difficulty: 'beginner',
        xpValue: 60,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw1d2-001',
        name: 'Week 1 — Full Body B',
        week: 1,
        day: 3,
        exercises: [
          { name: 'Incline Push-ups', sets: 3, reps: 10 },
          { name: 'Lunges', sets: 3, reps: 10 },
          { name: 'Dead Hang', sets: 3, duration_min: 0.5 },
          { name: 'Glute Bridges', sets: 3, reps: 15 },
        ],
        difficulty: 'beginner',
        xpValue: 60,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw1d3-001',
        name: 'Week 1 — Full Body C',
        week: 1,
        day: 5,
        exercises: [
          { name: 'Push-ups', sets: 3, reps: 10 },
          { name: 'Goblet Squats', sets: 3, reps: 10 },
          { name: 'Superman Hold', sets: 3, duration_min: 0.5 },
          { name: 'Seated Rows', sets: 3, reps: 10 },
        ],
        difficulty: 'beginner',
        xpValue: 65,
        stats: [Stat.STR, Stat.VIT],
      },
      // Week 2
      {
        id: 'fw2d1-001',
        name: 'Week 2 — Full Body A',
        week: 2,
        day: 1,
        exercises: [
          { name: 'Push-ups', sets: 3, reps: 12 },
          { name: 'Bodyweight Squats', sets: 3, reps: 15 },
          { name: 'Plank', sets: 3, duration_min: 0.75 },
          { name: 'Dumbbell Rows', sets: 3, reps: 12 },
        ],
        difficulty: 'beginner',
        xpValue: 70,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw2d2-001',
        name: 'Week 2 — Full Body B',
        week: 2,
        day: 3,
        exercises: [
          { name: 'Diamond Push-ups', sets: 3, reps: 8 },
          { name: 'Bulgarian Split Squats', sets: 3, reps: 8 },
          { name: 'Dead Hang', sets: 3, duration_min: 0.5 },
          { name: 'Hip Thrusts', sets: 3, reps: 12 },
        ],
        difficulty: 'beginner',
        xpValue: 70,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw2d3-001',
        name: 'Week 2 — Full Body C',
        week: 2,
        day: 5,
        exercises: [
          { name: 'Push-ups', sets: 4, reps: 10 },
          { name: 'Goblet Squats', sets: 3, reps: 12 },
          { name: 'Plank', sets: 3, duration_min: 0.75 },
          { name: 'Inverted Rows', sets: 3, reps: 8 },
        ],
        difficulty: 'beginner',
        xpValue: 75,
        stats: [Stat.STR, Stat.VIT],
      },
      // Week 3
      {
        id: 'fw3d1-001',
        name: 'Week 3 — Full Body A',
        week: 3,
        day: 1,
        exercises: [
          { name: 'Push-ups', sets: 4, reps: 12 },
          { name: 'Jump Squats', sets: 3, reps: 10 },
          { name: 'Side Plank', sets: 3, duration_min: 0.5 },
          { name: 'Bent-over Rows', sets: 3, reps: 10 },
        ],
        difficulty: 'beginner',
        xpValue: 80,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw3d2-001',
        name: 'Week 3 — Full Body B',
        week: 3,
        day: 3,
        exercises: [
          { name: 'Pike Push-ups', sets: 3, reps: 8 },
          { name: 'Walking Lunges', sets: 3, reps: 12 },
          { name: 'Leg Raises', sets: 3, reps: 12 },
          { name: 'Glute Bridges', sets: 3, reps: 15 },
        ],
        difficulty: 'beginner',
        xpValue: 80,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw3d3-001',
        name: 'Week 3 — Full Body C',
        week: 3,
        day: 5,
        exercises: [
          { name: 'Wide Push-ups', sets: 4, reps: 10 },
          { name: 'Sumo Squats', sets: 3, reps: 15 },
          { name: 'Plank', sets: 3, duration_min: 1 },
          { name: 'Single-arm Rows', sets: 3, reps: 10 },
        ],
        difficulty: 'beginner',
        xpValue: 85,
        stats: [Stat.STR, Stat.VIT],
      },
      // Week 4
      {
        id: 'fw4d1-001',
        name: 'Week 4 — Full Body A',
        week: 4,
        day: 1,
        exercises: [
          { name: 'Push-ups', sets: 4, reps: 15 },
          { name: 'Pistol Squat Progressions', sets: 3, reps: 6 },
          { name: 'Ab Wheel Rollouts', sets: 3, reps: 8 },
          { name: 'Pull-up Negatives', sets: 3, reps: 5 },
        ],
        difficulty: 'beginner',
        xpValue: 90,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw4d2-001',
        name: 'Week 4 — Full Body B',
        week: 4,
        day: 3,
        exercises: [
          { name: 'Clap Push-ups', sets: 3, reps: 6 },
          { name: 'Jump Squats', sets: 4, reps: 10 },
          { name: 'Mountain Climbers', sets: 3, duration_min: 0.5 },
          { name: 'Dumbbell Rows', sets: 4, reps: 12 },
        ],
        difficulty: 'beginner',
        xpValue: 95,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'fw4d3-001',
        name: 'Week 4 — Full Body C (Test Day)',
        week: 4,
        day: 5,
        exercises: [
          { name: 'Max Push-ups (1 set)', sets: 1, reps: 0 },
          { name: 'Max Squats (1 set)', sets: 1, reps: 0 },
          { name: 'Max Plank Hold', sets: 1, duration_min: 0 },
          { name: 'Max Rows (1 set)', sets: 1, reps: 0 },
        ],
        difficulty: 'beginner',
        xpValue: 100,
        stats: [Stat.STR, Stat.VIT],
      },
    ],
  },

  // ====================================================
  // PLAN 2: Shadow Cardio — Running/HIIT Focus (AGI + VIT)
  // ====================================================
  {
    id: 'plan-shadow-cardio-002',
    name: 'Shadow Cardio',
    description:
      'Running and HIIT program to build speed and endurance. Mix of steady-state cardio and explosive intervals. 4 sessions per week for 4 weeks.',
    difficulty: 'intermediate',
    weeks: 4,
    focusStats: [Stat.AGI, Stat.VIT],
    workouts: [
      // Week 1
      {
        id: 'sc1d1-001',
        name: 'Week 1 — Easy Run',
        week: 1,
        day: 1,
        exercises: [
          { name: 'Warm-up Walk', duration_min: 5 },
          { name: 'Steady Run', duration_min: 20 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 70,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc1d2-001',
        name: 'Week 1 — HIIT Circuit',
        week: 1,
        day: 2,
        exercises: [
          { name: 'Jumping Jacks', sets: 3, duration_min: 1 },
          { name: 'Burpees', sets: 3, reps: 10 },
          { name: 'High Knees', sets: 3, duration_min: 1 },
          { name: 'Mountain Climbers', sets: 3, duration_min: 1 },
        ],
        difficulty: 'intermediate',
        xpValue: 80,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc1d3-001',
        name: 'Week 1 — Tempo Run',
        week: 1,
        day: 4,
        exercises: [
          { name: 'Warm-up Jog', duration_min: 5 },
          { name: 'Tempo Run (moderate pace)', duration_min: 15 },
          { name: 'Cool-down Jog', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 75,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc1d4-001',
        name: 'Week 1 — Jump Rope & Agility',
        week: 1,
        day: 6,
        exercises: [
          { name: 'Jump Rope', duration_min: 10 },
          { name: 'Lateral Shuffles', sets: 4, duration_min: 0.5 },
          { name: 'Box Jumps', sets: 3, reps: 8 },
          { name: 'Stretch', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 80,
        stats: [Stat.AGI, Stat.VIT],
      },
      // Week 2
      {
        id: 'sc2d1-001',
        name: 'Week 2 — Distance Run',
        week: 2,
        day: 1,
        exercises: [
          { name: 'Warm-up Walk', duration_min: 5 },
          { name: 'Steady Run', duration_min: 25 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 80,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc2d2-001',
        name: 'Week 2 — Tabata HIIT',
        week: 2,
        day: 2,
        exercises: [
          { name: 'Burpees (20s on/10s off × 8)', sets: 8, duration_min: 0.33 },
          { name: 'Jump Squats (20s on/10s off × 8)', sets: 8, duration_min: 0.33 },
          { name: 'Rest', duration_min: 2 },
          { name: 'Sprint in Place (20s on/10s off × 8)', sets: 8, duration_min: 0.33 },
        ],
        difficulty: 'intermediate',
        xpValue: 90,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc2d3-001',
        name: 'Week 2 — Interval Run',
        week: 2,
        day: 4,
        exercises: [
          { name: 'Warm-up Jog', duration_min: 5 },
          { name: 'Sprint 30s / Jog 90s × 8', sets: 8, duration_min: 2 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 90,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc2d4-001',
        name: 'Week 2 — Agility Drills',
        week: 2,
        day: 6,
        exercises: [
          { name: 'Jump Rope', duration_min: 12 },
          { name: 'Ladder Drills', sets: 4, duration_min: 1 },
          { name: 'Cone Sprints', sets: 6, duration_min: 0.5 },
          { name: 'Stretch', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 85,
        stats: [Stat.AGI, Stat.VIT],
      },
      // Week 3
      {
        id: 'sc3d1-001',
        name: 'Week 3 — Long Run',
        week: 3,
        day: 1,
        exercises: [
          { name: 'Warm-up Walk', duration_min: 5 },
          { name: 'Steady Run', duration_min: 30 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 95,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc3d2-001',
        name: 'Week 3 — Power HIIT',
        week: 3,
        day: 2,
        exercises: [
          { name: 'Tuck Jumps', sets: 4, reps: 8 },
          { name: 'Burpee Box Jumps', sets: 3, reps: 8 },
          { name: 'Skater Jumps', sets: 4, reps: 12 },
          { name: 'Sprint in Place', sets: 4, duration_min: 0.5 },
        ],
        difficulty: 'intermediate',
        xpValue: 100,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc3d3-001',
        name: 'Week 3 — Hill Sprints',
        week: 3,
        day: 4,
        exercises: [
          { name: 'Warm-up Jog', duration_min: 5 },
          { name: 'Hill Sprint 20s / Walk Down × 10', sets: 10, duration_min: 1 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 100,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc3d4-001',
        name: 'Week 3 — Jump Rope Endurance',
        week: 3,
        day: 6,
        exercises: [
          { name: 'Jump Rope (continuous)', duration_min: 15 },
          { name: 'Double Unders', sets: 5, reps: 10 },
          { name: 'Stretch', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 95,
        stats: [Stat.AGI, Stat.VIT],
      },
      // Week 4
      {
        id: 'sc4d1-001',
        name: 'Week 4 — Threshold Run',
        week: 4,
        day: 1,
        exercises: [
          { name: 'Warm-up Jog', duration_min: 5 },
          { name: 'Threshold Pace Run', duration_min: 25 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 105,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc4d2-001',
        name: 'Week 4 — Final HIIT',
        week: 4,
        day: 2,
        exercises: [
          { name: 'Burpees', sets: 5, reps: 12 },
          { name: 'Tuck Jumps', sets: 5, reps: 10 },
          { name: 'Mountain Climbers', sets: 5, duration_min: 1 },
          { name: 'Sprint in Place', sets: 5, duration_min: 0.5 },
        ],
        difficulty: 'intermediate',
        xpValue: 110,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc4d3-001',
        name: 'Week 4 — Speed Intervals',
        week: 4,
        day: 4,
        exercises: [
          { name: 'Warm-up Jog', duration_min: 5 },
          { name: 'Sprint 20s / Rest 40s × 12', sets: 12, duration_min: 1 },
          { name: 'Cool-down Walk', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 110,
        stats: [Stat.AGI, Stat.VIT],
      },
      {
        id: 'sc4d4-001',
        name: 'Week 4 — Time Trial',
        week: 4,
        day: 6,
        exercises: [
          { name: 'Warm-up', duration_min: 5 },
          { name: 'Timed 5K Run (best effort)', duration_min: 25 },
          { name: 'Cool-down', duration_min: 5 },
        ],
        difficulty: 'intermediate',
        xpValue: 120,
        stats: [Stat.AGI, Stat.VIT],
      },
    ],
  },

  // ====================================================
  // PLAN 3: Hunter Strength — Intermediate Strength Split (STR-heavy)
  // ====================================================
  {
    id: 'plan-hunter-strength-003',
    name: 'Hunter Strength',
    description:
      'Intermediate strength program with a Push/Pull/Legs split. Heavy compound lifts for maximum strength gains. 4 sessions per week for 4 weeks.',
    difficulty: 'intermediate',
    weeks: 4,
    focusStats: [Stat.STR],
    workouts: [
      // Week 1
      {
        id: 'hs1d1-001',
        name: 'Week 1 — Push Day',
        week: 1,
        day: 1,
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: 8 },
          { name: 'Overhead Press', sets: 3, reps: 8 },
          { name: 'Incline Dumbbell Press', sets: 3, reps: 10 },
          { name: 'Tricep Dips', sets: 3, reps: 10 },
          { name: 'Lateral Raises', sets: 3, reps: 12 },
        ],
        difficulty: 'intermediate',
        xpValue: 100,
        stats: [Stat.STR],
      },
      {
        id: 'hs1d2-001',
        name: 'Week 1 — Pull Day',
        week: 1,
        day: 2,
        exercises: [
          { name: 'Deadlift', sets: 4, reps: 6 },
          { name: 'Barbell Rows', sets: 4, reps: 8 },
          { name: 'Pull-ups', sets: 3, reps: 8 },
          { name: 'Face Pulls', sets: 3, reps: 15 },
          { name: 'Barbell Curls', sets: 3, reps: 10 },
        ],
        difficulty: 'intermediate',
        xpValue: 110,
        stats: [Stat.STR],
      },
      {
        id: 'hs1d3-001',
        name: 'Week 1 — Legs',
        week: 1,
        day: 4,
        exercises: [
          { name: 'Barbell Squat', sets: 4, reps: 8 },
          { name: 'Romanian Deadlift', sets: 3, reps: 10 },
          { name: 'Leg Press', sets: 3, reps: 12 },
          { name: 'Walking Lunges', sets: 3, reps: 12 },
          { name: 'Calf Raises', sets: 4, reps: 15 },
        ],
        difficulty: 'intermediate',
        xpValue: 110,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'hs1d4-001',
        name: 'Week 1 — Upper Power',
        week: 1,
        day: 5,
        exercises: [
          { name: 'Close-grip Bench', sets: 4, reps: 8 },
          { name: 'Weighted Pull-ups', sets: 3, reps: 6 },
          { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
          { name: 'Cable Rows', sets: 3, reps: 12 },
        ],
        difficulty: 'intermediate',
        xpValue: 100,
        stats: [Stat.STR],
      },
      // Week 2
      {
        id: 'hs2d1-001',
        name: 'Week 2 — Push Day',
        week: 2,
        day: 1,
        exercises: [
          { name: 'Barbell Bench Press', sets: 4, reps: 6 },
          { name: 'Overhead Press', sets: 4, reps: 6 },
          { name: 'Dumbbell Flyes', sets: 3, reps: 12 },
          { name: 'Skull Crushers', sets: 3, reps: 10 },
          { name: 'Lateral Raises', sets: 3, reps: 15 },
        ],
        difficulty: 'intermediate',
        xpValue: 110,
        stats: [Stat.STR],
      },
      {
        id: 'hs2d2-001',
        name: 'Week 2 — Pull Day',
        week: 2,
        day: 2,
        exercises: [
          { name: 'Deadlift', sets: 5, reps: 5 },
          { name: 'Pendlay Rows', sets: 4, reps: 6 },
          { name: 'Weighted Pull-ups', sets: 3, reps: 6 },
          { name: 'Face Pulls', sets: 3, reps: 15 },
          { name: 'Hammer Curls', sets: 3, reps: 10 },
        ],
        difficulty: 'intermediate',
        xpValue: 120,
        stats: [Stat.STR],
      },
      {
        id: 'hs2d3-001',
        name: 'Week 2 — Legs',
        week: 2,
        day: 4,
        exercises: [
          { name: 'Front Squats', sets: 4, reps: 6 },
          { name: 'Romanian Deadlift', sets: 4, reps: 8 },
          { name: 'Hack Squat', sets: 3, reps: 10 },
          { name: 'Bulgarian Split Squats', sets: 3, reps: 10 },
          { name: 'Seated Calf Raises', sets: 4, reps: 12 },
        ],
        difficulty: 'intermediate',
        xpValue: 120,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'hs2d4-001',
        name: 'Week 2 — Upper Power',
        week: 2,
        day: 5,
        exercises: [
          { name: 'Incline Barbell Bench', sets: 4, reps: 6 },
          { name: 'Barbell Rows', sets: 4, reps: 6 },
          { name: 'Arnold Press', sets: 3, reps: 8 },
          { name: 'Chin-ups', sets: 3, reps: 8 },
        ],
        difficulty: 'intermediate',
        xpValue: 115,
        stats: [Stat.STR],
      },
      // Week 3
      {
        id: 'hs3d1-001',
        name: 'Week 3 — Heavy Push',
        week: 3,
        day: 1,
        exercises: [
          { name: 'Barbell Bench Press', sets: 5, reps: 5 },
          { name: 'Overhead Press', sets: 4, reps: 5 },
          { name: 'Weighted Dips', sets: 3, reps: 8 },
          { name: 'Cable Flyes', sets: 3, reps: 12 },
          { name: 'Overhead Tricep Extension', sets: 3, reps: 10 },
        ],
        difficulty: 'intermediate',
        xpValue: 125,
        stats: [Stat.STR],
      },
      {
        id: 'hs3d2-001',
        name: 'Week 3 — Heavy Pull',
        week: 3,
        day: 2,
        exercises: [
          { name: 'Deadlift', sets: 5, reps: 3 },
          { name: 'Barbell Rows', sets: 5, reps: 5 },
          { name: 'Weighted Pull-ups', sets: 4, reps: 5 },
          { name: 'Rear Delt Flyes', sets: 3, reps: 15 },
          { name: 'Barbell Curls', sets: 3, reps: 8 },
        ],
        difficulty: 'intermediate',
        xpValue: 130,
        stats: [Stat.STR],
      },
      {
        id: 'hs3d3-001',
        name: 'Week 3 — Heavy Legs',
        week: 3,
        day: 4,
        exercises: [
          { name: 'Barbell Squat', sets: 5, reps: 5 },
          { name: 'Sumo Deadlift', sets: 4, reps: 6 },
          { name: 'Leg Press', sets: 3, reps: 10 },
          { name: 'Leg Curls', sets: 3, reps: 12 },
          { name: 'Standing Calf Raises', sets: 4, reps: 12 },
        ],
        difficulty: 'intermediate',
        xpValue: 130,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'hs3d4-001',
        name: 'Week 3 — Volume Upper',
        week: 3,
        day: 5,
        exercises: [
          { name: 'Flat Dumbbell Press', sets: 4, reps: 10 },
          { name: 'T-bar Rows', sets: 4, reps: 8 },
          { name: 'Dumbbell Shoulder Press', sets: 3, reps: 10 },
          { name: 'Lat Pulldowns', sets: 3, reps: 12 },
        ],
        difficulty: 'intermediate',
        xpValue: 120,
        stats: [Stat.STR],
      },
      // Week 4
      {
        id: 'hs4d1-001',
        name: 'Week 4 — Max Push',
        week: 4,
        day: 1,
        exercises: [
          { name: 'Barbell Bench Press (work up to 1RM attempt)', sets: 6, reps: 3 },
          { name: 'Overhead Press', sets: 5, reps: 3 },
          { name: 'Weighted Dips', sets: 3, reps: 6 },
          { name: 'Tricep Pushdowns', sets: 3, reps: 12 },
        ],
        difficulty: 'intermediate',
        xpValue: 140,
        stats: [Stat.STR],
      },
      {
        id: 'hs4d2-001',
        name: 'Week 4 — Max Pull',
        week: 4,
        day: 2,
        exercises: [
          { name: 'Deadlift (work up to 1RM attempt)', sets: 6, reps: 2 },
          { name: 'Barbell Rows', sets: 5, reps: 5 },
          { name: 'Weighted Pull-ups', sets: 4, reps: 3 },
          { name: 'Barbell Curls', sets: 3, reps: 8 },
        ],
        difficulty: 'intermediate',
        xpValue: 150,
        stats: [Stat.STR],
      },
      {
        id: 'hs4d3-001',
        name: 'Week 4 — Max Legs',
        week: 4,
        day: 4,
        exercises: [
          { name: 'Barbell Squat (work up to 1RM attempt)', sets: 6, reps: 2 },
          { name: 'Romanian Deadlift', sets: 4, reps: 6 },
          { name: 'Leg Press', sets: 3, reps: 8 },
          { name: 'Calf Raises', sets: 4, reps: 15 },
        ],
        difficulty: 'intermediate',
        xpValue: 150,
        stats: [Stat.STR, Stat.VIT],
      },
      {
        id: 'hs4d4-001',
        name: 'Week 4 — Deload Upper',
        week: 4,
        day: 5,
        exercises: [
          { name: 'Light Bench Press', sets: 3, reps: 12 },
          { name: 'Light Rows', sets: 3, reps: 12 },
          { name: 'Shoulder Press', sets: 3, reps: 10 },
          { name: 'Stretch & Recovery', duration_min: 10 },
        ],
        difficulty: 'intermediate',
        xpValue: 80,
        stats: [Stat.STR, Stat.VIT],
      },
    ],
  },
];
