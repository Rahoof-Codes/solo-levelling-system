// ============================================================
// Quest Session Modal — Timer System for Daily Quests
// Anti-cheat verification: users must run the timer for a
// minimum of 10 minutes before the "Complete Quest" button unlocks.
// Default target timer: 30 minutes.
// ============================================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import type { Quest } from '@/types';
import { Fonts, Spacing, StatColors } from '@/constants/theme';
import {
  DEFAULT_TRAINING_SECONDS,
  MINIMUM_SESSION_SECONDS,
  formatTimerDisplay,
} from '@/lib/calculations/workout-duration';

const RING_SIZE = 180;

interface QuestSessionModalProps {
  visible: boolean;
  quest: Quest | null;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
}

export function QuestSessionModal({
  visible,
  quest,
  onComplete,
  onCancel,
}: QuestSessionModalProps) {
  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Computed values
  const targetDurationSeconds = DEFAULT_TRAINING_SECONDS; // 30 minutes (1800s) default
  const isMinTimeReached = elapsedSeconds >= MINIMUM_SESSION_SECONDS; // 10 minutes minimum
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

  // Pulse complete button once unlocked (after min 10 min)
  useEffect(() => {
    if (isMinTimeReached) {
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
  }, [isMinTimeReached]);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => !prev);
  }, []);

  const handleComplete = useCallback(() => {
    if (!isMinTimeReached) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    onComplete(elapsedSeconds);
  }, [isMinTimeReached, elapsedSeconds, onComplete]);

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
        ? window.confirm("Quit Quest?\nYour progress won't be saved. No XP will be awarded.")
        : true;
      if (confirmed) {
        doCancel();
      }
      return;
    }

    Alert.alert(
      'Quit Quest?',
      "Your progress won't be saved. No XP will be awarded.",
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Quit',
          style: 'destructive',
          onPress: doCancel,
        },
      ]
    );
  }, [elapsedSeconds, onCancel]);

  const completeBtnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: completeBtnScale.value }],
    shadowOpacity: completeBtnGlow.value * 0.6,
  }));

  if (!quest) return null;

  const statColor = StatColors[quest.stat_affected] || '#00F0FF';

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
            <Text style={styles.topBarTag}>ACTIVE QUEST</Text>
            <Text style={styles.topBarTitle} numberOfLines={1}>
              {quest.title}
            </Text>
          </View>
          <View style={[styles.statBadge, { borderColor: statColor }]}>
            <Text style={[styles.statBadgeText, { color: statColor }]}>
              +{quest.xp_reward} XP
            </Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* QUEST DETAILS CARD */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.questDetailsCard}>
            <View style={styles.questMetaRow}>
              <View style={[styles.categoryBadge, { borderColor: `${statColor}66` }]}>
                <Text style={[styles.categoryText, { color: statColor }]}>
                  {quest.category.toUpperCase()}
                </Text>
              </View>
              <Text style={[styles.statEffectText, { color: statColor }]}>
                +{quest.xp_reward} {quest.stat_affected}
              </Text>
            </View>

            <Text style={styles.questTitle}>{quest.title}</Text>

            {quest.description ? (
              <Text style={styles.questDescription}>{quest.description}</Text>
            ) : null}
          </Animated.View>

          {/* TIMER SECTION */}
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
                      borderColor: isSessionTargetReached ? '#00FF88' : statColor,
                    },
                  ]}
                />
                {/* 12 progress indicator dots around circle */}
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
                            ? isSessionTargetReached
                              ? '#00FF88'
                              : statColor
                            : '#1E293B',
                        },
                      ]}
                    />
                  );
                })}
              </View>

              {/* Timer text display */}
              <View style={styles.timerTextContainer}>
                <Text
                  style={[
                    styles.timerText,
                    isSessionTargetReached && styles.timerTextComplete,
                  ]}
                >
                  {formatTimerDisplay(elapsedSeconds)}
                </Text>
                <Text style={styles.timerEstimate}>30 min session</Text>
              </View>
            </View>

            {/* Pause / Resume button */}
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
        </ScrollView>

        {/* BOTTOM ACTION AREA */}
        <View style={styles.bottomArea}>
          {!isMinTimeReached ? (
            <View style={styles.monitoringBadge}>
              <Text style={styles.monitoringTag}>SYSTEM DIRECTIVE</Text>
              <Text style={styles.monitoringText}>⚡ Quest in progress • Stay focused on your objective</Text>
            </View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(400)}
              style={[styles.completeBtnWrapper, completeBtnAnimStyle]}
            >
              <TouchableOpacity
                style={[styles.completeBtn, { backgroundColor: '#0066BB', borderColor: statColor }]}
                onPress={handleComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.completeBtnText}>
                  ⚡ Complete Quest (+{quest.xp_reward} XP)
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Cancel Quest Button */}
          <TouchableOpacity
            style={styles.cancelActionBtn}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelActionText}>Cancel Quest</Text>
          </TouchableOpacity>
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
    paddingTop: Platform.OS === 'ios' ? 54 : Spacing.four,
    paddingBottom: Spacing.three,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: Spacing.two,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '600',
  },
  topBarCenter: {
    flex: 1,
    gap: 2,
  },
  topBarTag: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    color: '#00A8FF',
    letterSpacing: 1.5,
  },
  topBarTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '700',
    color: '#F8FAFC',
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
    borderWidth: 1,
  },
  statBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
  },

  // --- Scroll Content ---
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // --- Quest Details Card ---
  questDetailsCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: Spacing.four,
    gap: Spacing.two,
  },
  questMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statEffectText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
  },
  questTitle: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '800',
    color: '#F1F5F9',
  },
  questDescription: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 19,
  },

  // --- Timer Section ---
  timerSection: {
    alignItems: 'center',
    paddingVertical: Spacing.four,
    gap: Spacing.four,
  },
  timerRingContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerRingBg: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 3,
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
    borderWidth: 3,
    opacity: 0.8,
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
    fontFamily: Fonts.mono,
    fontSize: 32,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: 2,
  },
  timerTextComplete: {
    color: '#00FF88',
  },
  timerEstimate: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: '#64748B',
    letterSpacing: 0.5,
  },

  // --- Controls ---
  pauseBtn: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00A8FF',
  },
  pauseBtnPaused: {
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    borderColor: '#FFAA00',
  },
  pauseBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '700',
    color: '#00A8FF',
  },
  pausedLabel: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    color: '#FFAA00',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // --- Bottom Area ---
  bottomArea: {
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 38 : Spacing.four,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    gap: Spacing.two,
  },
  monitoringBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    backgroundColor: 'rgba(0, 168, 255, 0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.2)',
    gap: 4,
  },
  monitoringTag: {
    fontFamily: Fonts.mono,
    fontSize: 10,
    letterSpacing: 2,
    color: '#00A8FF',
    textTransform: 'uppercase',
  },
  monitoringText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    color: '#94A3B8',
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
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  completeBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cancelActionBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginTop: 4,
  },
  cancelActionText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
  },
});
