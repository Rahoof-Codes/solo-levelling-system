import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { type Profile, Stat } from '@/types';
import { StatColors, StatGlows, Colors, Fonts, Spacing } from '@/constants/theme';
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
  const glow = StatGlows[statKey];
  const info = STAT_INFO[statKey];
  const targetPct = Math.max(3, Math.min(100, (xp / maxXP) * 100));

  const barWidth = useSharedValue(0);

  useEffect(() => {
    barWidth.value = withDelay(
      250 + index * 100,
      withTiming(targetPct, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [targetPct, index]);

  const barAnimStyle = useAnimatedStyle(() => ({
    width: `${barWidth.value}%`,
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(150 + index * 80)}
      style={styles.row}
    >
      {/* Stat badge */}
      <View style={styles.statMeta}>
        <View style={[styles.statBadge, { borderColor: color, backgroundColor: glow }]}>
          <Text style={[styles.statKey, { color }]}>{statKey}</Text>
        </View>
        <View style={styles.infoWrapper}>
          <Text style={styles.statName}>{info.label}</Text>
          <Text style={styles.statDesc}>{info.description}</Text>
        </View>
        <View style={[styles.statValueBadge, { borderColor: color }]}>
          <Text style={[styles.statValue, { color }]}>{xp}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.barTrack}>
        <Animated.View
          style={[
            styles.barFill,
            {
              backgroundColor: color,
              boxShadow: `0px 0px 6px 0px ${glow}`,
            },
            barAnimStyle,
          ]}
        />
        {/* Shine overlay */}
        <View style={styles.barShine} />
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

  const maxStatXP = Math.max(100, ...statsList.map((s) => s.xp));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerEmber} />
          <Text style={styles.headerTitle}>CORE ATTRIBUTES</Text>
        </View>
        <Text style={styles.headerSub}>Stats</Text>
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
    backgroundColor: Colors.dark.backgroundElement,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
    boxShadow: '0px 4px 14px 0px rgba(0, 0, 0, 0.35)',
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerEmber: {
    width: 8,
    height: 8,
    backgroundColor: Colors.dark.accent,
    borderRadius: 4,
    boxShadow: `0px 0px 6px 0px ${Colors.dark.accentGlow}`,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 1.5,
  },
  headerSub: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
    fontWeight: '500',
  },
  list: {
    gap: Spacing.three,
  },
  row: {
    gap: 8,
  },
  statMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statBadge: {
    width: 42,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statKey: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    letterSpacing: 1,
  },
  infoWrapper: {
    flex: 1,
    paddingHorizontal: 10,
  },
  statName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Fonts.sans,
    color: Colors.dark.text,
  },
  statDesc: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
  },
  statValueBadge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(249, 115, 22, 0.04)',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  barTrack: {
    height: 10,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '45%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderTopLeftRadius: 5,
    borderTopRightRadius: 5,
  },
});
