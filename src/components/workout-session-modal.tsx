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
  withSpring,
  Easing,
  SlideInUp,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import type { Exercise, Workout } from '@/types';
import { Fonts, Spacing } from '@/constants/theme';
import {
  estimateWorkoutDuration,
  getMinimumTimerThreshold,
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
  const estimatedMinutes = useMemo(() => estimateWorkoutDuration(exercises), [exercises]);
  const minimumThreshold = useMemo(
    () => (isRestDay ? 0 : getMinimumTimerThreshold(estimatedMinutes)),
    [estimatedMinutes, isRestDay]
  );
  const timerMet = isRestDay || elapsedSeconds >= minimumThreshold;
  const allChecked = checkedExercises.size >= exercises.length;
  const canComplete = timerMet && allChecked;
  const thresholdMinutes = Math.ceil(minimumThreshold / 60);

  // Timer progress (0 → 1)
  const timerProgress = minimumThreshold > 0
    ? Math.min(elapsedSeconds / minimumThreshold, 1)
    : 1;

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
    Alert.alert(
      'Quit Workout?',
      'Your progress won\'t be saved. No XP will be awarded.',
      [
        { text: 'Keep Training', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: () => {
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            onCancel();
          },
        },
      ]
    );
  }, [onCancel]);

  // Animated styles

  const completeBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeBtnScale.value }],
    shadowOpacity: completeBtnGlow.value * 0.5,
  }));

  // Get lock status text
  const getLockHint = (): string => {
    const hints: string[] = [];
    if (!timerMet) {
      const remaining = minimumThreshold - elapsedSeconds;
      hints.push(`Train for ${formatTimerDisplay(Math.max(0, remaining))} more`);
    }
    if (!allChecked) {
      const remaining = exercises.length - checkedExercises.size;
      hints.push(`${remaining} exercise${remaining !== 1 ? 's' : ''} remaining`);
    }
    return hints.join(' • ');
  };

  if (!workout) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleCancel} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topBarTag}>ACTIVE WORKOUT</Text>
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

                {/* Progress ring (using View-based approach for RN compatibility) */}
                <View style={styles.timerRingProgress}>
                  <View
                    style={[
                      styles.timerRingFill,
                      {
                        borderColor: timerMet ? '#00FF88' : '#00A8FF',
                        // Use rotation to simulate circular progress
                        // This creates a visual indicator without SVG
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
                              ? timerMet ? '#00FF88' : '#00A8FF'
                              : '#1E293B',
                          },
                        ]}
                      />
                    );
                  })}
                </View>

                {/* Timer display */}
                <View style={styles.timerTextContainer}>
                  <Text style={[styles.timerText, timerMet && styles.timerTextComplete]}>
                    {formatTimerDisplay(elapsedSeconds)}
                  </Text>
                  <Text style={styles.timerEstimate}>
                    {timerMet ? '✓ Minimum reached' : `Min: ${thresholdMinutes}m`}
                  </Text>
                </View>
              </View>

              {/* Pause / Resume */}
              <TouchableOpacity
                style={[styles.pauseBtn, isPaused && styles.pauseBtnPaused]}
                onPress={togglePause}
                activeOpacity={0.7}
              >
                <Text style={styles.pauseBtnText}>
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </Text>
              </TouchableOpacity>

              {isPaused && (
                <Text style={styles.pausedLabel}>Timer Paused</Text>
              )}
            </Animated.View>
          )}

          {/* EXERCISE CHECK-OFF SECTION */}
          <View style={styles.exerciseSection}>
            <View style={styles.exerciseSectionHeader}>
              <Text style={styles.exerciseSectionTitle}>Exercises</Text>
              <Text style={[
                styles.exerciseProgress,
                allChecked && styles.exerciseProgressComplete,
              ]}>
                {checkedExercises.size}/{exercises.length} done
              </Text>
            </View>

            {/* Exercise progress bar */}
            <View style={styles.exerciseProgressBar}>
              <View
                style={[
                  styles.exerciseProgressFill,
                  {
                    width: `${exercises.length > 0 ? (checkedExercises.size / exercises.length) * 100 : 0}%`,
                    backgroundColor: allChecked ? '#00FF88' : '#00A8FF',
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
          {/* Lock hint */}
          {!canComplete && (
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
          <Animated.View style={[styles.completeBtnWrapper, completeBtnAnimStyle]}>
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
                  ? `⚔️ Complete Workout (+${workout.xp_value} XP)`
                  : `🔒 Complete Workout (+${workout.xp_value} XP)`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1120',
  },

  // --- Top Bar ---
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.threeHalf,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: Spacing.three,
    backgroundColor: '#0E1726',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 51, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 51, 102, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    color: '#FF3366',
    fontWeight: '700',
  },
  topBarCenter: {
    flex: 1,
  },
  topBarTag: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#E8ECF4',
    marginTop: 2,
  },
  xpBadge: {
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
  },
  xpBadgeText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
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
    borderColor: '#1E293B',
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
    borderColor: '#00A8FF',
    opacity: 0, // Hidden — we use dots instead for RN compatibility
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
    color: '#E8ECF4',
  },
  timerTextComplete: {
    color: '#00FF88',
  },
  timerEstimate: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
  },
  pauseBtn: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  pauseBtnPaused: {
    borderColor: 'rgba(255, 170, 0, 0.4)',
    backgroundColor: 'rgba(255, 170, 0, 0.08)',
  },
  pauseBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#E8ECF4',
  },
  pausedLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFAA00',
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
    fontSize: 16,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
  },
  exerciseProgress: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#8896AB',
  },
  exerciseProgressComplete: {
    color: '#00FF88',
  },
  exerciseProgressBar: {
    height: 4,
    backgroundColor: '#1E293B',
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
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  exerciseRowChecked: {
    backgroundColor: 'rgba(0, 255, 136, 0.04)',
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#2A3A5C',
    backgroundColor: '#0E1726',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#00FF88',
    borderColor: '#00FF88',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0B1120',
  },
  exerciseInfo: {
    flex: 1,
    gap: 2,
  },
  exerciseName: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#E8ECF4',
  },
  exerciseNameChecked: {
    color: '#8896AB',
    textDecorationLine: 'line-through',
  },
  exerciseDetail: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  exerciseStatus: {
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#0E1726',
  },
  exerciseStatusDone: {
    borderColor: 'rgba(0, 255, 136, 0.3)',
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
  },
  exerciseStatusText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#6B7B8F',
  },
  exerciseStatusTextDone: {
    color: '#00FF88',
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
    backgroundColor: '#0E1726',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: 10,
    alignItems: 'center',
  },
  lockHint: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#6B7B8F',
    textAlign: 'center',
  },
  unlockHint: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00FF88',
    textAlign: 'center',
  },
  completeBtnWrapper: {
    width: '100%',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  completeBtn: {
    backgroundColor: '#0066BB',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  completeBtnLocked: {
    backgroundColor: '#1A2332',
    borderColor: '#2A3A5C',
    opacity: 0.6,
  },
  completeBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  completeBtnTextLocked: {
    color: '#6B7B8F',
  },
});
