// ============================================================
// Solo Leveling System Intro — Video Player Overlay
// Plays the custom 4-5 second intro video on app launch
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

interface SplashOverlayProps {
  onFinish?: () => void;
}

// Custom intro video asset located in assets/videos/intro.mp4
const INTRO_VIDEO_ASSET = require('@/assets/videos/intro.mp4');

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
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
      console.warn('[SplashOverlay] Error during player initialization:', err);
    }
  });

  const handleFinish = useCallback(() => {
    if (finishTriggered.current) return;
    finishTriggered.current = true;

    try {
      player.pause();
    } catch {}

    // Unlock BGM playback in AudioContext once intro completes
    setOpeningAnimationActive(false);

    // Smooth fade out
    opacity.value = withTiming(0, {
      duration: 300,
      easing: Easing.out(Easing.ease),
    });

    setTimeout(() => {
      setVisible(false);
      onFinishRef.current?.();
    }, 320);
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

    // Trigger completion as soon as the video reaches the end
    const playToEndSub = player.addListener('playToEnd', () => {
      handleFinishRef.current();
    });

    // Handle any playback error gracefully so app never freezes
    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay') {
        try {
          player.play();
        } catch {}
      }
      if (status === 'error') {
        console.warn('[SplashOverlay] Video playback error encountered:', error);
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

  // Safety fallback timeout: if the video stalls or reaches beyond 7s, proceed automatically
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      handleFinishRef.current();
    }, 7000);

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

  if (!visible) {
    return null;
  }

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

      {/* Skip button for quick skipping */}
      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.7}
        onPress={handleFinish}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 32,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
