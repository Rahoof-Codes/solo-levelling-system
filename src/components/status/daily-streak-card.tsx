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
} from 'react-native-reanimated';
import { type Streak } from '@/types';
import { type DayActivityStatus } from '@/db/operations';
import { Fonts, Spacing } from '@/constants/theme';

interface DailyStreakCardProps {
  streaks: Streak[];
  weekHistory?: DayActivityStatus[];
  onRefresh?: () => void;
}

export function DailyStreakCard({ streaks, weekHistory = [] }: DailyStreakCardProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Find streaks
  const loginStreak = streaks.find((s) => s.type === 'login')?.current_count ?? 0;
  const questStreak = streaks.find((s) => s.type === 'daily_quest')?.current_count ?? 0;
  const workoutStreak = streaks.find((s) => s.type === 'workout')?.current_count ?? 0;
  const mealStreak = streaks.find((s) => s.type === 'meal_log')?.current_count ?? 0;

  const longestLogin = streaks.find((s) => s.type === 'login')?.longest_count ?? loginStreak;
  const primaryStreak = Math.max(loginStreak, questStreak, 1);

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
  const expBuffPercent = Math.min(25, Math.max(5, primaryStreak * 3));

  return (
    <View style={styles.container}>
      {/* BACKGROUND GLOW */}
      <Animated.View style={[styles.bgGlow, animatedGlowStyle]} />

      {/* HEADER SECTION */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Animated.View style={[styles.flameBox, animatedFlameStyle]}>
            <Text style={styles.flameEmoji}>🔥</Text>
          </Animated.View>
          <View>
            <Text style={styles.systemTag}>Daily Streak</Text>
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
          Resonance Buff:{' '}
          <Text style={styles.buffHighlight}>+{expBuffPercent}% EXP</Text>
        </Text>
      </View>

      {/* 7-DAY TIMELINE NODES */}
      <View style={styles.weekContainer}>
        {weekHistory.length > 0
          ? weekHistory.map((day, idx) => {
              const isFuture = !day.isCompleted && !day.isToday;
              return (
                <View key={day.date || idx} style={styles.dayNode}>
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
                </View>
              );
            })
          : // Fallback 7 dummy nodes if history is loading
            ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((letter, i) => (
              <View key={i} style={styles.dayNode}>
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
              </View>
            ))}
      </View>

      {/* FOOTER INFO */}
      <View style={styles.footerRow}>
        <Text style={styles.longestStreak}>
          👑 Best: <Text style={styles.longestVal}>{longestLogin} days</Text>
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
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTag}>Streaks</Text>
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
                  <Text style={[styles.streakItemVal, { color: '#00A8FF' }]}>
                    {questStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Active</Text>
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
                  <Text style={[styles.streakItemVal, { color: '#FF3366' }]}>
                    {workoutStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Active</Text>
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
                  <Text style={[styles.streakItemVal, { color: '#00FF88' }]}>
                    {mealStreak}d
                  </Text>
                  <Text style={styles.streakItemRecord}>Active</Text>
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
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#FFAA00',
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  bgGlow: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
  },
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
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameEmoji: {
    fontSize: 22,
  },
  systemTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#FFAA00',
    fontWeight: '600',
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakCount: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E8ECF4',
  },
  streakLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
  },
  detailsBtn: {
    backgroundColor: 'rgba(255, 170, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  detailsBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#FFAA00',
  },
  buffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 168, 255, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 240, 255, 0.2)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  buffIcon: {
    fontSize: 13,
  },
  buffText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '500',
  },
  buffHighlight: {
    color: '#00A8FF',
    fontWeight: '700',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dayNode: {
    alignItems: 'center',
    gap: 6,
  },
  dayLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#00A8FF',
    fontWeight: '700',
  },
  nodeCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#0E1726',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCircleCompleted: {
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    borderColor: '#FFAA00',
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  nodeCircleToday: {
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
    borderColor: '#00A8FF',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  nodeCircleFuture: {
    borderColor: '#1A2332',
  },
  nodeCheck: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFAA00',
  },
  nodeCurrent: {
    fontSize: 12,
    color: '#00A8FF',
  },
  nodeLocked: {
    fontSize: 10,
    color: '#3A4A5F',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingTop: 10,
  },
  longestStreak: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
  longestVal: {
    color: '#E8ECF4',
    fontWeight: '700',
  },
  streakHint: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.9)',
    justifyContent: 'center',
    padding: Spacing.threeHalf,
  },
  modalContent: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#FFAA00',
    borderRadius: 18,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 12,
  },
  modalTag: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#FFAA00',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    color: '#8896AB',
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
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
  },
  streakItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  streakItemIcon: {
    fontSize: 20,
  },
  streakItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  streakItemSub: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    marginTop: 2,
  },
  streakItemRight: {
    alignItems: 'flex-end',
  },
  streakItemVal: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#FFAA00',
  },
  streakItemRecord: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  modalDoneBtn: {
    backgroundColor: '#FFAA00',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#0B1120',
  },
});
