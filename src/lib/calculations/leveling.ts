// ============================================================
// Leveling & Rank System
// ============================================================

import { Rank } from '@/types';
import type { XPProgress } from '@/types';

/**
 * Base XP for level 1. Each subsequent level requires more XP.
 */
const BASE_XP = 100;

/**
 * Exponent for the XP curve. Higher = steeper scaling.
 */
const XP_EXPONENT = 1.5;

/**
 * Calculate the XP required to complete a specific level.
 * Formula: floor(BASE_XP × level^XP_EXPONENT)
 *
 * Level 1:  100 XP
 * Level 2:  283 XP
 * Level 5:  1,118 XP
 * Level 10: 3,162 XP
 */
export function xpRequiredForLevel(level: number): number {
  return Math.floor(BASE_XP * Math.pow(level, XP_EXPONENT));
}

/**
 * Calculate the cumulative XP needed to reach a given level from level 1.
 */
export function cumulativeXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += xpRequiredForLevel(i);
  }
  return total;
}

/**
 * Calculate the current level from total accumulated XP.
 */
export function calculateLevel(totalXP: number): number {
  let level = 1;
  let xpRemaining = totalXP;

  while (xpRemaining >= xpRequiredForLevel(level)) {
    xpRemaining -= xpRequiredForLevel(level);
    level++;
  }

  return level;
}

/**
 * Determine rank based on current level.
 *
 * E: Level 1–9
 * D: Level 10–19
 * C: Level 20–34
 * B: Level 35–49
 * A: Level 50–74
 * S: Level 75+
 */
export function calculateRank(level: number): Rank {
  if (level >= 75) return Rank.S;
  if (level >= 50) return Rank.A;
  if (level >= 35) return Rank.B;
  if (level >= 20) return Rank.C;
  if (level >= 10) return Rank.D;
  return Rank.E;
}

/**
 * Get the XP needed to reach the next level from the current level.
 */
export function xpForNextLevel(currentLevel: number): number {
  return xpRequiredForLevel(currentLevel);
}

/**
 * Calculate detailed XP progress for display.
 */
export function getXPProgress(totalXP: number): XPProgress {
  const currentLevel = calculateLevel(totalXP);
  const currentRank = calculateRank(currentLevel);
  const xpAtLevelStart = cumulativeXPForLevel(currentLevel);
  const xpInCurrentLevel = totalXP - xpAtLevelStart;
  const xpNeededForNextLevel = xpRequiredForLevel(currentLevel);
  const percentage =
    xpNeededForNextLevel > 0
      ? Math.min((xpInCurrentLevel / xpNeededForNextLevel) * 100, 100)
      : 0;

  return {
    currentLevel,
    currentRank,
    xpInCurrentLevel,
    xpNeededForNextLevel,
    percentage,
    totalXP,
  };
}

/**
 * Check if a rank change occurred between two levels.
 */
export function didRankChange(oldLevel: number, newLevel: number): boolean {
  return calculateRank(oldLevel) !== calculateRank(newLevel);
}

/**
 * Rank display info (color, title).
 */
export const RANK_INFO: Record<
  Rank,
  { color: string; title: string; minLevel: number }
> = {
  [Rank.E]: { color: '#888888', title: 'E-Rank Hunter', minLevel: 1 },
  [Rank.D]: { color: '#44aa44', title: 'D-Rank Hunter', minLevel: 10 },
  [Rank.C]: { color: '#4488ff', title: 'C-Rank Hunter', minLevel: 20 },
  [Rank.B]: { color: '#aa44ff', title: 'B-Rank Hunter', minLevel: 35 },
  [Rank.A]: { color: '#ffaa00', title: 'A-Rank Hunter', minLevel: 50 },
  [Rank.S]: { color: '#ff4444', title: 'S-Rank Hunter', minLevel: 75 },
};

/**
 * Stat display info (color, label, icon hint).
 */
export const STAT_INFO: Record<
  string,
  { color: string; label: string; description: string }
> = {
  STR: {
    color: '#ff4444',
    label: 'Strength',
    description: 'Physical power & lifting',
  },
  VIT: {
    color: '#00ff88',
    label: 'Vitality',
    description: 'Health, endurance & recovery',
  },
  AGI: {
    color: '#ffaa00',
    label: 'Agility',
    description: 'Speed, cardio & reflexes',
  },
  INT: {
    color: '#aa66ff',
    label: 'Intelligence',
    description: 'Study, learning & focus',
  },
  PER: {
    color: '#00ccff',
    label: 'Perception',
    description: 'Awareness, mindfulness & habits',
  },
};
