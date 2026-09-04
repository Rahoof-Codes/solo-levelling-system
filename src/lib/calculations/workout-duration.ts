// ============================================================
// Workout Duration Estimation — Timer Threshold Calculator
// Used by the Workout Session Modal to determine minimum
// exercise time before completion unlocks.
// ============================================================

import type { Exercise } from '@/types';

/**
 * Estimate the total workout duration in minutes from exercise list.
 *
 * Calculation:
 * - Rep-based exercises: (sets × reps × 3s per rep) + (sets × 45s rest between sets)
 * - Duration-based exercises: duration_min directly
 * - Adds 2-minute warm-up buffer
 *
 * @param exercises - Array of exercises from the workout
 * @returns Estimated duration in minutes (rounded up)
 */
export function estimateWorkoutDuration(exercises: Exercise[]): number {
  if (!exercises || exercises.length === 0) return 5; // minimum 5 min default

  let totalSeconds = 0;

  for (const ex of exercises) {
    if (ex.sets && ex.reps) {
      // Rep-based: ~3s per rep, 45s rest between sets
      const workTime = ex.sets * ex.reps * 3;
      const restTime = (ex.sets - 1) * 45;
      totalSeconds += workTime + restTime;
    } else if (ex.duration_min) {
      // Duration-based exercise
      totalSeconds += ex.duration_min * 60;
    } else if (ex.sets && ex.duration_min) {
      // Sets of timed holds (e.g. 3 sets × 30s plank)
      totalSeconds += ex.sets * ex.duration_min * 60 + (ex.sets - 1) * 30;
    } else {
      // Fallback: assume 3 minutes per unknown exercise
      totalSeconds += 180;
    }
  }

  // Add 2-minute warm-up buffer
  totalSeconds += 120;

  return Math.ceil(totalSeconds / 60);
}

/**
 * Calculate the minimum number of seconds the timer must run
 * before the "Complete Workout" button unlocks.
 *
 * Currently: 50% of estimated duration, with a floor of 3 minutes
 * and a cap of 45 minutes.
 *
 * @param estimatedMinutes - Estimated workout duration in minutes
 * @returns Minimum required seconds
 */
export function getMinimumTimerThreshold(estimatedMinutes: number): number {
  const halfDuration = Math.round((estimatedMinutes * 60) / 2);
  const floor = 3 * 60; // 3 minutes minimum
  const cap = 45 * 60;  // 45 minutes max

  return Math.min(Math.max(halfDuration, floor), cap);
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
