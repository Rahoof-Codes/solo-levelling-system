// ============================================================
// Splash Overlay — Solo Leveling / Shadow Fitness Boot Screen
// ============================================================

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';

const { width, height } = Dimensions.get('window');

interface SplashOverlayProps {
  onFinish?: () => void;
}

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const [visible, setVisible] = useState(true);

  // Animation values
  const containerOpacity = useSharedValue(1);
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(15);
  const subTitleOpacity = useSharedValue(0);
  const pulseRingScale = useSharedValue(0.8);
  const pulseRingOpacity = useSharedValue(0);

  const hideOverlay = useCallback(() => {
    setVisible(false);
    if (onFinish) onFinish();
  }, [onFinish]);

  useEffect(() => {
    // 1. Initial glow pulse
    glowOpacity.value = withTiming(0.8, { duration: 400 });
    glowScale.value = withSpring(1.2, { damping: 10 });

    // 2. Pulse ring effect
    pulseRingOpacity.value = withSequence(
      withDelay(100, withTiming(0.9, { duration: 300 })),
      withTiming(0, { duration: 600 })
    );
    pulseRingScale.value = withDelay(100, withTiming(1.8, { duration: 800, easing: Easing.out(Easing.ease) }));

    // 3. Logo entrance
    logoOpacity.value = withDelay(150, withTiming(1, { duration: 400 }));
    logoScale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 160 }));

    // 4. Title entrance
    titleOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
    titleTranslateY.value = withDelay(400, withSpring(0, { damping: 14 }));

    // 5. Subtitle & Status
    subTitleOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));

    // 6. Fade out whole overlay after ~1.8 seconds
    containerOpacity.value = withDelay(
      1800,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(hideOverlay)();
        }
      })
    );

    // Hard fallback timeout: guarantee dismissal within 2.4s no matter what
    const fallbackTimer = setTimeout(() => {
      hideOverlay();
    }, 2400);

    return () => clearTimeout(fallbackTimer);
  }, [hideOverlay]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const glowAnimStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    opacity: pulseRingOpacity.value,
    transform: [{ scale: pulseRingScale.value }],
  }));

  const logoAnimStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnimStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subTitleAnimStyle = useAnimatedStyle(() => ({
    opacity: subTitleOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, containerAnimStyle]}>
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={hideOverlay}
      >
        {/* Background Energy Glow */}
        <Animated.View style={[styles.glowBackdrop, glowAnimStyle]} />

        {/* Pulsing Energy Ring */}
        <Animated.View style={[styles.pulseRing, ringAnimStyle]} />

        {/* Main Center Content */}
        <View style={styles.centerBox}>
          {/* Shadow Fitness Emblem */}
          <Animated.View style={[styles.emblemContainer, logoAnimStyle]}>
            <Image
              source={require('@/../assets/images/shadow-logo.png')}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>

          {/* System Tag */}
          <Animated.View style={subTitleAnimStyle}>
            <Text style={styles.systemTag}>[ SYSTEM INITIALIZATION ]</Text>
          </Animated.View>

          {/* Title */}
          <Animated.View style={[styles.titleWrapper, titleAnimStyle]}>
            <Text style={styles.mainTitle}>SHADOW</Text>
            <Text style={styles.subTitleAccent}>FITNESS</Text>
          </Animated.View>

          {/* Status Prompt */}
          <Animated.View style={[styles.statusWrapper, subTitleAnimStyle]}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>HUNTER MATRIX LOADED</Text>
          </Animated.View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#050711',
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  touchArea: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBackdrop: {
    position: 'absolute',
    width: width * 0.95,
    height: width * 0.95,
    borderRadius: (width * 0.95) / 2,
    backgroundColor: 'rgba(120, 40, 240, 0.22)',
    shadowColor: '#9040FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 60,
    elevation: 20,
  },
  pulseRing: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2.5,
    borderColor: '#9040FF',
  },
  centerBox: {
    alignItems: 'center',
    gap: 14,
  },
  emblemContainer: {
    width: 170,
    height: 170,
    borderRadius: 85,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#8A3FFC',
    shadowColor: '#8A3FFC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 24,
    elevation: 16,
    backgroundColor: '#070B14',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  systemTag: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    letterSpacing: 3,
    fontWeight: '800',
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 4,
  },
  subTitleAccent: {
    fontSize: 32,
    fontWeight: '900',
    color: '#9040FF',
    letterSpacing: 2,
  },
  statusWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(144, 64, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#4A1D8A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#00FF88',
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00FF88',
    letterSpacing: 1.5,
    fontWeight: '700',
  },
});
