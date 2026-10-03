import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { type Streak } from '@/types';
import { type DayActivityStatus } from '@/db/operations';
import { Colors, Fonts, Spacing } from '@/constants/theme';

interface DailyStreakCardProps {
  streaks: Streak[];
  weekHistory?: DayActivityStatus[];
  onRefresh?: () => void;
}

export function DailyStreakCard({ streaks, weekHistory = [] }: DailyStreakCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Find streaks
  const questStreak = streaks.find((s) => s.type === 'daily_quest')?.current_count ?? 0;
  const longestQuest = streaks.find((s) => s.type === 'daily_quest')?.longest_count ?? questStreak;

  const workoutStreak = streaks.find((s) => s.type === 'workout')?.current_count ?? 0;
  const longestWorkout = streaks.find((s) => s.type === 'workout')?.longest_count ?? workoutStreak;

  const stepStreak = streaks.find((s) => s.type === 'steps')?.current_count ?? 0;
  const longestSteps = streaks.find((s) => s.type === 'steps')?.longest_count ?? stepStreak;

  const mealStreak = streaks.find((s) => s.type === 'meal_log')?.current_count ?? 0;
  const longestMeal = streaks.find((s) => s.type === 'meal_log')?.longest_count ?? mealStreak;

  const loginStreak = streaks.find((s) => s.type === 'login')?.current_count ?? 0;
  const longestLogin = streaks.find((s) => s.type === 'login')?.longest_count ?? loginStreak;

  // Primary streak reflects actual daily activity
  const primaryStreak = Math.max(questStreak, workoutStreak);
  const bestRecord = Math.max(longestQuest, longestWorkout, primaryStreak);

  // Flame animation shared values
  const flameScale = useSharedValue(1);
  const flameRotation = useSharedValue(0);
  const flameGlow = useSharedValue(0.4);

  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 850, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.92, { duration: 750, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.08, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    flameRotation.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 600 }),
        withTiming(5, { duration: 600 }),
        withTiming(-3, { duration: 500 }),
        withTiming(0, { duration: 400 })
      ),
      -1,
      true
    );

    flameGlow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 900 }),
        withTiming(0.35, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  const animatedFlameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotation.value}deg` },
    ],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: flameGlow.value,
  }));

  // Calculate hunter buff
  const expBuffPercent = primaryStreak > 0 ? Math.min(25, Math.max(5, primaryStreak * 3)) : 0;

  return (
    <View style={styles.container}>
      {/* BACKGROUND GLOW */}
      <Animated.View style={[styles.bgGlow, animatedGlowStyle]} />

      {/* Corner ornaments */}
      <View style={[styles.corner, styles.cornerTL]} />
      <View style={[styles.corner, styles.cornerTR]} />
      <View style={[styles.corner, styles.cornerBL]} />
      <View style={[styles.corner, styles.cornerBR]} />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Animated.View style={[styles.flameBox, animatedFlameStyle]}>
            <Text style={styles.flameEmoji}>🔥</Text>
          </Animated.View>
          <View>
            <Text style={styles.systemTag}>DAILY STREAK</Text>
            <View style={styles.streakCountRow}>
              <Text style={styles.streakCount}>{primaryStreak}</Text>
              <Text style={styles.streakLabel}>days</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailsBtnText}>Details ↗</Text>
        </TouchableOpacity>
      </View>

      {/* EXP BUFF BAR */}
      <View style={styles.buffBadge}>
        <Text style={styles.buffIcon}>⚡</Text>
        <Text style={styles.buffText}>
          {primaryStreak > 0 ? (
            <>
              Resonance Buff:{' '}
              <Text style={styles.buffHighlight}>+{expBuffPercent}% EXP</Text>
            </>
          ) : (
            'Complete daily quests to activate Resonance Buff'
          )}
        </Text>
      </View>

      {/* 7-DAY TIMELINE RUNES */}
      <View style={styles.weekContainer}>
        {weekHistory.length > 0
          ? weekHistory.map((day, idx) => {
              const isFuture = !day.isCompleted && !day.isToday;
              return (
                <Animated.View
                  key={day.date || idx}
                  entering={ZoomIn.duration(350).delay(100 + idx * 50)}
                  style={styles.dayNode}
                >
                  <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>
                    {day.dayLabel}
                  </Text>
                  <View
                    style={[
                      styles.nodeCircle,
                      day.isCompleted && styles.nodeCircleCompleted,
                      day.isToday && !day.isCompleted && styles.nodeCircleToday,
                      isFuture && styles.nodeCircleFuture,
                    ]}
                  >
                    {day.isCompleted ? (
                      <Text style={styles.nodeCheck}>✓</Text>
                    ) : day.isToday ? (
                      <Text style={styles.nodeCurrent}>⚡</Text>
                    ) : (
                      <Text style={styles.nodeLocked}>•</Text>
                    )}
                  </View>
                </Animated.View>
              );
            })
          : // Fallback 7 dummy nodes if history is loading
            ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => (
              <Animated.View
                key={i}
                entering={ZoomIn.duration(350).delay(100 + i * 50)}
                style={styles.dayNode}
              >
                <Text style={styles.dayLabel}>{letter}</Text>
                <View
                  style={[
                    styles.nodeCircle,
                    i < Math.min(primaryStreak, 6)
                      ? styles.nodeCircleCompleted
                      : i === 6
                      ? styles.nodeCircleToday
                      : styles.nodeCircleFuture,
                  ]}
                >
                  <Text style={styles.nodeCheck}>
                    {i < Math.min(primaryStreak, 6) ? '✓' : i === 6 ? '⚡' : '•'}
                  </Text>
                </View>
              </Animated.View>
            ))}
      </View>

      {/* FOOTER INFO */}
      <View style={styles.footerRow}>
        <Text style={styles.longestStreak}>
          👑 Best: <Text style={styles.longestVal}>{bestRecord} days</Text>
        </Text>
        <Text style={styles.streakHint}>Complete quests to maintain</Text>
      </View>

      {/* MULTI-STREAK BREAKDOWN MODAL */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <Animated.View
            entering={SlideInUp.springify().damping(16)}
            style={styles.modalContent}
          >
            {/* Corner ornaments */}
            <View style={[styles.modalCorner, styles.modalCornerTL]} />
            <View style={[styles.modalCorner, styles.modalCornerTR]} />
            <View style={[styles.modalCorner, styles.modalCornerBL]} />
            <View style={[styles.modalCorner, styles.modalCornerBR]} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTag}>STREAKS</Text>
                <Text style={styles.modalTitle}>Streak Details</Text>
              </View>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.streakGrid}>
              {/* Quest Streak */}
              <View style={styles.streakItem}>
                <View style={styles.streakItemLeft}>
                  <Text style={styles.streakItemIcon}>📜</Text>
                  <View>
                    <Text style={styles.streakItemTitle}>Daily Quests</Text>
                    <Text style={styles.streakItemSub}>Consecutive quest completion</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={[styles.streakItemVal, { color: Colors.dark.accent }]}>
                    {questStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Best {longestQuest}d</Text>
                </View>
              </View>

              {/* Workout Streak */}
              <View style={styles.streakItem}>
                <View style={styles.streakItemLeft}>
                  <Text style={styles.streakItemIcon}>⚔️</Text>
                  <View>
                    <Text style={styles.streakItemTitle}>Training</Text>
                    <Text style={styles.streakItemSub}>Consecutive workout days</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={[styles.streakItemVal, { color: Colors.dark.danger }]}>
                    {workoutStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Best {longestWorkout}d</Text>
                </View>
              </View>

              {/* Steps Streak */}
              <View style={styles.streakItem}>
                <View style={styles.streakItemLeft}>
                  <Text style={styles.streakItemIcon}>👟</Text>
                  <View>
                    <Text style={styles.streakItemTitle}>Step Goal</Text>
                    <Text style={styles.streakItemSub}>10,000 steps reached</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={[styles.streakItemVal, { color: Colors.dark.gold }]}>
                    {stepStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Best {longestSteps}d</Text>
                </View>
              </View>

              {/* Meal Streak */}
              <View style={styles.streakItem}>
                <View style={styles.streakItemLeft}>
                  <Text style={styles.streakItemIcon}>🍽️</Text>
                  <View>
                    <Text style={styles.streakItemTitle}>Meal Logging</Text>
                    <Text style={styles.streakItemSub}>Daily nutrition tracking</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={[styles.streakItemVal, { color: Colors.dark.success }]}>
                    {mealStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Best {longestMeal}d</Text>
                </View>
              </View>

              {/* Login Streak */}
              <View style={styles.streakItem}>
                <View style={styles.streakItemLeft}>
                  <Text style={styles.streakItemIcon}>⚡</Text>
                  <View>
                    <Text style={styles.streakItemTitle}>Daily Login</Text>
                    <Text style={styles.streakItemSub}>Days opened the app</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={styles.streakItemVal}>{loginStreak}d</Text>
                  <Text style={styles.streakItemRecord}>Best {longestLogin}d</Text>
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalDoneBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold,
    borderRadius: 18,
    padding: Spacing.threeHalf,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  bgGlow: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
  },
  // Corner ornaments
  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderColor: Colors.dark.gold,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  flameBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  flameEmoji: {
    fontSize: 24,
  },
  systemTag: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.gold,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakCount: {
    fontSize: 30,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: Colors.dark.textBright,
  },
  streakLabel: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  detailsBtn: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  detailsBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: Colors.dark.gold,
  },
  buffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(139, 92, 246, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buffIcon: {
    fontSize: 14,
  },
  buffText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    fontWeight: '500',
  },
  buffHighlight: {
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  dayNode: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  dayLabelToday: {
    color: Colors.dark.accent,
    fontWeight: '700',
  },
  nodeCircle: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1.5,
    borderColor: Colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCircleCompleted: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: Colors.dark.gold,
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  nodeCircleToday: {
    backgroundColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: Colors.dark.accent,
    shadowColor: Colors.dark.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 3,
  },
  nodeCircleFuture: {
    borderColor: Colors.dark.borderGlow,
    opacity: 0.5,
  },
  nodeCheck: {
    fontSize: 13,
    fontWeight: '900',
    color: Colors.dark.gold,
  },
  nodeCurrent: {
    fontSize: 12,
    color: Colors.dark.accent,
  },
  nodeLocked: {
    fontSize: 10,
    color: Colors.dark.textDim,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: Colors.dark.border,
    paddingTop: 10,
  },
  longestStreak: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
  },
  longestVal: {
    color: Colors.dark.textBright,
    fontWeight: '700',
  },
  streakHint: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 16, 0.92)',
    justifyContent: 'center',
    padding: Spacing.threeHalf,
  },
  modalContent: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1.5,
    borderColor: Colors.dark.gold,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  modalCorner: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderColor: Colors.dark.gold,
  },
  modalCornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  modalCornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  modalCornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  modalCornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 14,
  },
  modalTag: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.gold,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  streakGrid: {
    gap: 10,
    paddingVertical: 4,
  },
  streakItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 14,
    padding: 14,
  },
  streakItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakItemIcon: {
    fontSize: 22,
  },
  streakItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: Colors.dark.textBright,
  },
  streakItemSub: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  streakItemRight: {
    alignItems: 'flex-end',
  },
  streakItemVal: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: Colors.dark.gold,
  },
  streakItemRecord: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
  },
  modalDoneBtn: {
    backgroundColor: Colors.dark.gold,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: Colors.dark.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modalDoneBtnText: {
    fontSize: 15,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.backgroundDeep,
    letterSpacing: 1,
  },
});
