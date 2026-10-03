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
import { Fonts, Spacing, StatColors, Colors } from '@/constants/theme';
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

  const statColor = StatColors[quest.stat_affected] || Colors.dark.cyan;

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
            <Text style={styles.topBarTag}>⟨ SYSTEM OBJECTIVE ⟩</Text>
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
            <View style={[styles.leftAccentStripe, { backgroundColor: statColor }]} />
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
                      borderColor: isSessionTargetReached ? Colors.dark.success : statColor,
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
                              ? Colors.dark.success
                              : statColor
                            : Colors.dark.border,
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
                <Text style={styles.timerEstimate}>30 MIN SESSION</Text>
              </View>
            </View>

            {/* Pause / Resume button */}
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
        </ScrollView>

        {/* BOTTOM ACTION AREA */}
        <View style={styles.bottomArea}>
          {!isMinTimeReached ? (
            <View style={styles.monitoringBadge}>
              <Text style={styles.monitoringTag}>⟨ SYSTEM DIRECTIVE ⟩</Text>
              <Text style={styles.monitoringText}>⚡ Quest in progress • Maintain focus until completion</Text>
            </View>
          ) : (
            <Animated.View
              entering={FadeIn.duration(400)}
              style={[styles.completeBtnWrapper, completeBtnAnimStyle]}
            >
              <TouchableOpacity
                style={[styles.completeBtn, { backgroundColor: Colors.dark.accent, borderColor: statColor }]}
                onPress={handleComplete}
                activeOpacity={0.8}
              >
                <Text style={styles.completeBtnText}>
                  ⚡ COMPLETE QUEST (+{quest.xp_reward} XP)
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
            <Text style={styles.cancelActionText}>ABANDON QUEST</Text>
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
    paddingTop: Platform.OS === 'ios' ? 54 : Spacing.four,
    paddingBottom: Spacing.three,
    backgroundColor: Colors.dark.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    gap: Spacing.two,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  topBarCenter: {
    flex: 1,
    gap: 2,
  },
  topBarTag: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.dark.accent,
    letterSpacing: 1.5,
  },
  topBarTitle: {
    fontFamily: Fonts.display,
    fontSize: 17,
    fontWeight: '700',
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  statBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1,
  },
  statBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '800',
  },

  // --- Scroll Content ---
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.four,
  },

  // --- Quest Details Card ---
  questDetailsCard: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: Colors.dark.borderBright,
    padding: Spacing.four,
    gap: Spacing.two,
    position: 'relative',
    overflow: 'hidden',
  },
  leftAccentStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
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
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
  },
  categoryText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statEffectText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '800',
  },
  questTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  questDescription: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.dark.textSecondary,
    lineHeight: 20,
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
    fontSize: 34,
    fontWeight: '900',
    color: Colors.dark.textBright,
    letterSpacing: 2,
  },
  timerTextComplete: {
    color: Colors.dark.success,
  },
  timerEstimate: {
    fontFamily: Fonts.display,
    fontSize: 10,
    color: Colors.dark.textMuted,
    letterSpacing: 1.5,
    fontWeight: '700',
  },

  // --- Controls ---
  pauseBtn: {
    paddingHorizontal: 26,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderWidth: 1.5,
    borderColor: Colors.dark.accent,
  },
  pauseBtnPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#F59E0B',
  },
  pauseBtnText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    fontWeight: '700',
    color: Colors.dark.accentBright,
    letterSpacing: 1,
  },
  pauseBtnTextPaused: {
    color: '#F59E0B',
  },
  pausedLabel: {
    fontFamily: Fonts.display,
    fontSize: 11,
    color: '#F59E0B',
    letterSpacing: 1.5,
    fontWeight: '700',
  },

  // --- Bottom Area ---
  bottomArea: {
    padding: Spacing.four,
    paddingBottom: Platform.OS === 'ios' ? 38 : Spacing.four,
    backgroundColor: Colors.dark.backgroundCard,
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    gap: Spacing.two,
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
  completeBtnWrapper: {
    width: '100%',
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 20,
    elevation: 8,
  },
  completeBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  completeBtnText: {
    fontFamily: Fonts.display,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
  },
  cancelActionText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    letterSpacing: 1,
  },
});
