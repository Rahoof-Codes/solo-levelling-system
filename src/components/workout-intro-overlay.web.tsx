// ============================================================
// Workout Intro Overlay — Web Video Player
// Plays custom intro video before guided workout begins on Web
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAudio } from '@/contexts/AudioContext';
import { Fonts } from '@/constants/theme';

interface WorkoutIntroOverlayProps {
  onFinish?: () => void;
}

export function WorkoutIntroOverlay({ onFinish }: WorkoutIntroOverlayProps) {
  const [visible, setVisible] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const finishTriggered = useRef(false);
  const onFinishRef = useRef(onFinish);
  const { setOpeningAnimationActive } = useAudio();

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  const handleFinish = useCallback(() => {
    if (finishTriggered.current) return;
    finishTriggered.current = true;

    try {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    } catch {}

    setOpeningAnimationActive(false);
    setVisible(false);
    onFinishRef.current?.();
  }, [setOpeningAnimationActive]);

  const handleFinishRef = useRef(handleFinish);
  useEffect(() => {
    handleFinishRef.current = handleFinish;
  }, [handleFinish]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = false;
    video.volume = 1.0;

    const startPlay = () => {
      video.muted = false;
      video.volume = 1.0;
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.log('[WorkoutIntro Web] Initial unmuted play pending gesture:', err);
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    };

    if (video.readyState >= 2) {
      startPlay();
    } else {
      video.addEventListener('canplay', startPlay, { once: true });
      video.addEventListener('loadedmetadata', startPlay, { once: true });
    }

    const unmuteOnUserGesture = () => {
      if (video) {
        video.muted = false;
        video.volume = 1.0;
      }
    };

    window.addEventListener('pointerdown', unmuteOnUserGesture, { once: true, passive: true });
    window.addEventListener('click', unmuteOnUserGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', unmuteOnUserGesture);
      window.removeEventListener('click', unmuteOnUserGesture);
    };
  }, []);

  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      handleFinishRef.current();
    }, 6500);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <video
        ref={videoRef}
        src="/intro.mp4?v=2"
        autoPlay
        playsInline
        preload="auto"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          backgroundColor: '#000000',
        }}
        onEnded={handleFinish}
        onError={(err) => {
          console.warn('[WorkoutIntro Web] Video error:', err);
          handleFinish();
        }}
      />

      <View style={styles.topBadgeContainer}>
        <Text style={styles.topBadgeText}>⟨ SYSTEM AWAKENING ⟩</Text>
      </View>

      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.7}
        onPress={handleFinish}
        hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
      >
        <Text style={styles.skipText}>SKIP ✕</Text>
      </TouchableOpacity>
    </View>
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
    top: 28,
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
    top: 28,
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
