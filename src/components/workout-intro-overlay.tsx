// ============================================================
// Workout Intro Overlay — Solo System Pre-Workout Video
// Plays the high-energy Solo Leveling intro before workout starts
// Auto-dismisses upon completion or when SKIP is pressed.
// ============================================================

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import {
  WorkoutVideoAsset,
  getRandomWorkoutVideo,
} from '@/lib/workoutVideos';

interface WorkoutIntroOverlayProps {
  onFinish?: () => void;
  isRecovery?: boolean;
  videoAsset?: WorkoutVideoAsset;
}

export function WorkoutIntroOverlay({
  onFinish,
  isRecovery = false,
  videoAsset,
}: WorkoutIntroOverlayProps) {
  const [visible, setVisible] = useState(true);
  const finishTriggered = useRef(false);
  const onFinishRef = useRef(onFinish);
  const { setOpeningAnimationActive } = useAudio();

  // Stable video selection for this session
  const selectedVideo = useMemo(
    () => videoAsset || getRandomWorkoutVideo(isRecovery),
    [videoAsset, isRecovery]
  );

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Reanimated fade-out for smooth dismissal
  const opacity = useSharedValue(1);

  // Initialize expo-video player with selected video
  const player = useVideoPlayer(selectedVideo.nativeSource, (p) => {
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
      if (!player.playing) {
        player.play();
      }
    } catch {}
  }, [player]);

  // Listen to video completion and error events
  useEffect(() => {
    if (!player) return;

    const playToEndSub = player.addListener('playToEnd', () => {
      handleFinishRef.current();
    });

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'readyToPlay' && !player.playing) {
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

  // Fallback safety timeout so user is never stuck (dynamic up to video duration or 25s max)
  useEffect(() => {
    const timeoutMs = player.duration > 0 ? Math.max(6500, (player.duration + 2) * 1000) : 25000;
    const fallbackTimer = setTimeout(() => {
      handleFinishRef.current();
    }, timeoutMs);

    return () => {
      clearTimeout(fallbackTimer);
      try {
        player.pause();
      } catch {}
    };
  }, [player, player.duration]);

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
        surfaceType={Platform.OS === 'android' ? 'textureView' : 'surfaceView'}
      />

      {/* Solo System top badge with dynamic color & text */}
      <View
        style={[
          styles.topBadgeContainer,
          { borderColor: selectedVideo.badgeColor ? `${selectedVideo.badgeColor}66` : 'rgba(32, 200, 255, 0.4)' },
        ]}
      >
        <Text style={[styles.topBadgeText, { color: selectedVideo.badgeColor || '#20C8FF' }]}>
          {selectedVideo.badgeText}
        </Text>
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
