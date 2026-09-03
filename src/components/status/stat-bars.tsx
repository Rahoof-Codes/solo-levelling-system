import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Profile, Stat } from '@/types';
import { StatColors, Fonts, Spacing } from '@/constants/theme';
import { STAT_INFO } from '@/lib/calculations/leveling';

interface StatBarsProps {
  profile: Profile;
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
        {statsList.map((item) => {
          const color = StatColors[item.key];
          const info = STAT_INFO[item.key];
          const pct = Math.max(3, Math.min(100, (item.xp / maxStatXP) * 100));

          return (
            <View key={item.key} style={styles.row}>
              <View style={styles.statMeta}>
                <View style={styles.badgeWrapper}>
                  <Text style={[styles.statKey, { color }]}>{item.key}</Text>
                </View>
                <View style={styles.infoWrapper}>
                  <Text style={styles.statName}>{info.label}</Text>
                  <Text style={styles.statDesc}>{info.description}</Text>
                </View>
                <Text style={[styles.statValue, { color }]}>{item.xp}</Text>
              </View>

              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: color,
                      shadowColor: color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
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
