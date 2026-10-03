/**
 * The System — Solo Leveling RPG Theme & Design System
 * "Shadow Monarch's Forge" — warm ember/crimson forge aesthetic
 * with volcanic warmth, ornate fire effects, and premium typography.
 */

import { Platform } from 'react-native';

/* ─────────────── COLOR SYSTEM ─────────────── */

export const Colors = {
  light: {
    // Forge depth backgrounds (deepest → lightest)
    background: '#0C0A09',
    backgroundDeep: '#080604',
    backgroundCard: '#1C1412',
    backgroundElement: '#231A15',
    backgroundSelected: '#2D211A',
    backgroundElevated: '#2A1E17',

    // Text hierarchy (warm whites)
    text: '#F0EAE4',
    textBright: '#FBF7F4',
    textSecondary: '#9C8B7E',
    textMuted: '#665A50',
    textDim: '#403530',

    // Borders (warm)
    border: '#2A1F1A',
    borderBright: '#3D302A',
    borderGlow: '#4D3D33',

    // Primary accent — Ember Orange
    accent: '#F97316',
    accentDim: '#C2410C',
    accentBright: '#FB923C',
    accentGlow: 'rgba(249, 115, 22, 0.35)',

    // System glow (crimson power)
    glow: '#EF4444',
    glowDim: '#DC2626',
    cyan: '#F59E0B',
    cyanDim: 'rgba(245, 158, 11, 0.25)',

    // Semantic
    danger: '#EF4444',
    dangerGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#22C55E',
    successGlow: 'rgba(34, 197, 94, 0.3)',
    warning: '#F59E0B',
    warningGlow: 'rgba(245, 158, 11, 0.3)',

    // RPG-specific
    mana: '#06B6D4',
    manaGlow: 'rgba(6, 182, 212, 0.4)',
    gold: '#F59E0B',
    goldBright: '#FBBF24',
    goldGlow: 'rgba(245, 158, 11, 0.4)',
    xp: '#FBBF24',
  },
  dark: {
    // Same as light — this app is always dark-mode
    background: '#0C0A09',
    backgroundDeep: '#080604',
    backgroundCard: '#1C1412',
    backgroundElement: '#231A15',
    backgroundSelected: '#2D211A',
    backgroundElevated: '#2A1E17',

    text: '#F0EAE4',
    textBright: '#FBF7F4',
    textSecondary: '#9C8B7E',
    textMuted: '#665A50',
    textDim: '#403530',

    border: '#2A1F1A',
    borderBright: '#3D302A',
    borderGlow: '#4D3D33',

    accent: '#F97316',
    accentDim: '#C2410C',
    accentBright: '#FB923C',
    accentGlow: 'rgba(249, 115, 22, 0.35)',

    glow: '#EF4444',
    glowDim: '#DC2626',
    cyan: '#F59E0B',
    cyanDim: 'rgba(245, 158, 11, 0.25)',

    danger: '#EF4444',
    dangerGlow: 'rgba(239, 68, 68, 0.3)',
    success: '#22C55E',
    successGlow: 'rgba(34, 197, 94, 0.3)',
    warning: '#F59E0B',
    warningGlow: 'rgba(245, 158, 11, 0.3)',

    mana: '#06B6D4',
    manaGlow: 'rgba(6, 182, 212, 0.4)',
    gold: '#F59E0B',
    goldBright: '#FBBF24',
    goldGlow: 'rgba(245, 158, 11, 0.4)',
    xp: '#FBBF24',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/* ─────────────── STAT COLORS ─────────────── */

export const StatColors = {
  STR: '#EF4444',     // Crimson — raw power
  VIT: '#22C55E',     // Emerald — life force
  AGI: '#F59E0B',     // Amber — speed & agility
  INT: '#06B6D4',     // Teal — intellect
  PER: '#F472B6',     // Rose — perception
} as const;

export const StatGlows = {
  STR: 'rgba(239, 68, 68, 0.35)',
  VIT: 'rgba(34, 197, 94, 0.35)',
  AGI: 'rgba(245, 158, 11, 0.35)',
  INT: 'rgba(6, 182, 212, 0.35)',
  PER: 'rgba(244, 114, 182, 0.35)',
} as const;

/* ─────────────── RANK COLORS ─────────────── */

export const RankColors = {
  E: '#78716C',       // Stone — baseline
  D: '#22C55E',       // Green — emerging
  C: '#06B6D4',       // Teal — competent
  B: '#A855F7',       // Purple — formidable
  A: '#F97316',       // Ember — elite
  S: '#EF4444',       // Crimson — legendary
} as const;

export const RankGlows = {
  E: 'rgba(120, 113, 108, 0.3)',
  D: 'rgba(34, 197, 94, 0.35)',
  C: 'rgba(6, 182, 212, 0.35)',
  B: 'rgba(168, 85, 247, 0.4)',
  A: 'rgba(249, 115, 22, 0.45)',
  S: 'rgba(239, 68, 68, 0.5)',
} as const;

/* ─────────────── FONTS ─────────────── */

export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
    display: 'System', // Will be overridden if Rajdhani loads
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
    display: 'sans-serif', // Will be overridden if Rajdhani loads
  },
  default: {
    sans: 'System',
    serif: 'serif',
    rounded: 'System',
    mono: 'monospace',
    display: 'System',
  },
  web: {
    sans: 'Inter, system-ui, -apple-system, sans-serif',
    serif: 'serif',
    rounded: 'Inter, system-ui, sans-serif',
    mono: "'JetBrains Mono', monospace",
    display: "'Rajdhani', 'Inter', system-ui, sans-serif",
  },
});

/* ─────────────── SPACING ─────────────── */

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  threeHalf: 20,
  four: 24,
  five: 32,
  six: 64,
} as const;

/* ─────────────── SHADOWS (boxShadow) ─────────────── */

export const Shadows = {
  /** Subtle depth for cards */
  card: {
    boxShadow: '0px 4px 12px 0px rgba(0, 0, 0, 0.4)',
    elevation: 8,
  },
  /** Deep forge shadow for elevated elements */
  dungeon: {
    boxShadow: '0px 8px 24px 0px rgba(0, 0, 0, 0.6)',
    elevation: 16,
  },
  /** Colored glow — pass an rgba color for best results */
  glow: (color: string, _intensity: number = 0.4) => ({
    boxShadow: `0px 0px 14px 0px ${color}`,
    elevation: 8,
  }),
  /** Inner-light feel for status elements */
  innerLight: {
    boxShadow: '0px 0px 8px 0px rgba(249, 115, 22, 0.15)',
    elevation: 4,
  },
} as const;

/* ─────────────── GRADIENT PRESETS ─────────────── */

export const Gradients = {
  /** Forge card background */
  dungeonCard: ['#1C1412', '#231A15', '#1C1412'],
  /** Ember accent gradient */
  enchanted: ['#C2410C', '#F97316', '#FB923C'],
  /** Legendary gold */
  legendary: ['#B45309', '#F59E0B', '#FBBF24'],
  /** Mana teal */
  mana: ['#0E7490', '#06B6D4', '#22D3EE'],
  /** Void/dark overlay */
  void: ['rgba(12,10,9,0.95)', 'rgba(28,20,18,0.85)', 'rgba(12,10,9,0.95)'],
  /** Vitality green */
  vitality: ['#15803D', '#22C55E', '#4ADE80'],
  /** Danger crimson */
  crimson: ['#DC2626', '#EF4444', '#F87171'],
  /** Tab bar */
  tabBar: ['#100D0B', '#0C0A09'],
} as const;

/* ─────────────── LAYOUT CONSTANTS ─────────────── */

export const BottomTabInset = Platform.select({ ios: 60, android: 80 }) ?? 70;
export const MaxContentWidth = 800;

/* ─────────────── FORGE CARD CONFIG ─────────────── */

export const ForgeCard = {
  borderWidth: 1.5,
  borderColor: '#3D302A',
  borderRadius: 20,
} as const;

/** Legacy alias — keeps existing imports working */
export const OrnateCard = {
  borderWidth: ForgeCard.borderWidth,
  borderColor: ForgeCard.borderColor,
  borderRadius: ForgeCard.borderRadius,
  innerBorderOffset: 3,
  innerBorderColor: 'rgba(249, 115, 22, 0.06)',
  cornerSize: 12,
  cornerColor: '#F97316',
} as const;
