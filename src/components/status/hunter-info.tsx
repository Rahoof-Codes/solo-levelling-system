import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { type Profile } from '@/types';
import { getXPProgress } from '@/lib/calculations/leveling';
import { RankBadge } from './rank-badge';
import { Fonts, Spacing, RankColors } from '@/constants/theme';
import { getRankImage } from '@/constants/rankImages';

interface HunterInfoProps {
  profile: Profile;
}

export function HunterInfo({ profile }: HunterInfoProps) {
  const xp = getXPProgress(profile.total_xp);
  const rankColor = RankColors[profile.rank] || RankColors.E;
  const rankImage = getRankImage(profile.rank);

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Hunter Rank Portrait */}
        <View style={[styles.avatarContainer, { borderColor: rankColor, shadowColor: rankColor }]}>
          <Image source={rankImage} style={styles.avatarImage} contentFit="cover" />
          <View style={[styles.rankMiniTag, { backgroundColor: rankColor }]}>
            <Text style={styles.rankMiniTagText}>{profile.rank}</Text>
          </View>
        </View>

        {/* Identity & Level */}
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.username || 'Sung Jin-Woo'}
          </Text>
          <Text style={[styles.title, { color: rankColor }]}>
            {profile.title || `${profile.rank}-Rank Hunter`}
          </Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={[styles.levelValue, { color: rankColor }]}>{profile.level}</Text>
          </View>
        </View>

        <RankBadge rank={profile.rank} size="medium" />
      </View>

      {/* XP Progress Bar */}
      <View style={styles.xpSection}>
        <View style={styles.xpLabels}>
          <Text style={[styles.xpTitle, { color: rankColor }]}>EXP</Text>
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
                backgroundColor: rankColor,
                shadowColor: rankColor,
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
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: Spacing.threeHalf,
    gap: Spacing.three,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0B1120',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  rankMiniTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankMiniTagText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#0B1120',
  },
  identity: {
    flex: 1,
    gap: 3,
  },
  name: {
    fontSize: 19,
    fontWeight: '800',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  levelLabel: {
    fontSize: 11,
    color: '#8896AB',
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  levelValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  xpSection: {
    marginTop: 2,
    gap: 6,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  xpNumbers: {
    fontSize: 11,
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
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
});
