import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
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

  return (
    <View style={styles.container}>
      {/* MANA / ENERGY BAR */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.manaTitle}>MANA (CALORIES)</Text>
          <Text style={styles.manaNumbers}>
            {Math.round(calorieSummary.consumed)} / {Math.round(manaTarget)} kcal
          </Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.max(3, manaPercent)}%`,
                backgroundColor: manaPercent > 100 ? '#FF3366' : '#0088FF',
                shadowColor: manaPercent > 100 ? '#FF3366' : '#00A8FF',
              },
            ]}
          />
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
        {/* Quests Today */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>📜</Text>
          <View>
            <Text style={styles.cardLabel}>QUESTS</Text>
            <Text style={styles.cardValue}>
              {completedQuestsCount}/{totalQuestsCount}
            </Text>
          </View>
        </View>

        {/* Steps Streak */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>⚡</Text>
          <View>
            <Text style={styles.cardLabel}>10K STREAK</Text>
            <Text style={styles.cardValue}>{stepsStreak}d</Text>
          </View>
        </View>

        {/* Quest Streak */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔥</Text>
          <View>
            <Text style={styles.cardLabel}>QUESTS</Text>
            <Text style={styles.cardValue}>{questStreak}d</Text>
          </View>
        </View>

        {/* Workout Streak */}
        <View style={styles.card}>
          <Text style={styles.cardIcon}>⚔️</Text>
          <View>
            <Text style={styles.cardLabel}>WORKOUTS</Text>
            <Text style={styles.cardValue}>{workoutStreak}d</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(13, 20, 36, 0.75)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1C2F52',
    padding: Spacing.three,
    gap: Spacing.two,
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
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#0088FF',
    letterSpacing: 1,
  },
  manaNumbers: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#7F9BBF',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#090E1A',
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#14223A',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  macroText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#5A6F8C',
  },
  macroVal: {
    color: '#A0BBE0',
    fontWeight: '700',
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
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#192C4D',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    gap: 6,
  },
  cardIcon: {
    fontSize: 16,
  },
  cardLabel: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#556C8C',
    letterSpacing: 0.5,
  },
  cardValue: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
  },
});
