/**
 * The System — Solo Leveling Theme & Design System
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#E0E8FF',
    background: '#070B14',
    backgroundCard: '#0D1424',
    backgroundElement: '#131D33',
    backgroundSelected: '#1A294A',
    textSecondary: '#6B82A8',
    border: '#172744',
    glow: '#00A8FF',
    glowDim: '#0055AA',
    cyan: '#00F0FF',
    danger: '#FF3366',
    success: '#00FF88',
    mana: '#0088FF',
    gold: '#FFD700',
  },
  dark: {
    text: '#E0E8FF',
    background: '#070B14',
    backgroundCard: '#0D1424',
    backgroundElement: '#131D33',
    backgroundSelected: '#1A294A',
    textSecondary: '#6B82A8',
    border: '#172744',
    glow: '#00A8FF',
    glowDim: '#0055AA',
    cyan: '#00F0FF',
    danger: '#FF3366',
    success: '#00FF88',
    mana: '#0088FF',
    gold: '#FFD700',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const StatColors = {
  STR: '#FF4444',
  VIT: '#00FF88',
  AGI: '#FFAA00',
  INT: '#AA66FF',
  PER: '#00F0FF',
} as const;

export const RankColors = {
  E: '#7A8B9E',
  D: '#38B000',
  C: '#00A8FF',
  B: '#9D4EDD',
  A: '#FF9E00',
  S: '#FF0055',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  android: {
    sans: 'sans-serif',
    serif: 'serif',
    rounded: 'sans-serif-medium',
    mono: 'monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'Inter, system-ui, sans-serif',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: "'JetBrains Mono', monospace",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 60, android: 80 }) ?? 70;
export const MaxContentWidth = 800;
