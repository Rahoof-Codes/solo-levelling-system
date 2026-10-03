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
import { Colors, Fonts, Spacing } from '@/constants/theme';

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
        duration: 950,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [manaPercent]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  const isOverTarget = manaPercent > 100;

  const quickCards = [
    { icon: '📜', label: 'Quests', value: `${completedQuestsCount}/${totalQuestsCount}`, color: Colors.dark.accent },
    { icon: '⚡', label: 'Steps', value: `${stepsStreak}d`, color: Colors.dark.cyan },
    { icon: '🔥', label: 'Quest', value: `${questStreak}d`, color: Colors.dark.gold },
    { icon: '⚔️', label: 'Train', value: `${workoutStreak}d`, color: Colors.dark.danger },
  ];

  return (
    <View style={styles.container}>
      {/* MANA / ENERGY BAR */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.manaTitleRow}>
            <View style={styles.manaIcon} />
            <Text style={styles.manaTitle}>MANA RESERVE</Text>
          </View>
          <Text style={styles.manaNumbers}>
            {Math.round(calorieSummary.consumed)} / {Math.round(manaTarget)} kcal
          </Text>
        </View>

        {/* Mana bar */}
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: isOverTarget ? Colors.dark.danger : Colors.dark.mana,
                boxShadow: `0px 0px 8px 0px ${isOverTarget ? Colors.dark.dangerGlow : Colors.dark.manaGlow}`,
              },
              animatedBarStyle,
            ]}
          />
          <View style={styles.barShine} />
        </View>

        {/* Macro row */}
        <View style={styles.macroRow}>
          <View style={styles.macroPill}>
            <Text style={[styles.macroLabel, { color: Colors.dark.danger }]}>🔥</Text>
            <Text style={styles.macroText}>-{Math.round(calorieSummary.burned)}</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={[styles.macroLabel, { color: '#EF4444' }]}>P</Text>
            <Text style={styles.macroText}>{Math.round(calorieSummary.protein_consumed)}g</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={[styles.macroLabel, { color: '#F59E0B' }]}>C</Text>
            <Text style={styles.macroText}>{Math.round(calorieSummary.carbs_consumed)}g</Text>
          </View>
          <View style={styles.macroPill}>
            <Text style={[styles.macroLabel, { color: '#22C55E' }]}>F</Text>
            <Text style={styles.macroText}>{Math.round(calorieSummary.fat_consumed)}g</Text>
          </View>
        </View>
      </View>

      {/* QUICK STATS CARDS */}
      <View style={styles.cardsRow}>
        {quickCards.map((card, idx) => (
          <Animated.View
            key={card.label}
            entering={FadeInUp.duration(400).delay(200 + idx * 80)}
            style={[styles.card, { borderColor: `${card.color}22` }]}
          >
            <Text style={styles.cardIcon}>{card.icon}</Text>
            <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
            <Text style={styles.cardLabel}>{card.label}</Text>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
    boxShadow: '0px 4px 14px 0px rgba(0, 0, 0, 0.35)',
    elevation: 6,
  },
  section: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  manaTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  manaIcon: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.dark.mana,
    boxShadow: `0px 0px 6px 0px ${Colors.dark.manaGlow}`,
  },
  manaTitle: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.mana,
    letterSpacing: 1.5,
  },
  manaNumbers: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
  },
  barTrack: {
    height: 14,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 7,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 6,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
    gap: 4,
  },
  macroPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  macroLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  macroText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  cardsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 4,
    boxShadow: '0px 2px 8px 0px rgba(0, 0, 0, 0.25)',
    elevation: 3,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  cardLabel: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
