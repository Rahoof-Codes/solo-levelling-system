// ============================================================
// Workout Video Registry — Solo Leveling System
// Manages pre-workout intro video assets for training and recovery.
// When user clicks 'BEGIN DAY':
// - Regular training days randomly pick 1 of 7 or 8 high-energy intros.
// - Recovery days play the dedicated active recovery protocol video.
// ============================================================

export interface WorkoutVideoAsset {
  id: string;
  title: string;
  badgeText: string;
  badgeColor: string;
  nativeSource: any;
  webSource: string;
}

/**
 * Configure active number of training videos in rotation (7 or 8).
 * If you upload 7 videos (intro-1 to intro-7), set this to 7.
 * If you upload 8 videos (intro-1 to intro-8), set this to 8.
 */
export const ACTIVE_INTRO_COUNT: number = 8;

/**
 * Pre-workout intro video pool for regular training days.
 * Replace intro-1.mp4 through intro-8.mp4 in:
 * - assets/videos/ (for mobile)
 * - public/videos/ (for web)
 */
export const WORKOUT_INTRO_VIDEOS: WorkoutVideoAsset[] = [
  {
    id: 'intro-1',
    title: 'System Awakening I',
    badgeText: '⟨ SYSTEM AWAKENING I ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-1.mp4'),
    webSource: '/videos/intro-1.mp4',
  },
  {
    id: 'intro-2',
    title: 'System Awakening II',
    badgeText: '⟨ SYSTEM AWAKENING II ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-2.mp4'),
    webSource: '/videos/intro-2.mp4',
  },
  {
    id: 'intro-3',
    title: 'System Awakening III',
    badgeText: '⟨ SYSTEM AWAKENING III ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-3.mp4'),
    webSource: '/videos/intro-3.mp4',
  },
  {
    id: 'intro-4',
    title: 'System Awakening IV',
    badgeText: '⟨ SYSTEM AWAKENING IV ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-4.mp4'),
    webSource: '/videos/intro-4.mp4',
  },
  {
    id: 'intro-5',
    title: 'System Awakening V',
    badgeText: '⟨ SYSTEM AWAKENING V ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-5.mp4'),
    webSource: '/videos/intro-5.mp4',
  },
  {
    id: 'intro-6',
    title: 'System Awakening VI',
    badgeText: '⟨ SYSTEM AWAKENING VI ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-6.mp4'),
    webSource: '/videos/intro-6.mp4',
  },
  {
    id: 'intro-7',
    title: 'System Awakening VII',
    badgeText: '⟨ SYSTEM AWAKENING VII ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-7.mp4'),
    webSource: '/videos/intro-7.mp4',
  },
  {
    id: 'intro-8',
    title: 'System Awakening VIII',
    badgeText: '⟨ SYSTEM AWAKENING VIII ⟩',
    badgeColor: '#20C8FF',
    nativeSource: require('@/assets/videos/intro-8.mp4'),
    webSource: '/videos/intro-8.mp4',
  },
];

/**
 * Dedicated intro video for active recovery / rest days.
 * Replace recovery.mp4 in:
 * - assets/videos/recovery.mp4 (for mobile)
 * - public/videos/recovery.mp4 (for web)
 */
export const RECOVERY_INTRO_VIDEO: WorkoutVideoAsset = {
  id: 'recovery',
  title: 'Recovery Protocol',
  badgeText: '⟨ RECOVERY PROTOCOL ⟩',
  badgeColor: '#3BE7A1',
  nativeSource: require('@/assets/videos/recovery.mp4'),
  webSource: '/videos/recovery.mp4',
};

/**
 * Default fallback intro video (always uses the primary training video, NEVER the app splash intro.mp4).
 */
export const DEFAULT_INTRO_VIDEO: WorkoutVideoAsset = WORKOUT_INTRO_VIDEOS[0];

/**
 * Checks whether a given workout is an active recovery / rest day.
 * Recovery days are determined by:
 * 1. Workout name containing 'recovery', 'rest', 'restoration', or 'regeneration'
 * 2. Day 7 of each weekly cycle (e.g., day 7, 14, 21, ...)
 */
export function isRecoveryWorkout(workout?: { name?: string; day?: number } | null): boolean {
  if (!workout) return false;
  const name = (workout.name || '').toLowerCase();
  if (
    name.includes('recovery') ||
    name.includes('rest') ||
    name.includes('restoration') ||
    name.includes('regeneration')
  ) {
    return true;
  }
  if (typeof workout.day === 'number' && workout.day > 0 && workout.day % 7 === 0) {
    return true;
  }
  return false;
}

// Memory to avoid playing the exact same video twice in a row
let lastWorkoutVideoIndex = -1;

/**
 * Returns the appropriate intro video asset for a session:
 * - If isRecovery is true: returns the dedicated recovery video.
 * - Otherwise: selects a random video from the active training intros pool
 *   (intelligently avoiding immediate consecutive repeats).
 */
export function getRandomWorkoutVideo(isRecovery: boolean = false): WorkoutVideoAsset {
  if (isRecovery) {
    return RECOVERY_INTRO_VIDEO;
  }

  const pool = WORKOUT_INTRO_VIDEOS.slice(0, Math.max(1, ACTIVE_INTRO_COUNT));
  if (!pool.length) {
    return DEFAULT_INTRO_VIDEO;
  }
  if (pool.length === 1) {
    return pool[0];
  }

  // Pick random index avoiding immediate consecutive repeat
  let nextIndex = Math.floor(Math.random() * pool.length);
  if (nextIndex === lastWorkoutVideoIndex) {
    nextIndex = (nextIndex + 1 + Math.floor(Math.random() * (pool.length - 1))) % pool.length;
  }
  lastWorkoutVideoIndex = nextIndex;

  return pool[nextIndex] || DEFAULT_INTRO_VIDEO;
}
