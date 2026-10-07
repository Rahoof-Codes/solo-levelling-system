// ============================================================
// Study Focus View — Solo Leveling System Deep Work Protocol
// 45-Minute Focus Timer with Solo System aesthetics, circular
// progress track, pause/resume, and XP completion.
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import type { Quest } from '@/types';
import { Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';
import {
  DEFAULT_STUDY_SECONDS,
  formatTimerDisplay,
} from '@/lib/calculations/workout-duration';
import { speakVoiceGuidance } from '@/services/voiceGuidance';

interface StudyFocusViewProps {
  quest: Quest;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
}

export function StudyFocusView({
  quest,
  onComplete,
  onCancel,
}: StudyFocusViewProps) {
  const { playTouchSound, playClaimSound } = useAudio();

  // 45 minutes = 2700 seconds
  const targetDuration = DEFAULT_STUDY_SECONDS;
  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_STUDY_SECONDS);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Animation values
  const pulseScale = useSharedValue(1);
  const completeGlow = useSharedValue(0);

  // Announce start on mount
  useEffect(() => {
    speakVoiceGuidance('Deep Work protocol initiated. 45-minute focus session commenced. Zero distractions.');
    playTouchSound();
  }, [playTouchSound]);

  // Main 45-minute timer countdown & elapsed tracker
  useEffect(() => {
    if (!isPaused && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            // Timer complete!
            clearInterval(timerRef.current!);
            speakVoiceGuidance('System notification: Deep Work protocol cleared! Intelligence stat increased.');
            playClaimSound();
            if (Platform.OS !== 'web') {
              try { Vibration.vibrate([0, 150, 100, 250]); } catch {}
            }
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPaused, secondsRemaining, playClaimSound]);

  // Pulsing effects
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    completeGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.4, { duration: 1000 })
      ),
      -1,
      true
    );
  }, [pulseScale, completeGlow]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const isCompleted = secondsRemaining <= 0 || elapsedSeconds >= targetDuration;
  // Anti-cheat / early completion unlock after at least 10 minutes (600s) or when done
  const canComplete = elapsedSeconds >= 600 || isCompleted;

  const handleTogglePause = useCallback(() => {
    playTouchSound();
    setIsPaused((prev) => {
      const next = !prev;
      speakVoiceGuidance(next ? 'Focus session paused.' : 'Focus session resumed.');
      return next;
    });
  }, [playTouchSound]);

  const handleCompleteSession = useCallback(() => {
    playClaimSound();
    if (Platform.OS !== 'web') {
      try { Vibration.vibrate([0, 120, 80, 200]); } catch {}
    }
    onComplete(elapsedSeconds);
  }, [elapsedSeconds, onComplete, playClaimSound]);

  const handleAbandonPress = useCallback(() => {
    playTouchSound();
    if (elapsedSeconds < 5) {
      onCancel();
      return;
    }

    if (Platform.OS === 'web') {
      const confirmQuit = typeof window !== 'undefined'
        ? window.confirm("ABANDON DEEP WORK PROTOCOL?\nYour focus session progress will not be saved.")
        : true;
      if (confirmQuit) onCancel();
      return;
    }

    Alert.alert(
      'Abandon Deep Work?',
      'Your focus session progress will not be recorded.',
      [
        { text: 'Keep Focusing', style: 'cancel' },
        { text: 'Abandon', style: 'destructive', onPress: onCancel },
      ]
    );
  }, [elapsedSeconds, onCancel, playTouchSound]);

  // Progress fraction (0 to 1)
  const progressFraction = Math.max(0, Math.min(1, elapsedSeconds / targetDuration));

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.outerFrame}>
        {/* ────────── 1. HEADER ────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={handleAbandonPress}
            activeOpacity={0.7}
          >
            <Image
              source={require('@/../public/arrow-left.svg')}
              style={styles.backIcon}
              contentFit="contain"
            />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.systemTag}>⟨ SYSTEM PROTOCOL ⟩</Text>
            <Text style={styles.headerTitle}>DEEP WORK FOCUS</Text>
          </View>

          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{quest.xp_reward || 35} XP</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ────────── 2. OBJECTIVE BANNER ────────── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.objectiveCard}>
            <View style={styles.objectiveAccentStripe} />
            <View style={styles.objectiveTopRow}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>INTELLECT · DEEP WORK</Text>
              </View>
              <View style={styles.statChip}>
                <Text style={styles.statChipText}>STAT: INT</Text>
              </View>
            </View>

            <Text style={styles.objectiveTitle}>{quest.title || 'Deep Work / Study (45m)'}</Text>
            <Text style={styles.objectiveDesc}>
              {quest.description || 'Focus with zero distractions on learning, research, or cognitive craft.'}
            </Text>
          </Animated.View>

          {/* ────────── 3. CIRCULAR 45-MIN TIMER DIAL ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(100)} style={styles.timerCard}>
            <View style={styles.timerDial}>
              {/* Web SVG Circular Track */}
              {Platform.OS === 'web' ? (
                <View style={styles.webSvgWrapper}>
                  <svg
                    width="190"
                    height="190"
                    viewBox="0 0 190 190"
                    style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
                  >
                    {/* Background track */}
                    <circle
                      cx="95"
                      cy="95"
                      r="84"
                      stroke="#1A1F3C"
                      strokeWidth="8"
                      fill="none"
                    />
                    {/* Progress ring with neon glow */}
                    <circle
                      cx="95"
                      cy="95"
                      r="84"
                      stroke="#8B5CF6"
                      strokeWidth="8"
                      strokeDasharray={2 * Math.PI * 84}
                      strokeDashoffset={2 * Math.PI * 84 * (1 - progressFraction)}
                      strokeLinecap="round"
                      fill="none"
                      style={{
                        filter: 'drop-shadow(0px 0px 10px rgba(139, 92, 246, 0.7)) drop-shadow(0px 0px 18px rgba(32, 200, 255, 0.5))',
                        transition: 'stroke-dashoffset 0.4s ease',
                      }}
                    />
                  </svg>
                </View>
              ) : (
                <View style={styles.nativeRingContainer}>
                  <View style={styles.nativeTrackRing} />
                  <View
                    style={[
                      styles.nativeProgressRing,
                      {
                        borderColor: '#8B5CF6',
                        opacity: progressFraction > 0 ? 1 : 0.4,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Digital Countdown Center */}
              <Animated.View style={[styles.timerTextContainer, !isPaused && pulseStyle]}>
                <Text style={styles.timerMainNumber}>
                  {formatTimerDisplay(secondsRemaining)}
                </Text>
                <Text style={styles.timerSubLabel}>
                  {isPaused ? 'SESSION PAUSED' : '45-MIN FOCUS DURATION'}
                </Text>
              </Animated.View>
            </View>

            {/* Session Stats Bar */}
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>ELAPSED</Text>
                <Text style={styles.statVal}>{formatTimerDisplay(elapsedSeconds)}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>TARGET</Text>
                <Text style={styles.statVal}>45:00</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>COMPLETION</Text>
                <Text style={[styles.statVal, { color: '#8B5CF6' }]}>
                  {Math.round(progressFraction * 100)}%
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* ────────── 4. SYSTEM DIRECTIVE ADVISORY ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(200)} style={styles.directiveCard}>
            <View style={styles.directiveHeader}>
              <Image
                source={require('@/../public/sparkles.svg')}
                style={styles.directiveIcon}
                contentFit="contain"
              />
              <Text style={styles.directiveTag}>⟨ PROTOCOL DIRECTIVE ⟩</Text>
            </View>
            <Text style={styles.directiveText}>
              Maintain absolute mental immersion. Avoid switching apps or multitasking to maximize neuroplastic XP calibration.
            </Text>
          </Animated.View>

          {/* ────────── 5. CONTROLS ────────── */}
          <View style={styles.controlsSection}>
            {/* Pause / Resume Button */}
            <TouchableOpacity
              style={[styles.pauseBtn, isPaused && styles.pauseBtnActive]}
              onPress={handleTogglePause}
              activeOpacity={0.8}
            >
              <Image
                source={
                  isPaused
                    ? require('@/../public/play.svg')
                    : require('@/../public/pause.svg')
                }
                style={styles.pauseIcon}
                contentFit="contain"
              />
              <Text style={[styles.pauseBtnText, isPaused && styles.pauseBtnTextActive]}>
                {isPaused ? 'RESUME FOCUS' : 'PAUSE FOCUS'}
              </Text>
            </TouchableOpacity>

            {/* Complete Quest Button (Unlocked after 10m or when 45m finishes) */}
            {canComplete ? (
              <Animated.View entering={FadeIn.duration(300)} style={styles.completeWrapper}>
                <TouchableOpacity
                  style={[styles.completeBtn, isCompleted && styles.completeBtnDone]}
                  onPress={handleCompleteSession}
                  activeOpacity={0.8}
                >
                  <Image
                    source={require('@/../public/circle-check.svg')}
                    style={styles.completeIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.completeBtnText}>
                    ⚡ COMPLETE DEEP WORK (+{quest.xp_reward || 35} XP)
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <View style={styles.lockedCompleteBox}>
                <Text style={styles.lockedCompleteText}>
                  Complete unlocks at 10m minimum or 45m full clear
                </Text>
              </View>
            )}

            {/* Abandon Button */}
            <TouchableOpacity
              style={styles.abandonBtn}
              onPress={handleAbandonPress}
              activeOpacity={0.7}
            >
              <Text style={styles.abandonText}>ABANDON PROTOCOL</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#050611',
  },
  outerFrame: {
    flex: 1,
    backgroundColor: '#050611',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#171B32',
    backgroundColor: '#080B1C',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#121730',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#242C56',
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: '#20C8FF',
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  systemTag: {
    color: '#8B5CF6',
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  xpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  xpBadgeText: {
    color: '#C084FC',
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  objectiveCard: {
    backgroundColor: '#0C1026',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#252D57',
    position: 'relative',
    overflow: 'hidden',
    gap: 8,
  },
  objectiveAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#8B5CF6',
  },
  objectiveTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
  },
  categoryBadgeText: {
    color: '#C084FC',
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#161C3D',
  },
  statChipText: {
    color: '#20C8FF',
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  objectiveTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  objectiveDesc: {
    color: '#8A94BA',
    fontSize: 13,
    fontFamily: Fonts.sans,
    lineHeight: 18,
  },
  timerCard: {
    backgroundColor: '#0A0D22',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#242C56',
    paddingVertical: 28,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 24,
  },
  timerDial: {
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  webSvgWrapper: {
    position: 'absolute',
    width: 190,
    height: 190,
  },
  nativeRingContainer: {
    position: 'absolute',
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nativeTrackRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 7,
    borderColor: '#1A1F3C',
  },
  nativeProgressRing: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 7,
  },
  timerTextContainer: {
    alignItems: 'center',
    gap: 6,
  },
  timerMainNumber: {
    color: '#FFFFFF',
    fontSize: 42,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    letterSpacing: 2,
    textShadowColor: 'rgba(139, 92, 246, 0.65)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
  },
  timerSubLabel: {
    color: '#8B5CF6',
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#171C3A',
  },
  statCol: {
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    color: '#657099',
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statVal: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#1E254B',
  },
  directiveCard: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    padding: 16,
    gap: 8,
  },
  directiveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  directiveIcon: {
    width: 14,
    height: 14,
    tintColor: '#C084FC',
  },
  directiveTag: {
    color: '#C084FC',
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  directiveText: {
    color: '#A7B1D6',
    fontSize: 12,
    fontFamily: Fonts.sans,
    lineHeight: 18,
  },
  controlsSection: {
    gap: 12,
    marginTop: 8,
  },
  pauseBtn: {
    backgroundColor: '#131838',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#263166',
  },
  pauseBtnActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  pauseIcon: {
    width: 16,
    height: 16,
    tintColor: '#20C8FF',
  },
  pauseBtnText: {
    color: '#20C8FF',
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pauseBtnTextActive: {
    color: '#F59E0B',
  },
  completeWrapper: {
    width: '100%',
  },
  completeBtn: {
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#A78BFA',
  },
  completeBtnDone: {
    backgroundColor: '#059669',
    borderColor: '#34D399',
  },
  completeIcon: {
    width: 18,
    height: 18,
    tintColor: '#FFFFFF',
  },
  completeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  lockedCompleteBox: {
    backgroundColor: 'rgba(23, 27, 50, 0.6)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1E2548',
  },
  lockedCompleteText: {
    color: '#5D678E',
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  abandonBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  abandonText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: Fonts.display,
    fontWeight: '800',
    letterSpacing: 1,
  },
});
