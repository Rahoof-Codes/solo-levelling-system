// ============================================================
// Workout Intro Overlay — Solo System Pre-Workout Video
// Plays the high-energy Solo Leveling intro before workout starts
// Auto-dismisses upon completion or when SKIP is pressed.
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAudio } from '@/contexts/AudioContext';
import { Fonts } from '@/constants/theme';

interface WorkoutIntroOverlayProps {
  onFinish?: () => void;
}

const INTRO_VIDEO_ASSET = require('@/assets/videos/intro.mp4');

export function WorkoutIntroOverlay({ onFinish }: WorkoutIntroOverlayProps) {
  const [visible, setVisible] = useState(true);
  const finishTriggered = useRef(false);
  const onFinishRef = useRef(onFinish);
  const { setOpeningAnimationActive } = useAudio();

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Reanimated fade-out for smooth dismissal
  const opacity = useSharedValue(1);

  // Initialize expo-video player
  const player = useVideoPlayer(INTRO_VIDEO_ASSET, (p) => {
    try {
      p.loop = false;
      p.volume = 1.0;
      p.muted = false;
      p.play();
    } catch (err) {
      console.warn('[WorkoutIntroOverlay] Player init error:', err);
    }
  });

  const handleFinish = useCallback(() => {
    if (finishTriggered.current) return;
    finishTriggered.current = true;

    try {
      player.pause();
    } catch {}

    // Restore standard app audio
    setOpeningAnimationActive(false);

    // Smooth fade out
    opacity.value = withTiming(0, {
      duration: 260,
      easing: Easing.out(Easing.ease),
    });

    setTimeout(() => {
      setVisible(false);
      onFinishRef.current?.();
    }, 280);
  }, [player, setOpeningAnimationActive, opacity]);

  const handleFinishRef = useRef(handleFinish);
  useEffect(() => {
    handleFinishRef.current = handleFinish;
  }, [handleFinish]);

  useEffect(() => {
    try {
      player.play();
    } catch {}
  }, [player]);

  // Listen to video completion and error events
  useEffect(() => {
    if (!player) return;

    const playToEndSub = player.addListener('playToEnd', () => {
      handleFinishRef.current();
    });

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        try {
          player.play();
        } catch {}
      }
      if (status === 'error') {
        console.warn('[WorkoutIntroOverlay] Video playback error:', error);
        handleFinishRef.current();
      }
    });

    return () => {
      try {
        playToEndSub.remove();
        statusSub.remove();
      } catch {}
    };
  }, [player]);

  // Fallback safety timeout so user is never stuck
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      handleFinishRef.current();
    }, 6500);

    return () => {
      clearTimeout(fallbackTimer);
      try {
        player.pause();
      } catch {}
    };
  }, [player]);

  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.container, containerAnimStyle]}>
      <StatusBar hidden={true} translucent={true} backgroundColor="#000000" />

      {/* Full-screen video view */}
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        allowsPictureInPicture={false}
        nativeControls={false}
        contentFit="cover"
      />

      {/* Solo System top badge */}
      <View style={styles.topBadgeContainer}>
        <Text style={styles.topBadgeText}>⟨ SYSTEM AWAKENING ⟩</Text>
      </View>

      {/* Skip button for quick skipping */}
      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.7}
        onPress={handleFinish}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={styles.skipText}>SKIP ✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 999999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBadgeContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    left: 20,
    backgroundColor: 'rgba(5, 6, 17, 0.75)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.4)',
  },
  topBadgeText: {
    color: '#20C8FF',
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 32,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  skipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});
