/**
 * Floating Ambient Embers — Subtle magical particle overlay
 * using Reanimated for performant ambient effects.
 * "Shadow Monarch's Forge" edition — warm ember particles.
 */

import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '@/constants/theme';

interface ParticleProps {
  color: string;
  size: number;
  startX: number;
  startY: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
}

function Particle({ color, size, startX, startY, driftX, driftY, duration, delay }: ParticleProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(driftX, { duration, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(driftY, { duration: duration * 0.8, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: duration * 0.8, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.7, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.1, { duration: duration * 0.5, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${startX}%`,
          top: `${startY}%`,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          boxShadow: `0px 0px ${size * 2}px 0px ${color}`,
        },
        animStyle,
      ]}
    />
  );
}

/* ─────────────── PARTICLE FIELD ─────────────── */

interface ParticleFieldProps {
  /** Number of particles (keep low for performance, 4-8 is good) */
  count?: number;
  /** Particle color */
  color?: string;
  /** Container style overrides */
  style?: ViewStyle;
}

export function ParticleField({
  count = 6,
  color = Colors.dark.accent,
  style,
}: ParticleFieldProps) {
  const particles = useMemo(() => {
    const result: ParticleProps[] = [];
    for (let i = 0; i < count; i++) {
      result.push({
        color,
        size: 2.5 + Math.random() * 3.5,
        startX: Math.random() * 90 + 5,
        startY: Math.random() * 90 + 5,
        driftX: (Math.random() - 0.5) * 35,
        driftY: -10 - Math.random() * 25, // drift upward for ember effect
        duration: 3500 + Math.random() * 4000,
        delay: Math.random() * 2000,
      });
    }
    return result;
  }, [count, color]);

  return (
    <View style={[styles.field, style]} pointerEvents="none">
      {particles.map((p, i) => (
        <Particle key={i} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    ...StyleSheet.absoluteFill,
    overflow: 'hidden',
  },
});
