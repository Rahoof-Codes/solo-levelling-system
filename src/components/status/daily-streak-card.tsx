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
            <Text style={styles.systemTag}>DAILY HUNTER STREAK</Text>
            <View style={styles.streakCountRow}>
              <Text style={styles.streakCount}>{primaryStreak}</Text>
              <Text style={styles.streakLabel}>DAYS AWAKENED</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailsBtnText}>MATRIX ↗</Text>
        </TouchableOpacity>
      </View>

      {/* HUNTER BUFF BAR */}
      <View style={styles.buffBadge}>
        <Text style={styles.buffIcon}>⚡</Text>
        <Text style={styles.buffText}>
          HUNTER RESONANCE BUFF:{' '}
          <Text style={styles.buffHighlight}>+{expBuffPercent}% EXP BOOST</Text>
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
          👑 Longest Streak: <Text style={styles.longestVal}>{longestLogin} Days</Text>
        </Text>
        <Text style={styles.streakHint}>Complete daily quests to maintain</Text>
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
                <Text style={styles.modalTag}>SYSTEM DIRECTIVE</Text>
                <Text style={styles.modalTitle}>HUNTER STREAK MATRIX</Text>
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
                    <Text style={styles.streakItemTitle}>HUNTER LOGIN</Text>
                    <Text style={styles.streakItemSub}>Daily presence in the System</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={styles.streakItemVal}>{loginStreak}d</Text>
                  <Text style={styles.streakItemRecord}>Max {longestLogin}d</Text>
                </View>
              </View>

              {/* Quest Streak */}
              <View style={styles.streakItem}>
                <View style={styles.streakItemLeft}>
                  <Text style={styles.streakItemIcon}>📜</Text>
                  <View>
                    <Text style={styles.streakItemTitle}>DAILY QUESTS</Text>
                    <Text style={styles.streakItemSub}>Consecutive quest completion</Text>
                  </View>
                </View>
                <View style={styles.streakItemRight}>
                  <Text style={[styles.streakItemVal, { color: '#00F0FF' }]}>
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
                    <Text style={styles.streakItemTitle}>TRAINING & COMBAT</Text>
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
                    <Text style={styles.streakItemTitle}>MANA INTAKE (MEALS)</Text>
                    <Text style={styles.streakItemSub}>Daily nutrition logging</Text>
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
              <Text style={styles.modalDoneBtnText}>CONFIRM MATRIX</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#FFAA00',
    borderRadius: 14,
    padding: Spacing.three,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
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
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flameBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 170, 0, 0.15)',
    borderWidth: 1.2,
    borderColor: '#FFAA00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flameEmoji: {
    fontSize: 22,
  },
  systemTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#FFAA00',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  streakCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  streakCount: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  streakLabel: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#8AABCE',
    fontWeight: '800',
  },
  detailsBtn: {
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderWidth: 1,
    borderColor: '#FFAA00',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#FFAA00',
    letterSpacing: 1,
  },
  buffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  buffIcon: {
    fontSize: 13,
  },
  buffText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#90B4E0',
    fontWeight: '700',
  },
  buffHighlight: {
    color: '#00F0FF',
    fontWeight: '900',
  },
  weekContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  dayNode: {
    alignItems: 'center',
    gap: 5,
  },
  dayLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  dayLabelToday: {
    color: '#00F0FF',
    fontWeight: '900',
  },
  nodeCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#070C16',
    borderWidth: 1.5,
    borderColor: '#192C4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCircleCompleted: {
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    borderColor: '#FFAA00',
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  nodeCircleToday: {
    backgroundColor: 'rgba(0, 240, 255, 0.18)',
    borderColor: '#00F0FF',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  nodeCircleFuture: {
    borderColor: '#121E33',
  },
  nodeCheck: {
    fontSize: 12,
    fontWeight: '900',
    color: '#FFAA00',
  },
  nodeCurrent: {
    fontSize: 12,
    color: '#00F0FF',
  },
  nodeLocked: {
    fontSize: 10,
    color: '#344966',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#172744',
    paddingTop: 8,
  },
  longestStreak: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
  },
  longestVal: {
    color: '#E0E8FF',
    fontWeight: '800',
  },
  streakHint: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#4B6282',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.92)',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalContent: {
    backgroundColor: '#0D1424',
    borderWidth: 1.8,
    borderColor: '#FFAA00',
    borderRadius: 16,
    padding: Spacing.four,
    gap: Spacing.three,
    shadowColor: '#FFAA00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1A2E50',
    paddingBottom: 10,
  },
  modalTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#FFAA00',
    letterSpacing: 2,
    fontWeight: '800',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#080E1A',
    borderWidth: 1,
    borderColor: '#192C4D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    fontSize: 13,
    color: '#8AABCE',
    fontWeight: '800',
  },
  streakGrid: {
    gap: 10,
    paddingVertical: 4,
  },
  streakItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#080D1A',
    borderWidth: 1,
    borderColor: '#182C4E',
    borderRadius: 10,
    padding: 12,
  },
  streakItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  streakItemIcon: {
    fontSize: 20,
  },
  streakItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  streakItemSub: {
    fontSize: 9,
    color: '#6582A6',
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
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#4B6588',
  },
  modalDoneBtn: {
    backgroundColor: '#FFAA00',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#070B14',
    letterSpacing: 1.5,
  },
});
