/**
 * RPG UI Primitives — Reusable forge-themed card wrappers,
 * clean borders, section dividers, and headers.
 * "Shadow Monarch's Forge" edition — warm, clean, premium.
 */

import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Colors, Fonts, Spacing, ForgeCard } from '@/constants/theme';

/* ─────────────── DUNGEON CARD (Forge Edition) ─────────────── */

interface DungeonCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  accentColor?: string;
  /** Show ornate accent treatment (subtle top glow) */
  ornate?: boolean;
  /** Left accent stripe */
  accentStripe?: boolean;
  /** Glow effect on border */
  glowing?: boolean;
}

export function DungeonCard({
  children,
  style,
  accentColor = Colors.dark.accent,
  ornate = false,
  accentStripe = false,
  glowing = false,
}: DungeonCardProps) {
  return (
    <View
      style={[
        cardStyles.outer,
        glowing && {
          borderColor: accentColor,
          boxShadow: `0px 0px 20px 0px ${accentColor}55`,
        },
        style,
      ]}
    >
      {/* Subtle top glow for ornate cards */}
      {ornate && (
        <View
          style={[
            cardStyles.ornateGlow,
            { backgroundColor: accentColor },
          ]}
        />
      )}

      {/* Left accent stripe */}
      {accentStripe && (
        <View style={[cardStyles.accentStripe, { backgroundColor: accentColor }]} />
      )}

      {/* Content */}
      <View style={[cardStyles.content, accentStripe && { paddingLeft: Spacing.four }]}>
        {children}
      </View>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  outer: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: ForgeCard.borderRadius,
    borderWidth: ForgeCard.borderWidth,
    borderColor: ForgeCard.borderColor,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0px 4px 16px 0px rgba(0, 0, 0, 0.4)',
    elevation: 8,
  },
  ornateGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.4,
  },
  accentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: ForgeCard.borderRadius,
    borderBottomLeftRadius: ForgeCard.borderRadius,
  },
  content: {
    padding: Spacing.threeHalf,
  },
});

/* ─────────────── GLOW BORDER (Animated) ─────────────── */

interface GlowBorderProps {
  children: React.ReactNode;
  color?: string;
  intensity?: number;
  style?: ViewStyle;
}

export function GlowBorder({
  children,
  color = Colors.dark.accent,
  intensity = 0.4,
  style,
}: GlowBorderProps) {
  const glowOpacity = useSharedValue(intensity * 0.6);

  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(intensity, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(intensity * 0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [intensity]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[glowStyles.outerWrap, style]}>
      {/* Animated glow layer behind content */}
      <Animated.View
        style={[
          glowStyles.glowLayer,
          {
            borderColor: color,
            boxShadow: `0px 0px 20px 0px ${color}`,
          },
          animStyle,
        ]}
      />
      <View style={glowStyles.container}>
        {children}
      </View>
    </View>
  );
}

const glowStyles = StyleSheet.create({
  outerWrap: {
    position: 'relative',
  },
  glowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 1.5,
    borderRadius: ForgeCard.borderRadius,
    pointerEvents: 'none',
  },
  container: {
    borderRadius: ForgeCard.borderRadius,
    overflow: 'hidden',
  },
});

/* ─────────────── SECTION DIVIDER ─────────────── */

interface SectionDividerProps {
  color?: string;
  icon?: string;
  style?: ViewStyle;
}

export function SectionDivider({
  color = Colors.dark.borderBright,
  icon,
  style,
}: SectionDividerProps) {
  return (
    <View style={[dividerStyles.container, style]}>
      <View style={[dividerStyles.line, { backgroundColor: color }]} />
      {icon && (
        <View style={dividerStyles.iconContainer}>
          <Text style={[dividerStyles.icon, { color }]}>{icon}</Text>
        </View>
      )}
      <View style={[dividerStyles.line, { backgroundColor: color }]} />
    </View>
  );
}

const dividerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.5,
  },
  iconContainer: {
    paddingHorizontal: Spacing.two,
  },
  icon: {
    fontSize: 12,
    fontFamily: Fonts.sans,
  },
});

/* ─────────────── RPG SECTION HEADER ─────────────── */

interface RPGHeaderProps {
  title: string;
  subtitle?: string;
  color?: string;
  style?: ViewStyle;
}

export function RPGHeader({
  title,
  subtitle,
  color = Colors.dark.accent,
  style,
}: RPGHeaderProps) {
  return (
    <View style={[headerStyles.container, style]}>
      <View style={headerStyles.topRow}>
        <View style={[headerStyles.accentLine, { backgroundColor: color }]} />
        <Text style={[headerStyles.title, { color: Colors.dark.textBright }]}>
          {title}
        </Text>
        <View style={[headerStyles.accentLine, { backgroundColor: color }]} />
      </View>
      {subtitle && (
        <Text style={[headerStyles.subtitle, { color: Colors.dark.textMuted }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.two,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    width: '100%',
  },
  accentLine: {
    flex: 1,
    height: 1,
    opacity: 0.4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.display,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});
