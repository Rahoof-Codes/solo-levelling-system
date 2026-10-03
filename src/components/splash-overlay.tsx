// ============================================================
// Solo Leveling Opening Animation — The System Awakening
// Inspired by the Solo Leveling Anime / Manhwa System Awakening
// ============================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';
import { useAudioPlayer } from 'expo-audio';
import { AUDIO_ASSETS } from '@/constants/audio';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SplashOverlayProps {
  onFinish?: () => void;
}

// Particle definition for rising mana embers
interface ManaEmber {
  id: number;
  initialX: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

const MANA_EMBERS: ManaEmber[] = [
  { id: 1, initialX: 0.15, size: 4, duration: 2400, delay: 100, color: '#F97316' },
  { id: 2, initialX: 0.30, size: 6, duration: 2800, delay: 300, color: '#A855F7' },
  { id: 3, initialX: 0.48, size: 3, duration: 2200, delay: 200, color: '#EF4444' },
  { id: 4, initialX: 0.65, size: 5, duration: 2600, delay: 50, color: '#FB923C' },
  { id: 5, initialX: 0.82, size: 4, duration: 3000, delay: 400, color: '#F59E0B' },
  { id: 6, initialX: 0.22, size: 5, duration: 2500, delay: 500, color: '#A855F7' },
  { id: 7, initialX: 0.74, size: 3, duration: 2700, delay: 350, color: '#F97316' },
];

function ManaEmberParticle({ ember }: { ember: ManaEmber }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const sway = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      ember.delay,
      withRepeat(
        withTiming(-SCREEN_HEIGHT * 0.75, {
          duration: ember.duration,
          easing: Easing.out(Easing.quad),
        }),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      ember.delay,
      withRepeat(
        withSequence(
          withTiming(0.85, { duration: ember.duration * 0.25 }),
          withTiming(0.9, { duration: ember.duration * 0.5 }),
          withTiming(0, { duration: ember.duration * 0.25 })
        ),
        -1,
        false
      )
    );

    sway.value = withDelay(
      ember.delay,
      withRepeat(
        withSequence(
          withTiming(15, { duration: ember.duration * 0.5, easing: Easing.inOut(Easing.sin) }),
          withTiming(-15, { duration: ember.duration * 0.5, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: sway.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.ember,
        {
          left: SCREEN_WIDTH * ember.initialX,
          bottom: SCREEN_HEIGHT * 0.15,
          width: ember.size,
          height: ember.size,
          borderRadius: ember.size / 2,
          backgroundColor: ember.color,
          shadowColor: ember.color,
        },
        animStyle,
      ]}
    />
  );
}

export function SplashOverlay({ onFinish }: SplashOverlayProps) {
  const [visible, setVisible] = useState(true);
  const finishTriggered = useRef(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  }, [onFinish]);

  // Audio triggers
  const { playAriseSound, setOpeningAnimationActive } = useAudio();
  const animationPlayer = useAudioPlayer(AUDIO_ASSETS.ANIMATION);

  // --- Animation Shared Values ---
  // Container & Global Flash
  const containerOpacity = useSharedValue(1);
  const flashOpacity = useSharedValue(0);

  // Phase 1: Jin-woo Eye Flare & Laser Scan
  const laserWidth = useSharedValue(0);
  const laserOpacity = useSharedValue(0);
  const eyeFlareScale = useSharedValue(0);
  const eyeFlareOpacity = useSharedValue(0);

  // Phase 2: Holographic System Notification Window
  const windowScaleY = useSharedValue(0);
  const windowOpacity = useSharedValue(0);
  const windowScanY = useSharedValue(-100);
  const textPhase1Opacity = useSharedValue(0);
  const textPhase2Opacity = useSharedValue(0);
  const systemStatusBlink = useSharedValue(1);

  // Phase 3: Shadow Monarch Crest & "ARISE" Sequence
  const crestOpacity = useSharedValue(0);
  const crestScale = useSharedValue(0.6);
  const crestGlowPulse = useSharedValue(0.8);
  const runeRotate = useSharedValue(0);
  const ariseTextOpacity = useSharedValue(0);
  const ariseTextScale = useSharedValue(0.7);
  const shockwaveScale = useSharedValue(0.8);
  const shockwaveOpacity = useSharedValue(0);

  const dismiss = useCallback(() => {
    if (finishTriggered.current) return;
    finishTriggered.current = true;

    try {
      animationPlayer.pause();
    } catch {}
    setOpeningAnimationActive(false);

    containerOpacity.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.ease) });

    setTimeout(() => {
      setVisible(false);
      onFinishRef.current?.();
    }, 340);
  }, [containerOpacity, animationPlayer, setOpeningAnimationActive]);

  const dismissRef = useRef(dismiss);
  useEffect(() => {
    dismissRef.current = dismiss;
  }, [dismiss]);

  useEffect(() => {
    // 0. Trigger Opening Animation Soundtrack on native devices (Animation.mp3)
    if (Platform.OS !== 'web') {
      try {
        animationPlayer.loop = false;
        animationPlayer.volume = 0.95;
        animationPlayer.seekTo(0);
        animationPlayer.play();
      } catch {}
    }

    // --- PHASE 1: JIN-WOO'S EYE FLARE & LASER SCAN (0ms - 650ms) ---
    laserOpacity.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(1200, withTiming(0, { duration: 300 }))
    );
    laserWidth.value = withTiming(SCREEN_WIDTH * 0.94, {
      duration: 550,
      easing: Easing.out(Easing.exp),
    });

    eyeFlareOpacity.value = withSequence(
      withTiming(1, { duration: 250 }),
      withTiming(0.4, { duration: 400 }),
      withTiming(0, { duration: 300 })
    );
    eyeFlareScale.value = withSequence(
      withTiming(1.6, { duration: 350, easing: Easing.out(Easing.quad) }),
      withTiming(0.8, { duration: 400 })
    );

    // --- PHASE 2: SYSTEM HOLOGRAPHIC WINDOW UNFOLDS (500ms - 1700ms) ---
    windowOpacity.value = withDelay(
      450,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(1100, withTiming(0, { duration: 350 }))
      )
    );
    windowScaleY.value = withDelay(
      450,
      withSequence(
        withTiming(1, { duration: 400, easing: Easing.out(Easing.back(1.2)) }),
        withDelay(1000, withTiming(0.05, { duration: 350 }))
      )
    );

    // Scanner beam across the holographic window
    windowScanY.value = withDelay(
      600,
      withTiming(120, { duration: 900, easing: Easing.inOut(Easing.ease) })
    );

    // Blinking status indicator
    systemStatusBlink.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 350 }),
        withTiming(1, { duration: 350 })
      ),
      -1,
      true
    );

    textPhase1Opacity.value = withDelay(650, withTiming(1, { duration: 250 }));
    textPhase2Opacity.value = withDelay(900, withTiming(1, { duration: 300 }));

    // --- PHASE 3: SHADOW MONARCH CREST & "ARISE" (1700ms - 2900ms) ---
    crestOpacity.value = withDelay(
      1600,
      withSequence(
        withTiming(1, { duration: 400 }),
        withDelay(900, withTiming(0, { duration: 300 }))
      )
    );
    crestScale.value = withDelay(
      1600,
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.out(Easing.back(1.4)) }),
        withDelay(800, withTiming(1.15, { duration: 300 }))
      )
    );

    // Rotating runic circle
    runeRotate.value = withDelay(
      1600,
      withTiming(360, { duration: 1800, easing: Easing.linear })
    );

    // Arise sound effect on native devices (arise.mp3)
    const ariseTimer = setTimeout(() => {
      if (Platform.OS !== 'web') {
        try {
          playAriseSound();
        } catch {}
      }
    }, 1800);

    // Crest mana pulse
    crestGlowPulse.value = withDelay(
      1700,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 450, easing: Easing.inOut(Easing.sin) }),
          withTiming(0.8, { duration: 450, easing: Easing.inOut(Easing.sin) })
        ),
        -1,
        true
      )
    );

    // "ARISE" (일어나라) text revelation
    ariseTextOpacity.value = withDelay(
      1950,
      withSequence(
        withTiming(1, { duration: 350 }),
        withDelay(600, withTiming(0, { duration: 250 }))
      )
    );
    ariseTextScale.value = withDelay(
      1950,
      withTiming(1.05, { duration: 450, easing: Easing.out(Easing.quad) })
    );

    // Shockwave ring pulse
    shockwaveOpacity.value = withDelay(
      2000,
      withSequence(
        withTiming(0.9, { duration: 150 }),
        withTiming(0, { duration: 600, easing: Easing.out(Easing.ease) })
      )
    );
    shockwaveScale.value = withDelay(
      2000,
      withTiming(2.4, { duration: 750, easing: Easing.out(Easing.exp) })
    );

    // --- PHASE 4: DIMENSIONAL SHATTER & TRANSITION (2800ms - 3250ms) ---
    flashOpacity.value = withDelay(
      2700,
      withSequence(
        withTiming(0.85, { duration: 120 }),
        withTiming(0, { duration: 350 })
      )
    );

    containerOpacity.value = withDelay(
      2850,
      withTiming(0, { duration: 350, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) {
          // Trigger dismissal
        }
      })
    );

    // Guaranteed fallback timer
    const completeTimer = setTimeout(() => {
      dismissRef.current();
    }, 3200);

    return () => {
      clearTimeout(completeTimer);
      clearTimeout(ariseTimer);
      try {
        animationPlayer.pause();
      } catch {}
      setOpeningAnimationActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Animated Styles ---
  const containerAnimStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const flashAnimStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const laserAnimStyle = useAnimatedStyle(() => ({
    width: laserWidth.value,
    opacity: laserOpacity.value,
  }));

  const eyeFlareAnimStyle = useAnimatedStyle(() => ({
    opacity: eyeFlareOpacity.value,
    transform: [{ scale: eyeFlareScale.value }],
  }));

  const windowAnimStyle = useAnimatedStyle(() => ({
    opacity: windowOpacity.value,
    transform: [{ scaleY: windowScaleY.value }],
  }));

  const windowScanAnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: windowScanY.value }],
  }));

  const systemStatusDotAnimStyle = useAnimatedStyle(() => ({
    opacity: systemStatusBlink.value,
  }));

  const textPhase1AnimStyle = useAnimatedStyle(() => ({
    opacity: textPhase1Opacity.value,
  }));

  const textPhase2AnimStyle = useAnimatedStyle(() => ({
    opacity: textPhase2Opacity.value,
  }));

  const crestAnimStyle = useAnimatedStyle(() => ({
    opacity: crestOpacity.value,
    transform: [{ scale: crestScale.value }],
  }));

  const crestGlowAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: crestGlowPulse.value }],
    opacity: interpolate(crestGlowPulse.value, [0.8, 1.3], [0.6, 1]),
  }));

  const runeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${runeRotate.value}deg` }],
  }));

  const ariseAnimStyle = useAnimatedStyle(() => ({
    opacity: ariseTextOpacity.value,
    transform: [{ scale: ariseTextScale.value }],
  }));

  const shockwaveAnimStyle = useAnimatedStyle(() => ({
    opacity: shockwaveOpacity.value,
    transform: [{ scale: shockwaveScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, containerAnimStyle]}>
      {/* Full screen touch area allows instant skip anywhere */}
      <TouchableOpacity
        style={styles.touchArea}
        activeOpacity={1}
        onPress={dismiss}
      >
        {/* Rising Mana Embers */}
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {MANA_EMBERS.map((ember) => (
            <ManaEmberParticle key={ember.id} ember={ember} />
          ))}
        </View>

        {/* Ambient Dark Aura Vignette */}
        <View style={styles.ambientVignette} pointerEvents="none" />

        {/* Top-Right "SKIP" Badge */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={dismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.skipText}>SKIP ➔</Text>
        </TouchableOpacity>

        {/* ============================================================ */}
        {/* PHASE 1: JIN-WOO'S EYE FLARE & LASER SCAN LINE               */}
        {/* ============================================================ */}
        <Animated.View style={[styles.laserLine, laserAnimStyle]} pointerEvents="none" />
        <Animated.View style={[styles.eyeFlareContainer, eyeFlareAnimStyle]} pointerEvents="none">
          <View style={styles.eyeFlareCore} />
          <View style={styles.eyeFlareGlow} />
          <View style={styles.eyeFlareRays} />
        </Animated.View>

        {/* ============================================================ */}
        {/* PHASE 2: HOLOGRAPHIC SYSTEM NOTIFICATION WINDOW              */}
        {/* ============================================================ */}
        <Animated.View style={[styles.systemWindow, windowAnimStyle]} pointerEvents="none">
          {/* Cybernetic Corner Brackets */}
          <View style={[styles.bracket, styles.bracketTL]} />
          <View style={[styles.bracket, styles.bracketTR]} />
          <View style={[styles.bracket, styles.bracketBL]} />
          <View style={[styles.bracket, styles.bracketBR]} />

          {/* Glowing Scanline */}
          <Animated.View style={[styles.scanLine, windowScanAnimStyle]} />

          {/* Window Header */}
          <View style={styles.windowHeader}>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeIcon}>!</Text>
            </View>
            <Text style={styles.windowTitle}>SYSTEM NOTIFICATION</Text>
            <View style={styles.windowHeaderRight}>
              <Animated.View style={[styles.statusDot, systemStatusDotAnimStyle]} />
              <Text style={styles.statusLiveText}>QUEST ARRIVED</Text>
            </View>
          </View>

          <View style={styles.windowDivider} />

          {/* Window Body */}
          <View style={styles.windowBody}>
            <Animated.View style={textPhase1AnimStyle}>
              <Text style={styles.qualifyHeading}>
                [ YOU HAVE QUALIFIED AS A PLAYER ]
              </Text>
            </Animated.View>

            <Animated.View style={textPhase2AnimStyle}>
              <Text style={styles.qualifySubtitle}>
                &ldquo;Will you accept the Daily Quest to begin your ascent?&rdquo;
              </Text>
              <View style={styles.playerMetaRow}>
                <Text style={styles.playerMetaLabel}>TARGET:</Text>
                <Text style={styles.playerMetaValue}>SHADOW MONARCH</Text>
                <Text style={styles.playerMetaTier}>RANK [E ➔ S]</Text>
              </View>
            </Animated.View>
          </View>

          {/* Bottom Cyber Bar */}
          <View style={styles.windowFooter}>
            <Text style={styles.footerCode}>SYS.INITIALIZE // SEQ_001</Text>
            <Text style={styles.footerAccepted}>[ AUTO-ACCEPTING... ]</Text>
          </View>
        </Animated.View>

        {/* ============================================================ */}
        {/* PHASE 3: SHADOW MONARCH CREST & "ARISE" SEQUENCE             */}
        {/* ============================================================ */}
        <Animated.View style={[styles.crestWrapper, crestAnimStyle]} pointerEvents="none">
          {/* Expanding Shockwave Energy Ring */}
          <Animated.View style={[styles.shockwaveRing, shockwaveAnimStyle]} />

          {/* Concentric Rotating Magic Rune Array */}
          <Animated.View style={[styles.runicArray, runeAnimStyle]}>
            <View style={styles.runicInnerRing} />
            <View style={styles.runicCrossH} />
            <View style={styles.runicCrossV} />
            <View style={[styles.runicTick, { top: 0, left: '50%' }]} />
            <View style={[styles.runicTick, { bottom: 0, left: '50%' }]} />
            <View style={[styles.runicTick, { left: 0, top: '50%' }]} />
            <View style={[styles.runicTick, { right: 0, top: '50%' }]} />
          </Animated.View>

          {/* Pulsing Mana Glow Backdrop */}
          <Animated.View style={[styles.crestGlowBackdrop, crestGlowAnimStyle]} />

          {/* Shadow Monarch Crest / Emblem */}
          <View style={styles.emblemBox}>
            <Image
              source={require('@/../assets/images/shadow-logo.png')}
              style={styles.emblemImage}
              resizeMode="cover"
            />
          </View>

          {/* "ARISE" (일어나라) Awakening Typography */}
          <Animated.View style={[styles.ariseContainer, ariseAnimStyle]}>
            <Text style={styles.ariseKorean}>일 어 나 라</Text>
            <Text style={styles.ariseTitle}>A R I S E</Text>
            <View style={styles.syncBadge}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>SHADOW SYSTEM // 100% SYNCHRONIZED</Text>
            </View>
          </Animated.View>
        </Animated.View>

        {/* ============================================================ */}
        {/* PHASE 4: FULL SCREEN WHITE/CYAN FLASH                        */}
        {/* ============================================================ */}
        <Animated.View style={[styles.fullscreenFlash, flashAnimStyle]} pointerEvents="none" />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#040711',
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
  ambientVignette: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.08)',
  },

  // --- Skip Button ---
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 36,
    right: 20,
    backgroundColor: 'rgba(7, 11, 20, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    zIndex: 100000,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 6,
  },
  skipText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    letterSpacing: 2,
  },

  // --- Mana Embers ---
  ember: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },

  // --- Jin-woo Eye Flare & Laser Scan ---
  laserLine: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 12,
    borderRadius: 2,
  },
  eyeFlareContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyeFlareCore: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  },
  eyeFlareGlow: {
    position: 'absolute',
    width: 90,
    height: 30,
    borderRadius: 45,
    backgroundColor: 'rgba(0, 240, 255, 0.45)',
  },
  eyeFlareRays: {
    position: 'absolute',
    width: 220,
    height: 4,
    backgroundColor: 'rgba(168, 85, 247, 0.8)',
    borderRadius: 2,
  },

  // --- Holographic System Notification Window ---
  systemWindow: {
    position: 'absolute',
    width: Math.min(SCREEN_WIDTH * 0.9, 440),
    backgroundColor: 'rgba(6, 14, 28, 0.94)',
    borderWidth: 1.5,
    borderColor: '#00A8FF',
    borderRadius: 12,
    padding: 16,
    overflow: 'hidden',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 24,
    elevation: 20,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: 'rgba(0, 240, 255, 0.6)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
  },

  // Cyber Corner Brackets
  bracket: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: '#00F0FF',
  },
  bracketTL: {
    top: 4,
    left: 4,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketTR: {
    top: 4,
    right: 4,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  bracketBL: {
    bottom: 4,
    left: 4,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  bracketBR: {
    bottom: 4,
    right: 4,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },

  // Window Content
  windowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 8,
  },
  alertBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 168, 255, 0.25)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBadgeIcon: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00F0FF',
    fontFamily: Fonts.mono,
  },
  windowTitle: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E0F2FE',
    letterSpacing: 2,
  },
  windowHeaderRight: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.25)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
  },
  statusLiveText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00FF88',
    letterSpacing: 1,
  },
  windowDivider: {
    height: 1,
    backgroundColor: 'rgba(0, 168, 255, 0.35)',
    marginVertical: 6,
  },
  windowBody: {
    paddingVertical: 10,
    gap: 10,
  },
  qualifyHeading: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.sans,
    color: '#00F0FF',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  qualifySubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 19,
    fontStyle: 'italic',
  },
  playerMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 4,
  },
  playerMetaLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 1,
  },
  playerMetaValue: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#38BDF8',
    letterSpacing: 1.5,
  },
  playerMetaTier: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#A855F7',
    letterSpacing: 1,
  },
  windowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 168, 255, 0.2)',
  },
  footerCode: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#475569',
    letterSpacing: 1,
  },
  footerAccepted: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00FF88',
    letterSpacing: 1,
  },

  // --- Phase 3: Shadow Monarch Crest & "ARISE" Sequence ---
  crestWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shockwaveRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 3,
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 20,
  },
  runicArray: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 1.5,
    borderColor: 'rgba(168, 85, 247, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runicInnerRing: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.4)',
    borderStyle: 'dashed',
  },
  runicCrossH: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  runicCrossV: {
    position: 'absolute',
    height: '100%',
    width: 1,
    backgroundColor: 'rgba(168, 85, 247, 0.3)',
  },
  runicTick: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F0FF',
    marginLeft: -3,
    marginTop: -3,
  },
  crestGlowBackdrop: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    backgroundColor: 'rgba(138, 63, 252, 0.28)',
    shadowColor: '#9040FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 60,
    elevation: 24,
  },
  emblemBox: {
    width: 150,
    height: 150,
    borderRadius: 75,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#8A3FFC',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 28,
    elevation: 20,
    backgroundColor: '#070B14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emblemImage: {
    width: '100%',
    height: '100%',
  },
  ariseContainer: {
    marginTop: 20,
    alignItems: 'center',
    gap: 6,
  },
  ariseKorean: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#C084FC',
    letterSpacing: 8,
  },
  ariseTitle: {
    fontSize: 34,
    fontWeight: '900',
    fontFamily: Fonts.sans,
    color: '#E0F2FE',
    letterSpacing: 10,
    textShadowColor: '#00F0FF',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(138, 63, 252, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginTop: 4,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
  },
  syncText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00FF88',
    letterSpacing: 1.5,
  },

  // --- Flash Overlay ---
  fullscreenFlash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E0F2FE',
  },
});
