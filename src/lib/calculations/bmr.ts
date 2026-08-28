import type { ActivityLevel, GoalType, MacroTargets, OnboardingData, Sex } from '@/types';

/**
 * Activity level multipliers for TDEE calculation.
 */
const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  exceedingly_active: 1.9,
};

/**
 * Goal type calorie adjustments and macro splits.
 */
const GOAL_CONFIG: Record<GoalType, {
  calorieOffset: number;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  label: string;
  emoji: string;
  description: string;
}> = {
  lose_weight: {
    calorieOffset: -500,
    proteinPct: 0.35,
    carbsPct: 0.35,
    fatPct: 0.30,
    label: 'Lose Weight',
    emoji: '🔥',
    description: 'Caloric deficit for fat loss. Higher protein to preserve muscle.',
  },
  maintain: {
    calorieOffset: 0,
    proteinPct: 0.30,
    carbsPct: 0.40,
    fatPct: 0.30,
    label: 'Maintain Weight',
    emoji: '⚖️',
    description: 'Balanced nutrition to maintain current physique.',
  },
  gain_weight: {
    calorieOffset: 500,
    proteinPct: 0.30,
    carbsPct: 0.45,
    fatPct: 0.25,
    label: 'Gain Weight',
    emoji: '💪',
    description: 'Caloric surplus for muscle growth. Higher carbs for energy.',
  },
};

export { GOAL_CONFIG };

/**
 * Activity level display labels.
 */
export const ACTIVITY_LEVEL_OPTIONS: {
  value: ActivityLevel;
  label: string;
  description: string;
  multiplier: number;
}[] = [
  {
    value: 'sedentary',
    label: 'Sedentary',
    description: 'Little to no exercise, desk job',
    multiplier: 1.2,
  },
  {
    value: 'lightly_active',
    label: 'Lightly Active',
    description: 'Light exercise 1–3 days/week',
    multiplier: 1.375,
  },
  {
    value: 'moderately_active',
    label: 'Moderately Active',
    description: 'Moderate exercise 3–5 days/week',
    multiplier: 1.55,
  },
  {
    value: 'very_active',
    label: 'Very Active',
    description: 'Hard exercise 6–7 days/week',
    multiplier: 1.725,
  },
  {
    value: 'exceedingly_active',
    label: 'Exceedingly Active',
    description: 'Intense daily training + physical job',
    multiplier: 1.9,
  },
];

/**
 * Calculate Basal Metabolic Rate using the Mifflin-St Jeor equation.
 *
 * Male:   BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
 * Female: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
 */
export function calculateBMR(
  weight_kg: number,
  height_cm: number,
  age: number,
  sex: Sex,
): number {
  const base = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  return Math.round(sex === 'male' ? base + 5 : base - 161);
}

/**
 * Calculate Total Daily Energy Expenditure.
 * TDEE = BMR × activity_multiplier
 */
export function calculateTDEE(
  bmr: number,
  activityLevel: ActivityLevel,
): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel]);
}

/**
 * Calculate daily macro targets from TDEE, adjusted by goal type.
 *
 * Lose weight: TDEE - 500 kcal, 35% protein / 35% carbs / 30% fat
 * Maintain:    TDEE as-is,      30% protein / 40% carbs / 30% fat
 * Gain weight: TDEE + 500 kcal, 30% protein / 45% carbs / 25% fat
 *
 * Protein: 4 cal/g, Carbs: 4 cal/g, Fat: 9 cal/g
 */
export function calculateMacros(
  tdee: number,
  goalType: GoalType = 'maintain',
): MacroTargets {
  const config = GOAL_CONFIG[goalType];
  const adjustedCalories = Math.max(1200, tdee + config.calorieOffset); // Floor at 1200 kcal

  return {
    daily_calories: adjustedCalories,
    protein_g: Math.round((adjustedCalories * config.proteinPct) / 4),
    carbs_g: Math.round((adjustedCalories * config.carbsPct) / 4),
    fat_g: Math.round((adjustedCalories * config.fatPct) / 9),
  };
}

/**
 * Run the full onboarding calculation pipeline.
 * Returns all computed nutrition values ready to save to the profile.
 */
export function computeOnboardingResults(data: OnboardingData): {
  bmr: number;
  tdee: number;
  macros: MacroTargets;
} {
  const bmr = calculateBMR(data.weight_kg, data.height_cm, data.age, data.sex);
  const tdee = calculateTDEE(bmr, data.activity_level);
  const macros = calculateMacros(tdee, data.goal_type);
  return { bmr, tdee, macros };
}

