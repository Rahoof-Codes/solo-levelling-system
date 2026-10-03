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
import { type Stat } from '@/types';
import { StatColors, Fonts, Spacing, Colors } from '@/constants/theme';
import { STAT_INFO } from '@/lib/calculations/leveling';
import { getRankImage } from '@/constants/rankImages';
import { useAudio } from '@/contexts/AudioContext';

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
  const { playClaimSound } = useAudio();

  const lockScale = useSharedValue(1);
  const lockRotation = useSharedValue(0);
  const lockOpacity = useSharedValue(1);
  const xpCounterScale = useSharedValue(0);
  const xpCounterOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const claimedBannerScale = useSharedValue(0);
  const particleOpacity = useSharedValue(0);
  const particleScale = useSharedValue(0.5);

  const statColor = StatColors[stat] || Colors.dark.cyan;
  const statInfo = STAT_INFO[stat];

  useEffect(() => {
    if (visible) {
      lockScale.value = 1;
      lockRotation.value = 0;
      lockOpacity.value = 1;
      xpCounterScale.value = 0;
      xpCounterOpacity.value = 0;
      glowOpacity.value = 0.35;
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
    playClaimSound();

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
  }, [onClaim, playClaimSound]);

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
          style={[styles.container, { borderColor: statColor }]}
        >
          {/* Ornate corner markers */}
          <View style={[styles.corner, styles.cornerTL, { borderColor: statColor }]} />
          <View style={[styles.corner, styles.cornerTR, { borderColor: statColor }]} />
          <View style={[styles.corner, styles.cornerBL, { borderColor: statColor }]} />
          <View style={[styles.corner, styles.cornerBR, { borderColor: statColor }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTag, { color: statColor }]}>⟨ SYSTEM REWARD ⟩</Text>
            <Text style={styles.activityName}>{activityName}</Text>
            {calories ? (
              <View style={styles.calorieBadge}>
                <Text style={styles.caloriesText}>🔥 {Math.round(calories)} kcal burned</Text>
              </View>
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
              <View style={[styles.lockIconBox, { borderColor: statColor }]}>
                <Text style={styles.lockIcon}>🔒</Text>
              </View>
              <Text style={styles.lockedStateLabel}>LOCKED REWARD</Text>
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
                <Text style={styles.claimedText}>✓ XP CLAIMED!</Text>

                {claimResult.leveledUp && (
                  <Animated.View entering={ZoomIn.delay(200)} style={styles.levelUpBanner}>
                    <Text style={styles.levelUpEmoji}>✨</Text>
                    <View>
                      <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
                      <Text style={styles.levelUpText}>
                        Ascended to Level {claimResult.newLevel}
                      </Text>
                    </View>
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
                      <Text style={styles.rankBannerSubtitle}>RANK ASCENSION</Text>
                      <Text style={styles.rankText}>
                        Promoted to {claimResult.newRank}-Rank Hunter
                      </Text>
                    </View>
                    <Text style={styles.rankEmoji}>👑</Text>
                  </Animated.View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Action Button */}
          {!hasClaimed ? (
            <TouchableOpacity
              style={[
                styles.claimButton,
                {
                  backgroundColor: statColor,
                  shadowColor: statColor,
                },
              ]}
              onPress={handleClaim}
              activeOpacity={0.8}
            >
              <Text style={styles.claimButtonText}>CLAIM REWARD</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.continueButton}
              onPress={onDismiss}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>CONTINUE</Text>
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
    backgroundColor: 'rgba(3, 7, 16, 0.92)',
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
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: Spacing.four,
    gap: Spacing.three,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 14,
    height: 14,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  headerTag: {
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 2,
  },
  activityName: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  calorieBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  caloriesText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#F59E0B',
    fontWeight: '700',
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
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  lockIcon: {
    fontSize: 32,
  },
  lockedStateLabel: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  lockedXPText: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  lockedStatText: {
    fontSize: 12,
    fontFamily: Fonts.display,
    color: Colors.dark.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    fontSize: 44,
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  xpStatLabel: {
    fontSize: 13,
    fontFamily: Fonts.display,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
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
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.success,
    letterSpacing: 1.5,
  },
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    width: '100%',
    justifyContent: 'center',
  },
  levelUpEmoji: {
    fontSize: 22,
  },
  levelUpTitle: {
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: '#F59E0B',
    letterSpacing: 1,
  },
  levelUpText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  rankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    width: '100%',
  },
  rankBannerPortrait: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#F43F5E',
    backgroundColor: Colors.dark.backgroundElement,
  },
  rankBannerSubtitle: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: '#FB7185',
    fontWeight: '700',
    letterSpacing: 1,
  },
  rankEmoji: {
    fontSize: 18,
  },
  rankText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: '#F43F5E',
    letterSpacing: 0.5,
  },
  claimButton: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  claimButtonText: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.backgroundDeep,
    letterSpacing: 1.5,
  },
  continueButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.accentBright,
    letterSpacing: 1,
  },
});
