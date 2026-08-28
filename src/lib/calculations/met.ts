// ============================================================
// MET Values & Calorie Estimation
// ============================================================

import { ActivityType, Stat } from '@/types';

/**
 * Metabolic Equivalent of Task (MET) lookup table.
 * MET represents the energy cost of physical activities.
 * 1 MET ≈ 1 kcal/kg/hour at rest.
 */
export const MET_VALUES: Record<ActivityType, number> = {
  [ActivityType.WALKING]: 4.3, // brisk walking
  [ActivityType.RUNNING]: 7.0, // general jogging
  [ActivityType.CYCLING]: 6.0, // moderate effort
  [ActivityType.SWIMMING]: 5.8, // laps, general
  [ActivityType.LIFTING]: 3.5, // general/moderate
  [ActivityType.HIIT]: 8.0, // high intensity interval
  [ActivityType.YOGA]: 3.0, // general yoga
  [ActivityType.STUDY]: 1.3, // seated study/reading
  [ActivityType.MEDITATION]: 1.0, // seated meditation
  [ActivityType.OTHER]: 3.0, // general light activity
};

/**
 * Map each activity type to its primary stat for XP awards.
 */
export const ACTIVITY_STAT_MAP: Record<ActivityType, Stat> = {
  [ActivityType.RUNNING]: Stat.AGI,
  [ActivityType.WALKING]: Stat.VIT,
  [ActivityType.CYCLING]: Stat.AGI,
  [ActivityType.SWIMMING]: Stat.VIT,
  [ActivityType.LIFTING]: Stat.STR,
  [ActivityType.HIIT]: Stat.STR,
  [ActivityType.YOGA]: Stat.PER,
  [ActivityType.STUDY]: Stat.INT,
  [ActivityType.MEDITATION]: Stat.PER,
  [ActivityType.OTHER]: Stat.VIT,
};

/**
 * Calculate calories burned using the MET formula.
 *
 * Formula: calories = 0.0175 × MET × weight_kg × duration_min
 *
 * This is the standard oxygen-consumption-based formula that
 * converts MET values to actual caloric expenditure.
 */
export function calculateCaloriesBurned(
  met: number,
  weight_kg: number,
  duration_min: number,
): number {
  return Math.round(0.0175 * met * weight_kg * duration_min);
}

/**
 * Calculate XP earned from an activity based on duration and intensity.
 *
 * Base formula: XP = duration_min × MET_multiplier × 2
 * This makes harder/longer activities worth proportionally more XP.
 *
 * Examples:
 *   30 min jogging (MET 7.0): 30 × 7.0 × 2 = 420 → capped/scaled
 *   15 min HIIT (MET 8.0):    15 × 8.0 × 2 = 240
 *   60 min study (MET 1.3):   60 × 1.3 × 2 = 156
 */
export function calculateActivityXP(
  duration_min: number,
  met: number,
): number {
  // Scale: roughly 1 XP per minute for moderate activity (MET ~3.5)
  // Cap at 300 XP per activity to prevent abuse
  const rawXP = Math.round(duration_min * (met / 3.5));
  return Math.min(rawXP, 300);
}

/**
 * Get the MET value for an activity type.
 */
export function getMETValue(type: ActivityType): number {
  return MET_VALUES[type] ?? MET_VALUES[ActivityType.OTHER];
}

/**
 * Get the primary stat affected by an activity type.
 */
export function getActivityStat(type: ActivityType): Stat {
  return ACTIVITY_STAT_MAP[type] ?? Stat.VIT;
}

/**
 * Activity type display labels.
 */
export const ACTIVITY_TYPE_OPTIONS: {
  value: ActivityType;
  label: string;
  emoji: string;
  stat: Stat;
}[] = [
  { value: ActivityType.RUNNING, label: 'Running', emoji: '🏃', stat: Stat.AGI },
  { value: ActivityType.WALKING, label: 'Walking', emoji: '🚶', stat: Stat.VIT },
  { value: ActivityType.CYCLING, label: 'Cycling', emoji: '🚴', stat: Stat.AGI },
  { value: ActivityType.SWIMMING, label: 'Swimming', emoji: '🏊', stat: Stat.VIT },
  { value: ActivityType.LIFTING, label: 'Weight Lifting', emoji: '🏋️', stat: Stat.STR },
  { value: ActivityType.HIIT, label: 'HIIT', emoji: '⚡', stat: Stat.STR },
  { value: ActivityType.YOGA, label: 'Yoga', emoji: '🧘', stat: Stat.PER },
  { value: ActivityType.STUDY, label: 'Study', emoji: '📚', stat: Stat.INT },
  { value: ActivityType.MEDITATION, label: 'Meditation', emoji: '🧠', stat: Stat.PER },
  { value: ActivityType.OTHER, label: 'Other', emoji: '✨', stat: Stat.VIT },
];
