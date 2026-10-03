import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
  ZoomIn,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { type Profile } from '@/types';
import { getXPProgress } from '@/lib/calculations/leveling';
import { RankBadge } from './rank-badge';
import { Colors, Fonts, Spacing, RankColors, RankGlows } from '@/constants/theme';
import { getRankImage } from '@/constants/rankImages';

interface HunterInfoProps {
  profile: Profile;
}

export function HunterInfo({ profile }: HunterInfoProps) {
  const xp = getXPProgress(profile.total_xp);
  const rankColor = RankColors[profile.rank] || RankColors.E;
  const rankGlow = RankGlows[profile.rank] || RankGlows.E;
  const rankImage = getRankImage(profile.rank);

  const targetPct = Math.max(2, Math.min(100, xp.percentage));
  const xpBarWidth = useSharedValue(0);

  // Animated glow ring opacity
  const ringGlowOp = useSharedValue(0.2);

  useEffect(() => {
    xpBarWidth.value = withDelay(
      400,
      withTiming(targetPct, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      })
    );
    ringGlowOp.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [targetPct]);

  const animatedXPBarStyle = useAnimatedStyle(() => ({
    width: `${xpBarWidth.value}%`,
  }));

  const avatarGlowStyle = useAnimatedStyle(() => ({
    opacity: ringGlowOp.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Hunter Rank Portrait with Glow Ring */}
        <Animated.View
          entering={ZoomIn.springify().damping(12)}
          style={styles.avatarOuter}
        >
          {/* Animated glow overlay ring */}
          <Animated.View
            style={[
              styles.avatarGlowRing,
              {
                borderColor: rankColor,
                boxShadow: `0px 0px 16px 0px ${rankGlow}`,
              },
              avatarGlowStyle,
            ]}
          />
          <View style={[styles.avatarContainer, { borderColor: rankColor }]}>
            <Image source={rankImage} style={styles.avatarImage} contentFit="cover" />
            <View style={[styles.rankMiniTag, { backgroundColor: rankColor }]}>
              <Text style={styles.rankMiniTagText}>{profile.rank}</Text>
            </View>
          </View>
        </Animated.View>

        {/* Identity & Level */}
        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {profile.username || 'Sung Jin-Woo'}
          </Text>
          <Text style={[styles.title, { color: rankColor }]}>
            {profile.title || `${profile.rank}-Rank Hunter`}
          </Text>
          <View style={styles.levelRow}>
            <View style={[styles.levelBadge, { borderColor: rankColor }]}>
              <Text style={styles.levelLabel}>LVL</Text>
              <Text style={[styles.levelValue, { color: rankColor }]}>{profile.level}</Text>
            </View>
            <Text style={styles.totalXP}>
              {profile.total_xp.toLocaleString()} XP
            </Text>
          </View>
        </View>

        <RankBadge rank={profile.rank} size="medium" />
      </View>

      {/* XP Progress Bar */}
      <View style={styles.xpSection}>
        <View style={styles.xpLabels}>
          <View style={styles.xpTitleRow}>
            <View style={[styles.xpDot, { backgroundColor: rankColor }]} />
            <Text style={[styles.xpTitle, { color: rankColor }]}>EXP</Text>
          </View>
          <Text style={styles.xpNumbers}>
            {xp.xpInCurrentLevel.toLocaleString()} / {xp.xpNeededForNextLevel.toLocaleString()} ({Math.floor(xp.percentage)}%)
          </Text>
        </View>

        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: rankColor,
                boxShadow: `0px 0px 8px 0px ${rankGlow}`,
              },
              animatedXPBarStyle,
            ]}
          />
          {/* Shine overlay */}
          <View style={styles.barShine} />
        </View>
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarOuter: {
    position: 'relative',
  },
  avatarGlowRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: 18,
    borderWidth: 2,
    pointerEvents: 'none',
  },
  avatarContainer: {
    width: 76,
    height: 76,
    borderRadius: 16,
    borderWidth: 2.5,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: Colors.dark.backgroundDeep,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  rankMiniTag: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  rankMiniTagText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: Colors.dark.backgroundDeep,
  },
  identity: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
  },
  levelLabel: {
    fontSize: 9,
    color: Colors.dark.textMuted,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    letterSpacing: 1,
  },
  levelValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  totalXP: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
  },
  xpSection: {
    gap: 8,
  },
  xpLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  xpTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  xpTitle: {
    fontSize: 12,
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  xpNumbers: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
  },
  barTrack: {
    height: 12,
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    position: 'relative',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
});
