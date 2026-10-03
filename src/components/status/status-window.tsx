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
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { ParticleField } from '@/components/ui/particles';

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
  const glowPulse = useSharedValue(0.2);

  useEffect(() => {
    dotScale.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    dotOpacity.value = withRepeat(
      withSequence(
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    glowPulse.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.15, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const dotAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale.value }],
    opacity: dotOpacity.value,
  }));

  const glowOverlayStyle = useAnimatedStyle(() => ({
    opacity: glowPulse.value,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(600).delay(100)}
      style={styles.wrapper}
    >
      {/* Main frame */}
      <View style={styles.windowFrame}>
        {/* Animated glow overlay (replaces animated shadow) */}
        <Animated.View style={[styles.glowOverlay, glowOverlayStyle]} />

        {/* Particle ambient embers */}
        <ParticleField count={4} color={Colors.dark.accent} />

        {/* Title Bar */}
        <View style={styles.titleBar}>
          <View style={styles.titleLeft}>
            <View style={styles.dotWrapper}>
              <Animated.View style={[styles.dotGlow, dotAnimStyle]} />
              <View style={styles.statusDot} />
            </View>
            <Text style={styles.titleText}>{title}</Text>
          </View>
          <View style={styles.systemTagContainer}>
            <View style={styles.systemTagDot} />
            <Text style={styles.systemTag}>ACTIVE</Text>
          </View>
        </View>

        {/* Clean divider below title */}
        <View style={styles.titleDivider}>
          <View style={styles.dividerLine} />
          <View style={styles.dividerEmber} />
          <View style={styles.dividerLine} />
        </View>

        {/* Main Content Area */}
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // Extra space for glow to render
  },
  windowFrame: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.dark.borderBright,
    overflow: 'hidden',
    position: 'relative',
    boxShadow: '0px 4px 20px 0px rgba(0, 0, 0, 0.5)',
    elevation: 12,
  },
  glowOverlay: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: Colors.dark.accent,
    boxShadow: `0px 0px 24px 0px ${Colors.dark.accentGlow}`,
    pointerEvents: 'none',
    zIndex: 10,
  },
  titleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
    paddingVertical: 14,
    paddingHorizontal: Spacing.threeHalf,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dotWrapper: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotGlow: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.dark.success,
    boxShadow: `0px 0px 6px 0px ${Colors.dark.successGlow}`,
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  systemTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.15)',
  },
  systemTagDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.dark.success,
  },
  systemTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: Colors.dark.success,
    fontWeight: '700',
    letterSpacing: 1,
  },
  titleDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.threeHalf,
    paddingVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.dark.border,
  },
  dividerEmber: {
    width: 6,
    height: 6,
    backgroundColor: Colors.dark.accent,
    borderRadius: 3,
    marginHorizontal: 8,
    opacity: 0.5,
    boxShadow: `0px 0px 4px 0px ${Colors.dark.accentGlow}`,
  },
  content: {
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
  },
});
