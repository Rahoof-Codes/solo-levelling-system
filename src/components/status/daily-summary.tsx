import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInUp,
} from 'react-native-reanimated';
import { type DailyCalorieSummary, type Streak } from '@/types';
import { Fonts, Spacing } from '@/constants/theme';

interface DailySummaryProps {
  calorieSummary: DailyCalorieSummary;
  completedQuestsCount: number;
  totalQuestsCount: number;
  streaks: Streak[];
}

export function DailySummary({
  calorieSummary,
  completedQuestsCount,
  totalQuestsCount,
  streaks,
}: DailySummaryProps) {
  const questStreak = streaks.find((s) => s.type === 'daily_quest')?.current_count ?? 0;
  const workoutStreak = streaks.find((s) => s.type === 'workout')?.current_count ?? 0;
  const stepsStreak = streaks.find((s) => s.type === 'steps')?.current_count ?? 0;

  // Mana / Energy bar percentage
  const manaTarget = Math.max(1000, calorieSummary.target);
  const manaPercent = Math.min(100, Math.max(0, (calorieSummary.consumed / manaTarget) * 100));

  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withDelay(
      350,
      withTiming(Math.max(3, manaPercent), {
        duration: 850,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [manaPercent]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
    backgroundColor: manaPercent > 100 ? '#FF3366' : '#0088FF',
    shadowColor: manaPercent > 100 ? '#FF3366' : '#00A8FF',
  }));

  const quickCards = [
    { icon: '📜', label: 'Quests', value: `${completedQuestsCount}/${totalQuestsCount}` },
    { icon: '⚡', label: 'Steps', value: `${stepsStreak}d` },
    { icon: '🔥', label: 'Quest Streak', value: `${questStreak}d` },
    { icon: '⚔️', label: 'Workouts', value: `${workoutStreak}d` },
  ];

  return (
    <View style={styles.container}>
      {/* ENERGY INTAKE BAR */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.manaTitle}>Energy Intake</Text>
          <Text style={styles.manaNumbers}>
            {Math.round(calorieSummary.consumed)} / {Math.round(manaTarget)} kcal
          </Text>
        </View>

        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, animatedBarStyle]} />
        </View>

        <View style={styles.macroRow}>
          <Text style={styles.macroText}>
            Burned: <Text style={styles.macroVal}>-{Math.round(calorieSummary.burned)}</Text>
          </Text>
          <Text style={styles.macroText}>
            P: <Text style={styles.macroVal}>{Math.round(calorieSummary.protein_consumed)}g</Text>
          </Text>
          <Text style={styles.macroText}>
            C: <Text style={styles.macroVal}>{Math.round(calorieSummary.carbs_consumed)}g</Text>
          </Text>
          <Text style={styles.macroText}>
            F: <Text style={styles.macroVal}>{Math.round(calorieSummary.fat_consumed)}g</Text>
          </Text>
        </View>
      </View>

      {/* QUICK STATS CARDS */}
      <View style={styles.cardsRow}>
        {quickCards.map((card, idx) => (
          <Animated.View
            key={card.label}
            entering={FadeInUp.duration(400).delay(200 + idx * 80)}
            style={styles.card}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <View>
              <Text style={styles.cardLabel}>{card.label}</Text>
              <Text style={styles.cardValue}>{card.value}</Text>
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(17, 24, 39, 0.75)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: Spacing.threeHalf,
    gap: Spacing.three,
  },
  section: {
    gap: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  manaTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#0088FF',
  },
  manaNumbers: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: '#8896AB',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#0B1120',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1E293B',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
    elevation: 3,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  macroText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  macroVal: {
    color: '#A8B8CC',
    fontWeight: '600',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    marginTop: 4,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  cardIcon: {
    fontSize: 16,
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#00A8FF',
  },
});
