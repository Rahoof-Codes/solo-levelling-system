import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { Fonts, Spacing } from '@/constants/theme';

interface StatusWindowProps {
  title?: string;
  children: React.ReactNode;
}

export function StatusWindow({
  title = 'Your Status',
  children,
}: StatusWindowProps) {
  // Breathing pulse for the status dot
  const dotScale = useSharedValue(1);
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.35, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(500).delay(100)}
      style={styles.windowFrame}
    >
      {/* Title Bar */}
      <View style={styles.titleBar}>
        <View style={styles.titleLeft}>
          <View style={styles.dotWrapper}>
            {/* Glow ring behind the dot */}
            <Animated.View style={[styles.dotGlow, dotAnimStyle]} />
            <View style={styles.statusDot} />
          </View>
          <Text style={styles.titleText}>{title}</Text>
        </View>
        <Text style={styles.systemTag}>Active</Text>
      </View>

      {/* Main Content Area */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  windowFrame: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
    paddingVertical: 12,
    paddingHorizontal: Spacing.threeHalf,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dotWrapper: {
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotGlow: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(0, 255, 136, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  titleText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    letterSpacing: 0.3,
  },
  systemTag: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#4B6282',
    letterSpacing: 0.5,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
});
