import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
  FadeIn,
  ZoomIn,
} from 'react-native-reanimated';
import { type Profile, Stat } from '@/types';
import { StatColors, Fonts, Spacing } from '@/constants/theme';
import { STAT_INFO } from '@/lib/calculations/leveling';

interface StatBarsProps {
  profile: Profile;
}

function AnimatedStatBar({
  statKey,
  label,
  xp,
  maxXP,
  index,
}: {
  statKey: Stat;
  label: string;
  xp: number;
  maxXP: number;
  index: number;
}) {
  const color = StatColors[statKey];
  const info = STAT_INFO[statKey];
  const targetPct = Math.max(3, Math.min(100, (xp / maxXP) * 100));

  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withDelay(
      200 + index * 120,
      withTiming(targetPct, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [targetPct, index]);

  const barAnimStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
    backgroundColor: color,
    shadowColor: color,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(150 + index * 80)}
      style={styles.row}
    >
      <View style={styles.statMeta}>
        <View style={styles.badgeWrapper}>
          <Text style={[styles.statKey, { color }]}>{statKey}</Text>
        </View>
        <View style={styles.infoWrapper}>
          <Text style={styles.statName}>{info.label}</Text>
          <Text style={styles.statDesc}>{info.description}</Text>
        </View>
        <Text style={[styles.statValue, { color }]}>{xp}</Text>
      </View>

      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barAnimStyle]} />
      </View>
    </Animated.View>
  );
}

export function StatBars({ profile }: StatBarsProps) {
  const statsList: { key: Stat; label: string; xp: number }[] = [
    { key: Stat.STR, label: 'STR', xp: profile.str_xp },
    { key: Stat.VIT, label: 'VIT', xp: profile.vit_xp },
    { key: Stat.AGI, label: 'AGI', xp: profile.agi_xp },
    { key: Stat.INT, label: 'INT', xp: profile.int_xp },
    { key: Stat.PER, label: 'PER', xp: profile.per_xp },
  ];

  // Scale bars relative to the highest stat (or 100 base)
  const maxStatXP = Math.max(100, ...statsList.map((s) => s.xp));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Core Stats</Text>
        <Text style={styles.headerSub}>Attributes</Text>
      </View>

      <View style={styles.list}>
        {statsList.map((item, index) => (
          <AnimatedStatBar
            key={item.key}
            statKey={item.key}
            label={item.label}
            xp={item.xp}
            maxXP={maxStatXP}
            index={index}
          />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '500',
  },
  list: {
    gap: Spacing.three,
    marginTop: 4,
  },
  row: {
    gap: 6,
  },
  statMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeWrapper: {
    width: 44,
  },
  statKey: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    letterSpacing: 1,
  },
  infoWrapper: {
    flex: 1,
    paddingHorizontal: 8,
  },
  statName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.sans,
    color: '#D2E0F5',
  },
  statDesc: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
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
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
});
