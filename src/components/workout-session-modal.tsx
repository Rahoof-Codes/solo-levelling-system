// ============================================================
// Workout Session Modal — Timer + Exercise Check-off
// Anti-cheat verification: users must run a timer AND check off
// all exercises before they can complete a workout.
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Vibration,
  Platform,
} from 'react-native';
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
import type { Exercise, Workout } from '@/types';
import { Fonts, Spacing, Colors } from '@/constants/theme';
import {
  DEFAULT_TRAINING_SECONDS,
  MINIMUM_SESSION_SECONDS,
  formatTimerDisplay,
} from '@/lib/calculations/workout-duration';

const RING_SIZE = 180;

interface WorkoutSessionModalProps {
  visible: boolean;
  workout: Workout;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
}

export function WorkoutSessionModal({
  visible,
  workout,
  onComplete,
  onCancel,
}: WorkoutSessionModalProps) {
  // Parse exercises from workout JSON
  const exercises: Exercise[] = useMemo(() => {
    try {
      return JSON.parse(workout?.exercises_json || '[]');
    } catch {
      return [];
    }
  }, [workout?.exercises_json]);

  const isRestDay = workout?.name?.includes('Recovery') ?? false;

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Exercise check-off state
  const [checkedExercises, setCheckedExercises] = useState<Set<number>>(new Set());

  // Computed values
  const targetDurationSeconds = DEFAULT_TRAINING_SECONDS; // 30 minutes (1800s)
  const isMinTimeReached = isRestDay || elapsedSeconds >= MINIMUM_SESSION_SECONDS;
  const allChecked = exercises.length === 0 || checkedExercises.size >= exercises.length;
  const canComplete = isMinTimeReached && allChecked;
  const isSessionTargetReached = elapsedSeconds >= targetDurationSeconds;

  // Timer progress toward the 30-minute target (0 → 1)
  const timerProgress = Math.min(elapsedSeconds / targetDurationSeconds, 1);

  // Animations
  const ringProgress = useSharedValue(0);
  const completeBtnGlow = useSharedValue(0);
  const completeBtnScale = useSharedValue(1);

  // Start / stop timer
  useEffect(() => {
    if (visible && !isPaused) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [visible, isPaused]);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      setElapsedSeconds(0);
      setIsPaused(false);
      setCheckedExercises(new Set());
      ringProgress.value = 0;
      completeBtnGlow.value = 0;
      completeBtnScale.value = 1;
    }
  }, [visible]);

  // Update ring animation
  useEffect(() => {
    ringProgress.value = withTiming(timerProgress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [timerProgress]);

  // Pulse the complete button when ready
  useEffect(() => {
    if (canComplete) {
      completeBtnGlow.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1,
        true
      );
      completeBtnScale.value = withRepeat(
        withSequence(
          withTiming(1.02, { duration: 1200 }),
          withTiming(0.98, { duration: 1200 })
        ),
        -1,
        true
      );

      // Haptic feedback when unlock triggers
      if (Platform.OS !== 'web') {
        try {
          Vibration.vibrate(80);
        } catch {}
      }
    } else {
      completeBtnGlow.value = withTiming(0, { duration: 300 });
      completeBtnScale.value = withTiming(1, { duration: 300 });
    }
  }, [canComplete]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const toggleExercise = useCallback((index: number) => {
    setCheckedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
        // Light haptic on check
        if (Platform.OS !== 'web') {
          try {
            Vibration.vibrate(30);
          } catch {}
        }
      }
      return next;
    });
  }, []);

  const handleComplete = useCallback(() => {
    if (!canComplete) return;

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    onComplete(elapsedSeconds);
  }, [canComplete, elapsedSeconds, onComplete]);

  const handleCancel = useCallback(() => {
    const doCancel = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      onCancel();
    };

    // If timer just started (under 2 seconds), close immediately without prompt
    if (elapsedSeconds < 2) {
      doCancel();
      return;
    }

    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined'
        ? window.confirm("Quit Workout?\nYour progress won't be saved. No XP will be awarded.")
        : true;
      if (confirmed) {
        doCancel();
      }
      return;
    }

    Alert.alert(
      'Quit Workout?',
      "Your progress won't be saved. No XP will be awarded.",
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: doCancel,
        },
      ]
    );
  }, [elapsedSeconds, onCancel]);

  // Animated styles
  const completeBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeBtnScale.value }],
    shadowOpacity: completeBtnGlow.value * 0.5,
  }));

  // Get lock status text
  const getLockHint = (): string => {
    if (!allChecked) {
      const remaining = exercises.length - checkedExercises.size;
      return `Check off ${remaining} more exercise${remaining !== 1 ? 's' : ''} to complete`;
    }
    return '';
  };

  if (!workout) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleCancel}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTag}>⟨ SYSTEM PROTOCOL ⟩</Text>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {workout.name}
            </Text>
          </View>
          <View style={styles.xpBadge}>
            <Text style={styles.xpBadgeText}>+{workout.xp_value} XP</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* TIMER SECTION */}
          {!isRestDay && (
            <Animated.View entering={FadeIn.duration(500)} style={styles.timerSection}>
              <View style={styles.timerRingContainer}>
                {/* Background ring */}
                <View style={styles.timerRingBg} />

                {/* Progress ring */}
                <View style={styles.timerRingProgress}>
                  <View
                    style={[
                      styles.timerRingFill,
                      {
                        borderColor: isSessionTargetReached ? Colors.dark.success : Colors.dark.accent,
                      },
                    ]}
                  />
                  {/* Progress indicator dots */}
                  {Array.from({ length: 12 }, (_, i) => {
                    const angle = (i / 12) * 360;
                    const isActive = timerProgress >= i / 12;
                    const rad = (angle - 90) * (Math.PI / 180);
                    const dotRadius = RING_SIZE / 2 - 4;
                    return (
                      <View
                        key={i}
                        style={[
                          styles.timerDot,
                          {
                            left: RING_SIZE / 2 + Math.cos(rad) * dotRadius - 4,
                            top: RING_SIZE / 2 + Math.sin(rad) * dotRadius - 4,
                            backgroundColor: isActive
                              ? isSessionTargetReached ? Colors.dark.success : Colors.dark.accent
                              : Colors.dark.border,
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Timer display */}
                <View style={styles.timerTextContainer}>
                  <Text style={[styles.timerText, isSessionTargetReached && styles.timerTextComplete]}>
                    {formatTimerDisplay(elapsedSeconds)}
                  </Text>
                  <Text style={styles.timerEstimate}>
                    30 MIN SESSION
                  </Text>
                </View>
              </View>

              {/* Pause / Resume */}
              <TouchableOpacity
                style={[styles.pauseBtn, isPaused && styles.pauseBtnPaused]}
                onPress={togglePause}
                activeOpacity={0.7}
              >
                <Text style={[styles.pauseBtnText, isPaused && styles.pauseBtnTextPaused]}>
                  {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
                </Text>
              </TouchableOpacity>

              {isPaused && (
                <Text style={styles.pausedLabel}>TIMER PAUSED</Text>
              )}
            </Animated.View>
          )}

          {/* EXERCISE CHECK-OFF SECTION */}
          <View style={styles.exerciseSection}>
            <View style={styles.exerciseSectionHeader}>
              <Text style={styles.exerciseSectionTitle}>TRAINING OBJECTIVES</Text>
              <Text style={[
                styles.exerciseProgress,
                allChecked && styles.exerciseProgressComplete,
              ]}>
                {checkedExercises.size}/{exercises.length} DONE
              </Text>
            </View>

            {/* Exercise progress bar */}
            <View style={styles.exerciseProgressBar}>
              <View
                style={[
                  styles.exerciseProgressFill,
                  {
                    width: `${exercises.length > 0 ? (checkedExercises.size / exercises.length) * 100 : 0}%`,
                    backgroundColor: allChecked ? Colors.dark.success : Colors.dark.accent,
                  },
                ]}
              />
            </View>

            {exercises.map((ex, idx) => {
              const isChecked = checkedExercises.has(idx);

              return (
                <Animated.View
                  key={idx}
                  entering={FadeInDown.delay(idx * 50).duration(300)}
                >
                  <TouchableOpacity
                    style={[
                      styles.exerciseRow,
                      isChecked && styles.exerciseRowChecked,
                    ]}
                    onPress={() => toggleExercise(idx)}
                    activeOpacity={0.7}
                  >
                    {/* Checkbox */}
                    <View style={[
                      styles.checkbox,
                      isChecked && styles.checkboxChecked,
                    ]}>
                      {isChecked && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>

                    {/* Exercise info */}
                    <View style={styles.exerciseInfo}>
                      <Text style={[
                        styles.exerciseName,
                        isChecked && styles.exerciseNameChecked,
                      ]}>
                        {ex.name}
                      </Text>
                      <Text style={styles.exerciseDetail}>
                        {ex.sets && ex.reps
                          ? `${ex.sets} sets × ${ex.reps} reps`
                          : ex.sets && ex.duration_min
                          ? `${ex.sets} sets × ${ex.duration_min} min`
                          : ex.duration_min
                          ? `${ex.duration_min} min`
                          : ''}
                      </Text>
                    </View>

                    {/* Status indicator */}
                    <View style={[
                      styles.exerciseStatus,
                      isChecked && styles.exerciseStatusDone,
                    ]}>
                      <Text style={[
                        styles.exerciseStatusText,
                        isChecked && styles.exerciseStatusTextDone,
                      ]}>
                        {isChecked ? 'DONE' : 'TODO'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        </ScrollView>

        {/* BOTTOM ACTION AREA */}
        <View style={styles.bottomArea}>
          {!isMinTimeReached ? (
            <View style={styles.monitoringBadge}>
              <Text style={styles.monitoringTag}>⟨ SYSTEM DIRECTIVE ⟩</Text>
              <Text style={styles.monitoringText}>⚡ Session in progress • Maintain form and intensity</Text>
            </View>
          ) : (
            <>
              {/* Lock hint if exercises remain */}
              {!allChecked && (
                <Text style={styles.lockHint}>
                  🔒 {getLockHint()}
                </Text>
              )}

              {canComplete && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Text style={styles.unlockHint}>
                    ⚡ Workout verified — Claim your reward!
                  </Text>
                </Animated.View>
              )}

              {/* Complete Button */}
              <Animated.View entering={FadeIn.duration(400)} style={[styles.completeBtnWrapper, completeBtnAnimStyle]}>
                <TouchableOpacity
                  style={[
                    styles.completeBtn,
                    !canComplete && styles.completeBtnLocked,
                  ]}
                  onPress={handleComplete}
                  disabled={!canComplete}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.completeBtnText,
                    !canComplete && styles.completeBtnTextLocked,
                  ]}>
                    {canComplete
                      ? `⚔️ COMPLETE WORKOUT (+${workout.xp_value} XP)`
                      : `🔒 COMPLETE WORKOUT (+${workout.xp_value} XP)`}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          )}

          {/* Cancel Workout Button */}
          <TouchableOpacity
            style={styles.cancelActionBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelActionText}>ABANDON WORKOUT</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundDeep,
  },

  // --- Top Bar ---
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.threeHalf,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.dark.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#EF4444',
    fontWeight: '700',
  },
  topBarCenter: {
    flex: 1,
    gap: 2,
  },
  topBarTag: {
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.accent,
    letterSpacing: 1.5,
  },
  topBarTitle: {
    fontSize: 17,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  xpBadge: {
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
  },
  xpBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: Colors.dark.accentBright,
  },

  scrollContent: {
    padding: Spacing.threeHalf,
    gap: Spacing.four,
    paddingBottom: 160,
  },

  // --- Timer Section ---
  timerSection: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  timerRingContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  timerRingBg: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 8,
    borderColor: Colors.dark.border,
  },
  timerRingProgress: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
  },
  timerRingFill: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 8,
    opacity: 0,
  },
  timerDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  timerTextContainer: {
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 36,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: Colors.dark.textBright,
  },
  timerTextComplete: {
    color: Colors.dark.success,
  },
  timerEstimate: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  pauseBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1.5,
    borderColor: Colors.dark.accent,
    borderRadius: 20,
    paddingHorizontal: 26,
    paddingVertical: 10,
  },
  pauseBtnPaused: {
    borderColor: '#F59E0B',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  pauseBtnText: {
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.accentBright,
    letterSpacing: 1,
  },
  pauseBtnTextPaused: {
    color: '#F59E0B',
  },
  pausedLabel: {
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 1.5,
  },

  // --- Exercise Section ---
  exerciseSection: {
    gap: 10,
  },
  exerciseSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseSectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.accent,
    letterSpacing: 1,
  },
  exerciseProgress: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: Colors.dark.textMuted,
  },
  exerciseProgressComplete: {
    color: Colors.dark.success,
  },
  exerciseProgressBar: {
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 4,
  },
  exerciseProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  exerciseRowChecked: {
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.backgroundElement,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.dark.success,
    borderColor: Colors.dark.success,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.dark.backgroundDeep,
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 15,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.textBright,
    letterSpacing: 0.3,
  },
  exerciseNameChecked: {
    color: Colors.dark.textMuted,
    textDecorationLine: 'line-through',
  },
  exerciseDetail: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
  },
  exerciseStatus: {
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.dark.backgroundElement,
  },
  exerciseStatusDone: {
    borderColor: 'rgba(16, 185, 129, 0.3)',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  exerciseStatusText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: Colors.dark.textMuted,
  },
  exerciseStatusTextDone: {
    color: Colors.dark.success,
  },

  // --- Bottom Action Area ---
  bottomArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.threeHalf,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    paddingTop: Spacing.three,
    backgroundColor: Colors.dark.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: 10,
    alignItems: 'center',
  },
  lockHint: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  unlockHint: {
    fontSize: 12,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.success,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  completeBtnWrapper: {
    width: '100%',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  completeBtn: {
    backgroundColor: Colors.dark.accent,
    borderWidth: 1.5,
    borderColor: Colors.dark.accentBright,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  completeBtnLocked: {
    backgroundColor: Colors.dark.backgroundElement,
    borderColor: Colors.dark.border,
    opacity: 0.6,
  },
  completeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  completeBtnTextLocked: {
    color: Colors.dark.textMuted,
  },
  monitoringBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    gap: 4,
  },
  monitoringTag: {
    fontFamily: Fonts.display,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  monitoringText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  cancelActionBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    marginTop: 4,
    width: '100%',
  },
  cancelActionText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 1,
  },
});
