// ============================================================
// Workout Duration Estimation — Timer Threshold Calculator
// 30 minutes is the default target time for training sessions.
// ============================================================

import type { Exercise } from '@/types';

export const DEFAULT_TRAINING_MINUTES = 30;
export const DEFAULT_TRAINING_SECONDS = 30 * 60; // 1800 seconds

export const MINIMUM_SESSION_MINUTES = 10;
export const MINIMUM_SESSION_SECONDS = 10 * 60; // 600 seconds (minimum lock time before completion unlocks)

/**
 * Workout duration in minutes (defaults to 30 minutes).
 */
export function estimateWorkoutDuration(_exercises?: Exercise[]): number {
  return DEFAULT_TRAINING_MINUTES;
}

/**
 * Get the minimum timer threshold in seconds before completion unlocks (10 minutes minimum).
 */
export function getMinimumTimerThreshold(_estimatedMinutes?: number): number {
  return MINIMUM_SESSION_SECONDS;
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

/**
 * Determine whether a quest requires a timer session (exercises and study/focus).
 * Quests like drinking water, food/nutrition, or simple habits do not require a timer.
 */
export function isTimedQuest(quest: { title: string; category?: string }): boolean {
  // Step quests are motion tracked via accelerometer/pedometer, not timer
  if (quest.title.toLowerCase().includes('step')) return false;

  const titleLower = quest.title.toLowerCase();
  const category = (quest.category || '').toLowerCase();

  // Drinking water, hydration, food, and nutrition are instant completions (no timer)
  if (
    category === 'food' ||
    titleLower.includes('water') ||
    titleLower.includes('drink') ||
    titleLower.includes('hydrat')
  ) {
    return false;
  }

  // Only exercises and study/focus require the timer session
  if (category === 'fitness' || category === 'study') {
    return true;
  }

  // Custom quests matching exercise or study/focus keywords
  return (
    titleLower.includes('workout') ||
    titleLower.includes('exercise') ||
    titleLower.includes('push-up') ||
    titleLower.includes('pushup') ||
    titleLower.includes('squat') ||
    titleLower.includes('pull-up') ||
    titleLower.includes('pullup') ||
    titleLower.includes('cardio') ||
    titleLower.includes('run') ||
    titleLower.includes('train') ||
    titleLower.includes('study') ||
    titleLower.includes('focus') ||
    titleLower.includes('deep work') ||
    titleLower.includes('read')
  );
}
