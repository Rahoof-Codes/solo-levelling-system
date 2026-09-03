import React, { useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  Easing,
  SlideInUp,
  ZoomIn,
} from 'react-native-reanimated';
import { type Stat, Rank } from '@/types';
import { StatColors, Fonts, Spacing, RankColors } from '@/constants/theme';
import { STAT_INFO } from '@/lib/calculations/leveling';
import { getRankImage } from '@/constants/rankImages';

const { width, height } = Dimensions.get('window');

interface XPClaimModalProps {
  visible: boolean;
  xpAmount: number;
  stat: Stat;
  activityName: string;
  calories?: number;
  onClaim: () => void;
  onDismiss: () => void;
  claimResult?: {
    leveledUp: boolean;
    newLevel?: number;
    rankChanged: boolean;
    newRank?: string;
  } | null;
}

export function XPClaimModal({
  visible,
  xpAmount,
  stat,
  activityName,
  calories,
  onClaim,
  onDismiss,
  claimResult,
}: XPClaimModalProps) {
  const lockScale = useSharedValue(1);
  const lockRotation = useSharedValue(0);
  const lockOpacity = useSharedValue(1);
  const xpCounterScale = useSharedValue(0);
  const xpCounterOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const claimedBannerScale = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.5);

  const statColor = StatColors[stat] || '#00F0FF';
  const statInfo = STAT_INFO[stat];

  useEffect(() => {
    if (visible) {
      lockScale.value = 1;
      lockRotation.value = 0;
      lockOpacity.value = 1;
      xpCounterScale.value = 0;
      xpCounterOpacity.value = 0;
      glowOpacity.value = 0.3;
      claimedBannerScale.value = 0;
      particleOpacity.value = 0;
      particleScale.value = 0.5;

      lockScale.value = withSequence(
        withTiming(1.06, { duration: 600 }),
        withTiming(0.96, { duration: 600 }),
        withTiming(1.04, { duration: 600 }),
        withTiming(1, { duration: 300 })
      );

      glowOpacity.value = withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
        withTiming(0.6, { duration: 800 })
      );
    }
  }, [visible]);

  const handleClaim = useCallback(() => {
    // Lock breaking animation
    lockRotation.value = withSequence(
      withTiming(-16, { duration: 80 }),
      withTiming(16, { duration: 80 }),
      withTiming(-10, { duration: 70 }),
      withTiming(10, { duration: 70 }),
      withTiming(0, { duration: 50 })
    );

    lockScale.value = withSequence(
      withTiming(1.3, { duration: 180 }),
      withTiming(0, { duration: 250, easing: Easing.bezier(0.4, 0, 1, 1) })
    );

    lockOpacity.value = withDelay(250, withTiming(0, { duration: 150 }));

    // Particle burst
    particleOpacity.value = withDelay(180, withSequence(
      withTiming(1, { duration: 180 }),
      withDelay(700, withTiming(0, { duration: 300 }))
    ));
    particleScale.value = withDelay(180, withSpring(1.6, { damping: 9 }));

    // XP counter appearance
    xpCounterOpacity.value = withDelay(320, withTiming(1, { duration: 250 }));
    xpCounterScale.value = withDelay(320, withSpring(1, { damping: 10, stiffness: 200 }));

    // Glow intensifies
    glowOpacity.value = withDelay(300, withTiming(0.9, { duration: 300 }));

    onClaim();
  }, [onClaim]);

  useEffect(() => {
    if (claimResult) {
      claimedBannerScale.value = withDelay(150, withSpring(1, { damping: 12, stiffness: 180 }));
    }
  }, [claimResult]);

  const lockAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: lockScale.value },
      { rotate: `${lockRotation.value}deg` },
    ],
    opacity: lockOpacity.value,
  }));

  const xpCounterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpCounterScale.value }],
    opacity: xpCounterOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const claimedBannerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: claimedBannerScale.value }],
  }));

  const particleStyle = useAnimatedStyle(() => ({
    opacity: particleOpacity.value,
    transform: [{ scale: particleScale.value }],
  }));

  const hasClaimed = !!claimResult;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        {/* Background glow */}
        <Animated.View style={[styles.backgroundGlow, { backgroundColor: statColor }, glowStyle]} />

        <Animated.View
          entering={SlideInUp.springify().damping(18).stiffness(200)}
          style={styles.container}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTag}>Reward Available</Text>
            <Text style={styles.activityName}>{activityName}</Text>
            {calories ? (
              <Text style={styles.caloriesText}>🔥 {Math.round(calories)} kcal burned</Text>
            ) : null}
          </View>

          {/* Lock / XP Display Area */}
          <View style={styles.xpArea}>
            <Animated.View style={[styles.particlesContainer, particleStyle]}>
              {[...Array(8)].map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                const radius = 64;
                return (
                  <View
                    key={i}
                    style={[
                      styles.particle,
                      {
                        backgroundColor: statColor,
                        left: 76 + Math.cos(angle) * radius,
                        top: 76 + Math.sin(angle) * radius,
                      },
                    ]}
                  />
                );
              })}
            </Animated.View>

            {/* Lock icon */}
            <Animated.View style={[styles.lockContainer, lockAnimStyle]}>
              <View style={styles.lockIconBox}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={styles.lockedStateLabel}>Locked Reward</Text>
              <Text style={[styles.lockedXPText, { color: statColor }]}>
                +{xpAmount} XP
              </Text>
              <Text style={styles.lockedStatText}>{statInfo?.label || stat}</Text>
            </Animated.View>

            {/* XP Counter */}
            <Animated.View style={[styles.xpCounterContainer, xpCounterStyle]}>
              <Text style={styles.unlockedIcon}>⚡</Text>
              <Text style={[styles.xpCounterText, { color: statColor }]}>
                +{xpAmount}
              </Text>
              <Text style={[styles.xpStatLabel, { color: statColor }]}>
                {statInfo?.label || stat} XP
              </Text>
            </Animated.View>
          </View>

          {/* Level Up / Rank Change Banners */}
          {claimResult && (
            <Animated.View style={[styles.claimedBannerWrapper, claimedBannerStyle]}>
              <View style={styles.claimedContainer}>
                <Text style={styles.claimedText}>✓ XP Claimed!</Text>

                {claimResult.leveledUp && (
                  <Animated.View entering={ZoomIn.delay(200)} style={styles.levelUpBanner}>
                    <Text style={styles.levelUpEmoji}>🎉</Text>
                    <Text style={styles.levelUpText}>
                      Level Up! → Level {claimResult.newLevel}
                    </Text>
                  </Animated.View>
                )}

                {claimResult.rankChanged && (
                  <Animated.View entering={ZoomIn.delay(350)} style={styles.rankBanner}>
                    <Image
                      source={getRankImage(claimResult.newRank)}
                      style={styles.rankBannerPortrait}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.rankBannerSubtitle}>Rank Up!</Text>
                      <Text style={styles.rankText}>
                        Promoted to {claimResult.newRank}-Rank
                      </Text>
                    </View>
                    <Text style={styles.rankEmoji}>⭐</Text>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Action Button */}
          {!hasClaimed ? (
            <TouchableOpacity
              style={[styles.claimButton, { backgroundColor: statColor }]}
              onPress={handleClaim}
              activeOpacity={0.8}
            >
              <Text style={styles.claimButtonText}>🔓 Claim XP</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 16, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.four,
  },
  backgroundGlow: {
    position: 'absolute',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    top: height * 0.22,
  },
  container: {
    width: '100%',
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 14,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  headerTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  activityName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    textAlign: 'center',
  },
  caloriesText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#FFAA00',
    fontWeight: '600',
    marginTop: 2,
  },
  xpArea: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  particlesContainer: {
    position: 'absolute',
    width: 170,
    height: 170,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lockContainer: {
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
  },
  lockIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0E1726',
    borderWidth: 1.5,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lockIcon: {
    fontSize: 34,
  },
  lockedStateLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
  },
  lockedXPText: {
    fontSize: 26,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  lockedStatText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '500',
  },
  xpCounterContainer: {
    alignItems: 'center',
    gap: 4,
    position: 'absolute',
  },
  unlockedIcon: {
    fontSize: 38,
  },
  xpCounterText: {
    fontSize: 40,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  xpStatLabel: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },
  claimedBannerWrapper: {
    width: '100%',
  },
  claimedContainer: {
    alignItems: 'center',
    gap: 10,
    width: '100%',
  },
  claimedText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#00FF88',
  },
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
  },
  levelUpEmoji: {
    fontSize: 18,
  },
  levelUpText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#FFD700',
  },
  rankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 0, 85, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 0, 85, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  rankBannerPortrait: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#FF0055',
    backgroundColor: '#0E1726',
  },
  rankBannerSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#FF6699',
    fontWeight: '600',
  },
  rankEmoji: {
    fontSize: 18,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#FF0055',
  },
  claimButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#0B1120',
  },
  continueButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
  },
  continueButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#00A8FF',
  },
});
