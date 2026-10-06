// ============================================================
// Solo Leveling System Intro — Web Video Player Overlay
// Plays custom 4-5 second intro video automatically with audio
// Clean full-screen display with SKIP button only
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAudio } from '@/contexts/AudioContext';
import { Fonts } from '@/constants/theme';

interface SplashOverlayProps {
  onFinish?: () => void;
}

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
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

  // Autoplay with audio
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Start with unmuted audio enabled
    video.muted = false;
    video.volume = 1.0;

    const startPlay = () => {
      video.muted = false;
      video.volume = 1.0;
      const playPromise = video.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // If browser strictly blocks unmuted autoplay before any user gesture,
          // play temporarily so video does not freeze, and unmute on first gesture
          console.log('[SplashOverlay Web] Initial unmuted play pending user gesture:', err);
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

    // Ensure audio is unmuted on any user gesture (click, touch, keydown)
    const unmuteOnUserGesture = () => {
      if (video) {
        video.muted = false;
        video.volume = 1.0;
      }
    };

    window.addEventListener('pointerdown', unmuteOnUserGesture, { once: true, passive: true });
    window.addEventListener('click', unmuteOnUserGesture, { once: true, passive: true });
    window.addEventListener('touchstart', unmuteOnUserGesture, { once: true, passive: true });
    window.addEventListener('keydown', unmuteOnUserGesture, { once: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', unmuteOnUserGesture);
      window.removeEventListener('click', unmuteOnUserGesture);
      window.removeEventListener('touchstart', unmuteOnUserGesture);
      window.removeEventListener('keydown', unmuteOnUserGesture);
    };
  }, []);

  // Safety fallback timeout: transition automatically after 7s
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      handleFinishRef.current();
    }, 7000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Native HTML5 Video Element (served statically from public/intro.mp4 on web) */}
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
          console.warn('[SplashOverlay Web] Video error:', err);
          handleFinish();
        }}
      />

      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        activeOpacity={0.7}
        onPress={handleFinish}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
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
    zIndex: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    position: 'absolute',
    top: 24,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 100000,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
