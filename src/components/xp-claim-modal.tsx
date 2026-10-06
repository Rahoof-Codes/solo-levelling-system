import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  withSpring,
  withRepeat,
  Easing,
  ZoomIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useSQLiteContext } from 'expo-sqlite';
import { type Stat, type Profile } from '@/types';
import { getProfile } from '@/db/operations';
import { getXPProgress } from '@/lib/calculations/leveling';
import { getRankImage } from '@/constants/rankImages';
import { useAudio } from '@/contexts/AudioContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface XPClaimModalProps {
  visible: boolean;
  xpAmount: number;
  stat?: Stat;
  activityName: string;
  subtitle?: string;
  details?: string;
  completionTagText?: string;
  completionCountText?: string;
  protocolText?: string;
  rewardReadyText?: string;
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
  activityName,
  subtitle,
  details,
  completionTagText,
  completionCountText,
  protocolText,
  rewardReadyText,
  calories,
  onClaim,
  onDismiss,
  claimResult,
}: XPClaimModalProps) {
  const db = useSQLiteContext();
  const { playClaimSound } = useAudio();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [hasClaimedLocal, setHasClaimedLocal] = useState(false);

  // Animation shared values
  const cardScale = useSharedValue(0.92);
  const cardOpacity = useSharedValue(0);
  const auraScale = useSharedValue(1);
  const auraOpacity = useSharedValue(0.65);
  const ringRotation = useSharedValue(0);
  const sparkFloating = useSharedValue(0);
  const earnedBarProgress = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const xpAmountScale = useSharedValue(0.8);
  const particleBurst = useSharedValue(0);

  // Fetch real-time player data from SQLite
  useEffect(() => {
    if (visible) {
      setHasClaimedLocal(false);
      (async () => {
        try {
          const p = await getProfile(db);
          if (p) setProfile(p);
        } catch (e) {
          console.warn('[XPClaimModal] Error loading profile:', e);
        }
      })();
    }
  }, [visible, db]);

  // Derived progression data using original player profile
  const progressData = useMemo(() => {
    const totalXP = profile?.total_xp ?? 0;
    const currentProg = getXPProgress(totalXP);
    const afterTotalXP = totalXP + xpAmount;
    const afterProg = getXPProgress(afterTotalXP);

    const level = claimResult?.newLevel ?? profile?.level ?? currentProg.currentLevel;
    const maxXP = Math.max(afterProg.xpNeededForNextLevel, 100);
    const afterClaimXP = afterProg.xpInCurrentLevel;
    const remainingToNext = Math.max(0, maxXP - afterClaimXP);
    const nextLevel = (claimResult?.newLevel ?? level) + 1;

    // Bar percentages
    const currentPercent = maxXP > 0 ? Math.min(100, (currentProg.xpInCurrentLevel / maxXP) * 100) : 0;
    const earnedPercent = maxXP > 0 ? Math.min(100 - currentPercent, (xpAmount / maxXP) * 100) : 0;

    return {
      level,
      nextLevel,
      currentProg,
      afterProg,
      afterClaimXP,
      maxXP,
      remainingToNext,
      currentPercent,
      earnedPercent,
    };
  }, [profile, xpAmount, claimResult]);

  // Trigger animations on modal open
  useEffect(() => {
    if (visible) {
      cardScale.value = 0.92;
      cardOpacity.value = 0;
      earnedBarProgress.value = 0;
      xpAmountScale.value = 0.8;
      particleBurst.value = 0;

      // Entrance
      cardScale.value = withSpring(1, { damping: 14, stiffness: 180 });
      cardOpacity.value = withTiming(1, { duration: 300 });

      // XP text pop
      xpAmountScale.value = withDelay(180, withSpring(1, { damping: 9, stiffness: 220 }));

      // Earned XP bar growth
      earnedBarProgress.value = withDelay(
        400,
        withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) })
      );

      // Continuous breathing aura
      auraScale.value = withRepeat(
        withSequence(
          withTiming(1.14, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      auraOpacity.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.55, { duration: 1600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Energy ring slow continuous rotation
      ringRotation.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );

      // Sparks floating pulse
      sparkFloating.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
          withTiming(-1, { duration: 1400, easing: Easing.inOut(Easing.quad) })
        ),
        -1,
        true
      );
    }
  }, [visible]);

  // Handle claiming action
  const handleClaim = useCallback(() => {
    if (hasClaimedLocal || claimResult) {
      onDismiss();
      return;
    }

    playClaimSound();
    setHasClaimedLocal(true);

    // Button tactile bounce
    buttonScale.value = withSequence(
      withTiming(0.94, { duration: 80 }),
      withSpring(1, { damping: 10 })
    );

    // Burst glow
    particleBurst.value = withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(400, withTiming(0, { duration: 300 }))
    );

    // Execute claim callback
    onClaim();
  }, [hasClaimedLocal, claimResult, onClaim, onDismiss, playClaimSound]);

  // Animated styles
  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const auraAnimStyle = useAnimatedStyle(() => ({
    opacity: auraOpacity.value,
    transform: [{ scale: auraScale.value }],
  }));

  const ringAnimStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }));

  const xpNumberAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: xpAmountScale.value }],
  }));

  const spark1AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: sparkFloating.value * 3 },
      { translateX: -sparkFloating.value * 2 },
    ],
  }));

  const spark2AnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -sparkFloating.value * 3 },
      { translateX: sparkFloating.value * 2 },
    ],
  }));

  const spark3AnimStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sparkFloating.value * 2 }],
  }));

  const earnedBarStyle = useAnimatedStyle(() => ({
    width: `${progressData.earnedPercent * earnedBarProgress.value}%`,
  }));

  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const burstAnimStyle = useAnimatedStyle(() => ({
    opacity: particleBurst.value,
    transform: [{ scale: 1 + particleBurst.value * 0.4 }],
  }));

  const isClaimed = hasClaimedLocal || !!claimResult;

  // Formatting strings
  const displaySubtitle = subtitle || 'DAILY QUEST';
  const cleanTitle = (activityName || '').replace(/^QUEST:\s*/i, '').toUpperCase();
  const displayDetails =
    details ||
    (calories
      ? `🔥 ${Math.round(calories)} kcal burned · System Objective Complete`
      : 'Push-ups · Sit-ups · Squats · Running');

  const displayCompletionTag = completionTagText || 'FULL CLEAR';
  const displayCompletionCount = completionCountText || '4 / 4 COMPLETE';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.modalCard, cardAnimStyle]}>
          {/* Electric borders */}
          <View style={styles.electricBorderTop} />
          <View style={styles.electricBorderLeft} />
          <View style={styles.electricBorderRight} />

          {/* SOLO App Header */}
          <View style={styles.appHeader}>
            <View style={styles.brandRow}>
              <Image
                source={getRankImage(claimResult?.newRank)}
                style={styles.brandIcon}
                contentFit="cover"
              />
              <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
            </View>

            <View style={styles.headerRight}>
              <View style={styles.verifiedBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.verifiedText}>VERIFIED</Text>
              </View>

              {/* Dismiss X button */}
              <TouchableOpacity
                onPress={onDismiss}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.closeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Claim content */}
          <View style={styles.claimContent}>
            {/* Page Header */}
            <View style={styles.pageHeader}>
              <View style={styles.pageHeading}>
                <Text style={styles.protocolText}>{protocolText || 'QUEST PROTOCOL COMPLETE'}</Text>
                <Text style={styles.rewardReadyText}>{rewardReadyText || 'REWARD READY'}</Text>
              </View>

              <View style={styles.completionSeal}>
                <Image
                  source={require('@/../public/shield-check.svg')}
                  style={styles.sealIcon}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Reward Stack */}
            <View style={styles.rewardStack}>
              {/* Main Reward Card */}
              <View style={styles.rewardCard}>
                {/* Left neon energy rail */}
                <View style={styles.energyRail} />

                {/* Reward Status Row */}
                <View style={styles.rewardStatus}>
                  <View style={styles.completionTag}>
                    <Image
                      source={require('@/../public/gift.svg')}
                      style={styles.giftIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.completionTagText}>{displayCompletionTag}</Text>
                  </View>

                  <Text style={styles.completionCountText}>{displayCompletionCount}</Text>
                </View>

                {/* Reward Beacon */}
                <View style={styles.rewardBeacon}>
                  {/* Outer breathing aura */}
                  <Animated.View style={[styles.outerAura, auraAnimStyle]} />

                  {/* Energy Ring with continuous rotation */}
                  <Animated.View style={[styles.energyRing, ringAnimStyle]} />

                  {/* Floating energy sparks */}
                  <Animated.View style={[styles.spark1, spark1AnimStyle]} />
                  <Animated.View style={[styles.spark2, spark2AnimStyle]} />
                  <Animated.View style={[styles.spark3, spark3AnimStyle]} />

                  {/* Burst glow when claimed */}
                  <Animated.View style={[styles.burstGlow, burstAnimStyle]} />

                  {/* Beacon Content */}
                  <Animated.View style={[styles.rewardAmount, xpNumberAnimStyle]}>
                    <Image
                      source={require('@/../public/zap-claim.svg')}
                      style={styles.zapIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.xpNumberText}>+{xpAmount}</Text>
                    <Text style={styles.xpEarnedLabel}>XP EARNED</Text>
                  </Animated.View>
                </View>

                {/* Completed Quest / Activity Info */}
                <View style={styles.completedQuestInfo}>
                  <Text style={styles.questSubtitle}>{displaySubtitle}</Text>
                  <Text style={styles.questTitle} numberOfLines={2}>
                    {cleanTitle}
                  </Text>
                  <Text style={styles.questDetails} numberOfLines={2}>
                    {displayDetails}
                  </Text>
                </View>
              </View>

              {/* Level Progression Card */}
              <View style={styles.levelProgressionCard}>
                <View style={styles.levelSummary}>
                  {/* Level Marker Badge */}
                  <View style={styles.levelMarker}>
                    <Text style={styles.levelMarkerLabel}>LV.</Text>
                    <Text style={styles.levelMarkerValue}>{progressData.level}</Text>
                  </View>

                  {/* Progress Summary */}
                  <View style={styles.progressSummary}>
                    {/* Top Labels */}
                    <View style={styles.progressLabels}>
                      <Text style={styles.afterClaimLabel}>AFTER CLAIM</Text>
                      <Text style={styles.xpFractionLabel}>
                        {progressData.afterClaimXP.toLocaleString()} /{' '}
                        {progressData.maxXP.toLocaleString()} XP
                      </Text>
                    </View>

                    {/* Dual Segment Progress Bar Track */}
                    <View style={styles.progressTrack}>
                      {/* Current XP fill segment */}
                      <View
                        style={[
                          styles.currentXPBar,
                          { width: `${progressData.currentPercent}%` },
                        ]}
                      />
                      {/* Earned XP animated growth segment */}
                      <Animated.View style={[styles.earnedXPBar, earnedBarStyle]} />
                    </View>

                    {/* Bottom Labels */}
                    <View style={styles.progressDetail}>
                      <Text style={styles.gainedXPText}>+{xpAmount} XP</Text>
                      <Text style={styles.toNextLevelText}>
                        {progressData.remainingToNext.toLocaleString()} XP TO LV.{' '}
                        {progressData.nextLevel}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Level Up Banner (If Level Up Occurred) */}
              {claimResult?.leveledUp && (
                <Animated.View entering={ZoomIn.delay(150)} style={styles.levelUpBanner}>
                  <Text style={styles.levelUpEmoji}>✨</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.levelUpTitle}>LEVEL UP!</Text>
                    <Text style={styles.levelUpDesc}>
                      Ascended to Level {claimResult.newLevel}
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Rank Ascension Banner (If Rank Changed) */}
              {claimResult?.rankChanged && (
                <Animated.View entering={ZoomIn.delay(300)} style={styles.rankBanner}>
                  <Image
                    source={getRankImage(claimResult.newRank)}
                    style={styles.rankBannerPortrait}
                    contentFit="cover"
                  />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.rankBannerSubtitle}>RANK ASCENSION</Text>
                    <Text style={styles.rankBannerTitle}>
                      Promoted to {claimResult.newRank}-Rank Hunter
                    </Text>
                  </View>
                  <Text style={styles.rankEmoji}>👑</Text>
                </Animated.View>
              )}
            </View>

            {/* Claim Action Button */}
            <View style={styles.claimAction}>
              <Animated.View style={buttonAnimStyle}>
                <TouchableOpacity
                  style={[
                    styles.claimButton,
                    isClaimed && styles.claimedButton,
                  ]}
                  onPress={handleClaim}
                  activeOpacity={0.85}
                >
                  <Image
                    source={require('@/../public/zap-dark.svg')}
                    style={styles.btnZapIcon}
                    contentFit="contain"
                  />
                  <Text style={styles.claimButtonText}>
                    {isClaimed ? 'CONTINUE' : `CLAIM ${xpAmount} XP`}
                  </Text>
                </TouchableOpacity>
              </Animated.View>

              <Text style={styles.actionSubtext}>
                {isClaimed
                  ? 'REWARD CREDITED TO SYSTEM PROFILE'
                  : 'REWARD WILL BE ADDED TO YOUR PROFILE'}
              </Text>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(3, 7, 16, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 410,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#1A3A6B',
    backgroundColor: '#050611',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(135deg, rgba(3, 6, 18, 1) 0%, rgba(6, 10, 24, 1) 55%, rgba(3, 5, 16, 1) 100%)',
          boxShadow: '0px 0px 32px 4px rgba(32, 200, 255, 0.27)',
        }
      : {
          boxShadow: '0px 0px 32px 4px rgba(32, 200, 255, 0.27)',
        }),
    overflow: 'hidden',
    position: 'relative',
  },

  /* Electric border accents */
  electricBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#20C8FF',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(90deg, rgba(32, 200, 255, 0) 0%, rgba(32, 200, 255, 0.85) 50%, rgba(32, 200, 255, 0) 100%)',
        }
      : {}),
    zIndex: 10,
  },
  electricBorderLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(32, 200, 255, 0.5)',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(180deg, rgba(32, 200, 255, 0) 0%, rgba(32, 200, 255, 0.53) 42%, rgba(108, 92, 255, 0.53) 72%, rgba(32, 200, 255, 0) 100%)',
        }
      : {}),
    zIndex: 10,
  },
  electricBorderRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(32, 200, 255, 0.5)',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(180deg, rgba(32, 200, 255, 0) 0%, rgba(32, 200, 255, 0.53) 42%, rgba(108, 92, 255, 0.53) 72%, rgba(32, 200, 255, 0) 100%)',
        }
      : {}),
    zIndex: 10,
  },

  /* App Header */
  appHeader: {
    height: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 49, 84, 0.35)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
  },
  brandTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.8,
    color: '#F5FAFF',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: 'rgba(59, 231, 161, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(59, 231, 161, 0.27)',
    borderRadius: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#3BE7A1',
  },
  verifiedText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 8,
    color: '#3BE7A1',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#A8B0CE',
    fontSize: 12,
    fontWeight: '700',
  },

  /* Claim Content Body */
  claimContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 14,
  },

  /* Page Header */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pageHeading: {
    gap: 2,
  },
  protocolText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  rewardReadyText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 24,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  completionSeal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(59, 231, 161, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 231, 161, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
  },
  sealIcon: {
    width: 20,
    height: 20,
  },

  /* Reward Stack */
  rewardStack: {
    gap: 12,
  },

  /* Reward Card */
  rewardCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#245394',
    padding: 16,
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#07152B',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(135deg, rgba(7, 21, 43, 1) 0%, rgba(6, 13, 30, 1) 58%, rgba(13, 12, 37, 1) 100%)',
          boxShadow:
            '0px 0px 24px 2px rgba(32, 200, 255, 0.27), inset 0px 1px 10px 0px rgba(32, 200, 255, 0.12)',
        }
      : {
          boxShadow: '0px 0px 24px 2px rgba(32, 200, 255, 0.27)',
        }),
    position: 'relative',
    overflow: 'hidden',
  },
  energyRail: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
  },
  rewardStatus: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  completionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(32, 200, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.4)',
    borderRadius: 4,
  },
  giftIcon: {
    width: 12,
    height: 12,
  },
  completionTagText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    letterSpacing: 0.5,
  },
  completionCountText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#3BE7A1',
    letterSpacing: 0.5,
  },

  /* Reward Beacon */
  rewardBeacon: {
    width: 146,
    height: 128,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  outerAura: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: 'rgba(32, 200, 255, 0.14)',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'radial-gradient(circle at 50% 50%, rgba(32, 200, 255, 0.22) 0%, rgba(108, 92, 255, 0.1) 55%, rgba(0, 0, 0, 0) 100%)',
        }
      : {}),
  },
  energyRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: 'rgba(32, 200, 255, 0.6)',
    backgroundColor: 'rgba(32, 200, 255, 0.04)',
    boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
  },
  spark1: {
    position: 'absolute',
    left: 13,
    top: 30,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
  },
  spark2: {
    position: 'absolute',
    right: 15,
    bottom: 24,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#B7A8FF',
    boxShadow: '0px 0px 22px 1px rgba(108, 92, 255, 0.4)',
  },
  spark3: {
    position: 'absolute',
    right: 28,
    top: 18,
    width: 2.5,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#9CE9FF',
    boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
  },
  burstGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 231, 161, 0.25)',
    boxShadow: '0px 0px 30px 4px rgba(59, 231, 161, 0.6)',
  },
  rewardAmount: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  zapIcon: {
    width: 20,
    height: 20,
    marginBottom: -2,
  },
  xpNumberText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 40,
    color: '#F5F7FF',
    textAlign: 'center',
    ...(Platform.OS === 'web'
      ? {
          textShadow: '0px 0px 20px rgba(32, 200, 255, 0.53)',
        }
      : {}),
  },
  xpEarnedLabel: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 9,
    color: '#20C8FF',
    letterSpacing: 1.2,
  },

  /* Completed Quest Info */
  completedQuestInfo: {
    alignItems: 'center',
    gap: 3,
    width: '100%',
  },
  questSubtitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questTitle: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 17,
    color: '#F5F7FF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questDetails: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    color: '#A8B0CE',
    textAlign: 'center',
  },

  /* Level Progression Card */
  levelProgressionCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    padding: 12,
  },
  levelSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  levelMarker: {
    width: 46,
    height: 46,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    boxShadow: '0px 0px 22px 1px rgba(108, 92, 255, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelMarkerLabel: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 8,
    color: '#B7A8FF',
    letterSpacing: 0.5,
  },
  levelMarkerValue: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 20,
    color: '#F5F7FF',
    marginTop: -2,
  },
  progressSummary: {
    flex: 1,
    gap: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  afterClaimLabel: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  xpFractionLabel: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 11,
    color: '#9CE9FF',
  },
  progressTrack: {
    height: 7,
    backgroundColor: '#191D35',
    borderRadius: 999,
    overflow: 'hidden',
    flexDirection: 'row',
    width: '100%',
  },
  currentXPBar: {
    height: '100%',
    backgroundColor: '#20C8FF',
  },
  earnedXPBar: {
    height: '100%',
    backgroundColor: '#3BE7A1',
    boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
  },
  progressDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gainedXPText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#3BE7A1',
  },
  toNextLevelText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 9,
    color: '#697292',
  },

  /* Level Up Banner */
  levelUpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  levelUpEmoji: {
    fontSize: 20,
  },
  levelUpTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 10,
    color: '#F59E0B',
    letterSpacing: 1,
  },
  levelUpDesc: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 13,
    color: '#F5F7FF',
  },

  /* Rank Banner */
  rankBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.35)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  rankBannerPortrait: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F43F5E',
  },
  rankBannerSubtitle: {
    fontFamily: 'Inter',
    fontSize: 9,
    fontWeight: '800',
    color: '#FB7185',
    letterSpacing: 1,
  },
  rankBannerTitle: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: '800',
    color: '#F43F5E',
  },
  rankEmoji: {
    fontSize: 16,
  },

  /* Claim Action */
  claimAction: {
    gap: 8,
    marginTop: 2,
  },
  claimButton: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#9CE9FF',
    backgroundColor: '#20C8FF',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(90deg, rgba(32, 200, 255, 1) 0%, rgba(55, 215, 255, 1) 48%, rgba(108, 92, 255, 1) 100%)',
          boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
        }
      : {
          boxShadow: '0px 0px 20px 1px rgba(32, 200, 255, 0.53)',
        }),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  claimedButton: {
    backgroundColor: '#3BE7A1',
    borderColor: '#3BE7A1',
    ...(Platform.OS === 'web'
      ? {
          backgroundImage:
            'linear-gradient(90deg, #3BE7A1 0%, #20C8FF 100%)',
          boxShadow: '0px 0px 20px 1px rgba(59, 231, 161, 0.53)',
        }
      : {
          boxShadow: '0px 0px 20px 1px rgba(59, 231, 161, 0.53)',
        }),
  },
  btnZapIcon: {
    width: 20,
    height: 20,
  },
  claimButtonText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 15,
    color: '#06111E',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionSubtext: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 9,
    color: '#697292',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
