// ============================================================
// Workout Duration Estimation — Timer Threshold Calculator
// 30 minutes is the default target time for training sessions.
// ============================================================

import type { Exercise } from '@/types';

export const DEFAULT_TRAINING_MINUTES = 30;
export const DEFAULT_TRAINING_SECONDS = 30 * 60; // 1800 seconds

/**
 * Workout duration in minutes (defaults to 30 minutes).
 */
export function estimateWorkoutDuration(_exercises?: Exercise[]): number {
  return DEFAULT_TRAINING_MINUTES;
}

/**
 * Get the target timer duration in seconds (30 minutes default).
 */
export function getMinimumTimerThreshold(estimatedMinutes: number = DEFAULT_TRAINING_MINUTES): number {
  return (estimatedMinutes || DEFAULT_TRAINING_MINUTES) * 60;
}

/**
 * Format seconds into MM:SS display string.
 *
 * @param totalSeconds - Seconds to format
 * @returns Formatted string like "05:30"
 */
export function formatTimerDisplay(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
