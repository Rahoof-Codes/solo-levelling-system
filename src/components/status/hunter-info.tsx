import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Profile } from '@/types';
import { getXPProgress } from '@/lib/calculations/leveling';
import { RankBadge } from './rank-badge';
import { Colors, Fonts, Spacing } from '@/constants/theme';

interface HunterInfoProps {
  profile: Profile;
}

export function HunterInfo({ profile }: HunterInfoProps) {
  const xp = getXPProgress(profile.total_xp);
  const theme = Colors.dark;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <View style={styles.identity}>
          <Text style={styles.name}>{profile.username || 'Sung Jin-Woo'}</Text>
          <Text style={styles.title}>{profile.title || `${profile.rank}-Rank Hunter`}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel}>LEVEL</Text>
            <Text style={styles.levelValue}>{profile.level}</Text>
          </View>
        </View>

        <RankBadge rank={profile.rank} size="large" />
      </View>

      {/* XP Progress Bar */}
      <View style={styles.xpSection}>
        <View style={styles.xpLabels}>
          <Text style={styles.xpTitle}>EXP</Text>
          <Text style={styles.xpNumbers}>
            {xp.xpInCurrentLevel.toLocaleString()} / {xp.xpNeededForNextLevel.toLocaleString()} ({Math.floor(xp.percentage)}%)
          </Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${Math.max(2, Math.min(100, xp.percentage))}%`,
              },
            ]}
          />
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
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  identity: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#E6F0FF',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 13,
    color: '#00A8FF',
    fontFamily: Fonts.mono,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 4,
  },
  levelLabel: {
    fontSize: 12,
    color: '#6B82A8',
    fontFamily: Fonts.mono,
    letterSpacing: 1,
  },
  levelValue: {
    fontSize: 20,
    fontWeight: '900',
    color: '#00F0FF',
    fontFamily: Fonts.mono,
  },
  xpSection: {
    marginTop: 4,
    gap: 4,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#00A8FF',
  },
  xpNumbers: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#7F9BBF',
  },
  barTrack: {
    height: 10,
    backgroundColor: '#090E1A',
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#192C4D',
  },
  barFill: {
    height: '100%',
    backgroundColor: '#00A8FF',
    borderRadius: 4,
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
});
