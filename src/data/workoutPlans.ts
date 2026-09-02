// ============================================================
// Workout Plan Generator — 100-Day & 365-Day Home Workout Plans
// Generates daily workouts mapped to calendar dates.
// ALL EXERCISES ARE HOME/BODYWEIGHT ONLY — No gym equipment.
// ============================================================

import type { Difficulty, Exercise, PlanType } from '@/types';
import { Stat } from '@/types';

export interface WorkoutPlanSeed {
  id: string;
  name: string;
  description: string;
  difficulty: Difficulty;
  totalDays: number;
  focusStats: Stat[];
}

export interface WorkoutSeed {
  id: string;
  planId: string;
  name: string;
  dayNumber: number; // Absolute day (1–100 or 1–365)
  week: number;
  dayOfWeek: number; // 1=Mon ... 7=Sun
  phase: string;
  exercises: Exercise[];
  difficulty: Difficulty;
  xpValue: number;
  stats: Stat[];
  isRestDay: boolean;
}

// ============================================================
// PLAN METADATA
// ============================================================

export const PLAN_METADATA: Record<PlanType, WorkoutPlanSeed> = {
  '100day': {
    id: 'plan-shadow-awakening-100',
    name: 'Shadow Awakening',
    description:
      '100-day home transformation program. Escalating bodyweight training from foundation to explosive power. 6 days on, 1 day active recovery.',
    difficulty: 'beginner',
    totalDays: 100,
    focusStats: [Stat.STR, Stat.VIT, Stat.AGI],
  },
  '365day': {
    id: 'plan-monarch-ascension-365',
    name: "Monarch's Ascension",
    description:
      '365-day complete hunter evolution. A full year of progressive home training from E-Rank to S-Rank worthy. Master every physical discipline.',
    difficulty: 'beginner',
    totalDays: 365,
    focusStats: [Stat.STR, Stat.VIT, Stat.AGI, Stat.PER],
  },
};

// ============================================================
// PHASE DEFINITIONS
// ============================================================

interface PhaseConfig {
  name: string;
  difficulty: Difficulty;
  dayRange: [number, number]; // inclusive
  xpBase: number;
  xpGrowth: number; // XP added per day within phase
}

const PHASES_100DAY: PhaseConfig[] = [
  { name: 'Foundation', difficulty: 'beginner', dayRange: [1, 30], xpBase: 50, xpGrowth: 1 },
  { name: 'Strength Build', difficulty: 'beginner', dayRange: [31, 60], xpBase: 70, xpGrowth: 1.5 },
  { name: 'Power & Endurance', difficulty: 'intermediate', dayRange: [61, 90], xpBase: 95, xpGrowth: 1.5 },
  { name: 'Final Trial', difficulty: 'intermediate', dayRange: [91, 100], xpBase: 130, xpGrowth: 2 },
];

const PHASES_365DAY: PhaseConfig[] = [
  { name: 'Awakening', difficulty: 'beginner', dayRange: [1, 84], xpBase: 40, xpGrowth: 0.3 },
  { name: 'Hunter Training', difficulty: 'beginner', dayRange: [85, 168], xpBase: 65, xpGrowth: 0.4 },
  { name: 'Shadow Soldier', difficulty: 'intermediate', dayRange: [169, 252], xpBase: 95, xpGrowth: 0.5 },
  { name: 'Elite Protocol', difficulty: 'intermediate', dayRange: [253, 336], xpBase: 130, xpGrowth: 0.5 },
  { name: 'Monarch', difficulty: 'advanced', dayRange: [337, 365], xpBase: 170, xpGrowth: 1 },
];

// ============================================================
// EXERCISE TEMPLATES — HOME WORKOUT ONLY
// ============================================================

// Grouped by muscle focus / day type
// Each phase has progressively harder variations

interface ExerciseTemplate {
  exercises: Exercise[];
  stats: Stat[];
}

// --- PUSH DAYS ---
const PUSH_BEGINNER: ExerciseTemplate = {
  exercises: [
    { name: 'Wall Push-ups', sets: 3, reps: 15 },
    { name: 'Knee Push-ups', sets: 3, reps: 10 },
    { name: 'Shoulder Taps (Plank)', sets: 3, reps: 12 },
    { name: 'Tricep Dips (Chair)', sets: 3, reps: 8 },
    { name: 'Pike Hold', sets: 3, duration_min: 0.33 },
  ],
  stats: [Stat.STR],
};

const PUSH_INTERMEDIATE: ExerciseTemplate = {
  exercises: [
    { name: 'Push-ups', sets: 4, reps: 15 },
    { name: 'Diamond Push-ups', sets: 3, reps: 10 },
    { name: 'Pike Push-ups', sets: 3, reps: 10 },
    { name: 'Tricep Dips (Chair)', sets: 3, reps: 15 },
    { name: 'Decline Push-ups', sets: 3, reps: 12 },
  ],
  stats: [Stat.STR],
};

const PUSH_ADVANCED: ExerciseTemplate = {
  exercises: [
    { name: 'Explosive Push-ups', sets: 4, reps: 12 },
    { name: 'Archer Push-ups', sets: 3, reps: 8 },
    { name: 'Handstand Push-up Negatives', sets: 3, reps: 5 },
    { name: 'Pseudo Planche Push-ups', sets: 3, reps: 8 },
    { name: 'Hindu Push-ups', sets: 3, reps: 12 },
    { name: 'Tricep Diamond Push-ups (Elevated)', sets: 3, reps: 10 },
  ],
  stats: [Stat.STR],
};

// --- PULL / BACK DAYS (Home equipment-free) ---
const PULL_BEGINNER: ExerciseTemplate = {
  exercises: [
    { name: 'Superman Hold', sets: 3, duration_min: 0.5 },
    { name: 'Prone Y-Raises', sets: 3, reps: 12 },
    { name: 'Towel Rows (Door)', sets: 3, reps: 10 },
    { name: 'Reverse Snow Angels', sets: 3, reps: 12 },
    { name: 'Back Extensions (Floor)', sets: 3, reps: 15 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

const PULL_INTERMEDIATE: ExerciseTemplate = {
  exercises: [
    { name: 'Towel Rows (Door)', sets: 4, reps: 12 },
    { name: 'Superman Pulses', sets: 3, reps: 20 },
    { name: 'Prone T-Raises', sets: 3, reps: 15 },
    { name: 'Inverted Rows (Table)', sets: 3, reps: 10 },
    { name: 'Doorframe Rows', sets: 3, reps: 12 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

const PULL_ADVANCED: ExerciseTemplate = {
  exercises: [
    { name: 'Inverted Rows (Table)', sets: 4, reps: 15 },
    { name: 'Towel Bicep Curls (Isometric)', sets: 3, reps: 12 },
    { name: 'Bodyweight Rear Delt Flyes', sets: 3, reps: 15 },
    { name: 'Superman Hold (Weighted)', sets: 3, duration_min: 0.75 },
    { name: 'Doorframe Pull-up Holds', sets: 4, duration_min: 0.5 },
    { name: 'Commando Rows (Floor)', sets: 3, reps: 10 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

// --- LEG DAYS ---
const LEGS_BEGINNER: ExerciseTemplate = {
  exercises: [
    { name: 'Bodyweight Squats', sets: 3, reps: 15 },
    { name: 'Lunges', sets: 3, reps: 10 },
    { name: 'Glute Bridges', sets: 3, reps: 15 },
    { name: 'Wall Sit', sets: 3, duration_min: 0.5 },
    { name: 'Calf Raises', sets: 3, reps: 20 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

const LEGS_INTERMEDIATE: ExerciseTemplate = {
  exercises: [
    { name: 'Jump Squats', sets: 3, reps: 12 },
    { name: 'Bulgarian Split Squats (Chair)', sets: 3, reps: 10 },
    { name: 'Single-Leg Glute Bridges', sets: 3, reps: 12 },
    { name: 'Walking Lunges', sets: 3, reps: 14 },
    { name: 'Wall Sit', sets: 3, duration_min: 0.75 },
    { name: 'Calf Raises (Single Leg)', sets: 3, reps: 15 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

const LEGS_ADVANCED: ExerciseTemplate = {
  exercises: [
    { name: 'Pistol Squat Progressions', sets: 3, reps: 6 },
    { name: 'Jump Lunges', sets: 4, reps: 12 },
    { name: 'Shrimp Squats', sets: 3, reps: 8 },
    { name: 'Nordic Curl Negatives', sets: 3, reps: 6 },
    { name: 'Single-Leg Calf Raises', sets: 3, reps: 20 },
    { name: 'Explosive Box Step-ups (Chair)', sets: 3, reps: 10 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

// --- FULL BODY DAYS ---
const FULLBODY_BEGINNER: ExerciseTemplate = {
  exercises: [
    { name: 'Push-ups', sets: 3, reps: 10 },
    { name: 'Bodyweight Squats', sets: 3, reps: 15 },
    { name: 'Plank', sets: 3, duration_min: 0.5 },
    { name: 'Glute Bridges', sets: 3, reps: 12 },
    { name: 'Superman Hold', sets: 3, duration_min: 0.33 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

const FULLBODY_INTERMEDIATE: ExerciseTemplate = {
  exercises: [
    { name: 'Burpees', sets: 3, reps: 10 },
    { name: 'Push-ups', sets: 4, reps: 15 },
    { name: 'Jump Squats', sets: 3, reps: 12 },
    { name: 'Mountain Climbers', sets: 3, duration_min: 0.5 },
    { name: 'Plank to Push-up', sets: 3, reps: 10 },
    { name: 'Towel Rows (Door)', sets: 3, reps: 12 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

const FULLBODY_ADVANCED: ExerciseTemplate = {
  exercises: [
    { name: 'Burpee Tuck Jumps', sets: 4, reps: 10 },
    { name: 'Explosive Push-ups', sets: 4, reps: 12 },
    { name: 'Pistol Squat Progressions', sets: 3, reps: 6 },
    { name: 'L-Sit Hold', sets: 3, duration_min: 0.33 },
    { name: 'Inverted Rows (Table)', sets: 4, reps: 12 },
    { name: 'Plank (Weighted)', sets: 3, duration_min: 1 },
  ],
  stats: [Stat.STR, Stat.VIT],
};

// --- HIIT / CARDIO DAYS ---
const HIIT_BEGINNER: ExerciseTemplate = {
  exercises: [
    { name: 'Jumping Jacks', sets: 3, duration_min: 1 },
    { name: 'High Knees', sets: 3, duration_min: 0.5 },
    { name: 'Mountain Climbers', sets: 3, duration_min: 0.5 },
    { name: 'Squat Jumps', sets: 3, reps: 10 },
    { name: 'Butt Kicks', sets: 3, duration_min: 0.5 },
  ],
  stats: [Stat.AGI, Stat.VIT],
};

const HIIT_INTERMEDIATE: ExerciseTemplate = {
  exercises: [
    { name: 'Burpees', sets: 4, reps: 10 },
    { name: 'Tuck Jumps', sets: 3, reps: 10 },
    { name: 'Skater Jumps', sets: 3, reps: 12 },
    { name: 'High Knees Sprint', sets: 4, duration_min: 0.5 },
    { name: 'Mountain Climbers', sets: 4, duration_min: 0.5 },
    { name: 'Lateral Shuffles', sets: 3, duration_min: 0.5 },
  ],
  stats: [Stat.AGI, Stat.VIT],
};

const HIIT_ADVANCED: ExerciseTemplate = {
  exercises: [
    { name: 'Burpee Broad Jumps', sets: 4, reps: 8 },
    { name: 'Switch Lunges', sets: 4, reps: 16 },
    { name: 'Tuck Jumps', sets: 4, reps: 12 },
    { name: 'Speed Skaters', sets: 4, reps: 16 },
    { name: 'Sprint in Place', sets: 5, duration_min: 0.5 },
    { name: 'Star Jumps', sets: 3, reps: 12 },
  ],
  stats: [Stat.AGI, Stat.VIT],
};

// --- CORE DAYS ---
const CORE_BEGINNER: ExerciseTemplate = {
  exercises: [
    { name: 'Crunches', sets: 3, reps: 15 },
    { name: 'Plank', sets: 3, duration_min: 0.5 },
    { name: 'Bicycle Crunches', sets: 3, reps: 12 },
    { name: 'Dead Bug', sets: 3, reps: 10 },
    { name: 'Flutter Kicks', sets: 3, reps: 20 },
  ],
  stats: [Stat.VIT, Stat.STR],
};

const CORE_INTERMEDIATE: ExerciseTemplate = {
  exercises: [
    { name: 'Leg Raises', sets: 3, reps: 12 },
    { name: 'Side Plank', sets: 3, duration_min: 0.5 },
    { name: 'Russian Twists', sets: 3, reps: 20 },
    { name: 'Plank', sets: 3, duration_min: 1 },
    { name: 'V-ups', sets: 3, reps: 10 },
    { name: 'Mountain Climbers', sets: 3, duration_min: 0.5 },
  ],
  stats: [Stat.VIT, Stat.STR],
};

const CORE_ADVANCED: ExerciseTemplate = {
  exercises: [
    { name: 'Hanging Knee Raises (Doorframe)', sets: 4, reps: 12 },
    { name: 'Dragon Flags (Negative)', sets: 3, reps: 5 },
    { name: 'Ab Wheel Rollouts', sets: 3, reps: 10 },
    { name: 'L-Sit Hold', sets: 3, duration_min: 0.33 },
    { name: 'Plank (Weighted)', sets: 3, duration_min: 1 },
    { name: 'Windshield Wipers', sets: 3, reps: 10 },
  ],
  stats: [Stat.VIT, Stat.STR],
};

// --- REST / ACTIVE RECOVERY ---
const REST_DAY: ExerciseTemplate = {
  exercises: [
    { name: 'Light Walk', duration_min: 15 },
    { name: 'Full-Body Stretch', duration_min: 10 },
    { name: 'Deep Breathing', duration_min: 5 },
    { name: 'Foam Roll / Self-Massage', duration_min: 5 },
  ],
  stats: [Stat.VIT, Stat.PER],
};

// ============================================================
// DIFFICULTY SELECTOR
// ============================================================

type DayType = 'push' | 'pull' | 'legs' | 'fullbody' | 'hiit' | 'core';

function getTemplateForDayType(dayType: DayType, difficulty: Difficulty): ExerciseTemplate {
  const map: Record<DayType, Record<Difficulty, ExerciseTemplate>> = {
    push: { beginner: PUSH_BEGINNER, intermediate: PUSH_INTERMEDIATE, advanced: PUSH_ADVANCED },
    pull: { beginner: PULL_BEGINNER, intermediate: PULL_INTERMEDIATE, advanced: PULL_ADVANCED },
    legs: { beginner: LEGS_BEGINNER, intermediate: LEGS_INTERMEDIATE, advanced: LEGS_ADVANCED },
    fullbody: { beginner: FULLBODY_BEGINNER, intermediate: FULLBODY_INTERMEDIATE, advanced: FULLBODY_ADVANCED },
    hiit: { beginner: HIIT_BEGINNER, intermediate: HIIT_INTERMEDIATE, advanced: HIIT_ADVANCED },
    core: { beginner: CORE_BEGINNER, intermediate: CORE_INTERMEDIATE, advanced: CORE_ADVANCED },
  };
  return map[dayType][difficulty];
}

// Day type rotation for 6-day training cycle
const DAY_TYPE_CYCLE: DayType[] = ['push', 'pull', 'legs', 'fullbody', 'hiit', 'core'];

// Workout name prefixes per day type
const DAY_TYPE_NAMES: Record<DayType, string> = {
  push: 'Push Day — Upper Press',
  pull: 'Pull Day — Back & Grip',
  legs: 'Leg Day — Lower Power',
  fullbody: 'Full Body — Total Combat',
  hiit: 'HIIT — Shadow Speed',
  core: 'Core — Iron Center',
};

// ============================================================
// PROGRESSIVE OVERLOAD SCALER
// ============================================================

/**
 * Apply progressive overload to exercises based on day number.
 * Increases reps/sets slightly as the plan progresses.
 */
function applyProgression(exercises: Exercise[], dayNumber: number, totalDays: number): Exercise[] {
  const progress = dayNumber / totalDays; // 0 → 1
  const repMultiplier = 1 + progress * 0.3; // Up to 30% more reps
  const setBonus = progress > 0.6 ? 1 : 0; // Extra set in final 40%

  return exercises.map((ex) => ({
    ...ex,
    reps: ex.reps ? Math.round(ex.reps * repMultiplier) : undefined,
    sets: ex.sets ? ex.sets + setBonus : undefined,
  }));
}

// ============================================================
// MAIN GENERATOR
// ============================================================

function getPhaseForDay(day: number, planType: PlanType): PhaseConfig {
  const phases = planType === '100day' ? PHASES_100DAY : PHASES_365DAY;
  return phases.find((p) => day >= p.dayRange[0] && day <= p.dayRange[1]) || phases[phases.length - 1];
}

/**
 * Generate all workouts for a given plan type.
 * Returns an array of WorkoutSeed objects, one per day.
 */
export function generateWorkoutsForPlan(planType: PlanType): WorkoutSeed[] {
  const meta = PLAN_METADATA[planType];
  const totalDays = meta.totalDays;
  const workouts: WorkoutSeed[] = [];

  let trainingDayIndex = 0; // Tracks position in the 6-day cycle

  for (let day = 1; day <= totalDays; day++) {
    const week = Math.ceil(day / 7);
    const dayOfWeek = ((day - 1) % 7) + 1; // 1=Mon ... 7=Sun
    const phase = getPhaseForDay(day, planType);
    const isRestDay = dayOfWeek === 7; // Every 7th day is active recovery

    let template: ExerciseTemplate;
    let dayType: DayType | 'rest';
    let workoutName: string;

    if (isRestDay) {
      template = REST_DAY;
      dayType = 'rest';
      workoutName = 'Active Recovery — Restoration';
    } else {
      dayType = DAY_TYPE_CYCLE[trainingDayIndex % DAY_TYPE_CYCLE.length];
      template = getTemplateForDayType(dayType, phase.difficulty);
      workoutName = DAY_TYPE_NAMES[dayType];
      trainingDayIndex++;
    }

    // Apply progressive overload for training days
    const exercises = isRestDay
      ? template.exercises
      : applyProgression(template.exercises, day, totalDays);

    // Calculate XP
    const dayInPhase = day - phase.dayRange[0];
    const xp = isRestDay
      ? 20
      : Math.round(phase.xpBase + dayInPhase * phase.xpGrowth);

    workouts.push({
      id: `${planType}-d${day}`,
      planId: meta.id,
      name: workoutName,
      dayNumber: day,
      week,
      dayOfWeek,
      phase: phase.name,
      exercises,
      difficulty: phase.difficulty,
      xpValue: xp,
      stats: template.stats,
      isRestDay,
    });
  }

  return workouts;
}

/**
 * Get the phase information for a given day number.
 */
export function getPlanPhaseInfo(
  planType: PlanType,
  dayNumber: number
): { name: string; difficulty: Difficulty; startDay: number; endDay: number } {
  const phase = getPhaseForDay(dayNumber, planType);
  return {
    name: phase.name,
    difficulty: phase.difficulty,
    startDay: phase.dayRange[0],
    endDay: phase.dayRange[1],
  };
}
