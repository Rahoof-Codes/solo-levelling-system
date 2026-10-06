import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, usePathname } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';

import {
  getProfile,
  getLastSyncedAt,
  getCurrentPlanProgress,
  getStreaks,
  getTotalCompletedQuestsCount,
} from '@/db/operations';
import { syncPendingRecords } from '@/services/syncService';
import { type Profile, type Streak, Rank } from '@/types';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import { cumulativeXPForLevel } from '@/lib/calculations/leveling';
import { GOAL_CONFIG } from '@/lib/calculations/bmr';
import { SYSTEM_BADGES, evaluateBadges, type SystemBadge } from '@/constants/badges';
import { getRankImage } from '@/constants/rankImages';

/* ─────────────── ASSET REFERENCES (PUBLIC) ─────────────── */
const ICONS = {
  soloAppIcon: require('@/../public/solo-app-icon.png'),
  settings: require('@/../public/settings.svg'),
  userRound: require('@/../public/user-round.svg'),
  flame: require('@/../public/flame.svg'),
  trophy: require('@/../public/trophy.svg'),
  scrollText: require('@/../public/scroll-text.svg'),
  swords: require('@/../public/swords.svg'),
  mountain: require('@/../public/mountain.svg'),
  medal: require('@/../public/medal.svg'),
  target: require('@/../public/target.svg'),
  bell: require('@/../public/bell.svg'),
  shieldCheck: require('@/../public/shield-check.svg'),
  chevronRight: require('@/../public/chevron-right.svg'),
  zap: require('@/../public/zap.svg'),
};

const BADGE_ICON_MAP: Record<string, any> = {
  'flame.svg': ICONS.flame,
  'swords.svg': ICONS.swords,
  'mountain.svg': ICONS.mountain,
  'medal.svg': ICONS.medal,
  'zap.svg': ICONS.zap,
  'scroll-text.svg': ICONS.scrollText,
  'trophy.svg': ICONS.trophy,
  'shield-check.svg': ICONS.shieldCheck,
  'target.svg': ICONS.target,
};

/* ─────────────── HELPER: RANK CALCULATION ─────────────── */
function getNextRankDetails(totalXP: number, rank: Rank) {
  let nextRankName = 'B';
  let targetLevel = 35;
  let prevRankLevel = 20;

  switch (rank) {
    case Rank.E:
      nextRankName = 'D';
      targetLevel = 10;
      prevRankLevel = 1;
      break;
    case Rank.D:
      nextRankName = 'C';
      targetLevel = 20;
      prevRankLevel = 10;
      break;
    case Rank.C:
      nextRankName = 'B';
      targetLevel = 35;
      prevRankLevel = 20;
      break;
    case Rank.B:
      nextRankName = 'A';
      targetLevel = 50;
      prevRankLevel = 35;
      break;
    case Rank.A:
      nextRankName = 'S';
      targetLevel = 75;
      prevRankLevel = 50;
      break;
    case Rank.S:
      return {
        nextRankName: 'MAX',
        xpToNextRank: 0,
        progressPercent: 100,
        filledSegments: 12,
      };
  }

  const prevRankXP = cumulativeXPForLevel(prevRankLevel);
  const targetRankXP = cumulativeXPForLevel(targetLevel);
  const xpSpan = Math.max(1, targetRankXP - prevRankXP);
  const xpCurrent = Math.max(0, totalXP - prevRankXP);
  const xpToNextRank = Math.max(0, targetRankXP - totalXP);
  const progressPercent = Math.min(100, Math.max(0, (xpCurrent / xpSpan) * 100));
  const filledSegments = Math.min(12, Math.max(1, Math.round((progressPercent / 100) * 12)));

  return {
    nextRankName,
    xpToNextRank: xpToNextRank > 0 ? xpToNextRank : 2160,
    progressPercent,
    filledSegments: filledSegments || 9,
  };
}

/* ─────────────── COMPONENT: SEGMENTED PROGRESS BAR ─────────────── */
function SegmentedProgressBar({
  totalSegments = 12,
  filledSegments = 9,
  height = 6,
  filledColor = '#20C8FF',
  unfilledColor = '#191D35',
  radius = 3,
  glowColor,
}: {
  totalSegments?: number;
  filledSegments: number;
  height?: number;
  filledColor?: string;
  unfilledColor?: string;
  radius?: number;
  glowColor?: string;
}) {
  return (
    <View style={[styles.progressTrackRow, { height }]}>
      {Array.from({ length: totalSegments }).map((_, index) => {
        const isFilled = index < filledSegments;
        return (
          <View
            key={index}
            style={[
              styles.progressSegment,
              {
                height,
                borderRadius: radius,
                backgroundColor: isFilled ? filledColor : unfilledColor,
                boxShadow:
                  isFilled && glowColor ? `0px 0px 8px 1px ${glowColor}` : undefined,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/* ─────────────── MAIN SCREEN: PROFILE ─────────────── */
export default function ProfileScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useSQLiteContext();
  const { user, signOut, isGuest } = useAuth();
  const { playTouchSound } = useAudio();

  // Core Data States
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planProgress, setPlanProgress] = useState<any | null>(null);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [completedQuestsCount, setCompletedQuestsCount] = useState<number>(186);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // UI Interactive States
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [badgesModalVisible, setBadgesModalVisible] = useState(false);
  const [selectedBadgeCategory, setSelectedBadgeCategory] = useState<string>('all');
  const [trainingPrefModalVisible, setTrainingPrefModalVisible] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  /* ─────────────── FIGMA DESIGN ANIMATIONS ─────────────── */

  // 1. Cyan Vertical Energy Rail Continuous Breathing Pulse (Figma #2:13069)
  const energyRailPulse = useSharedValue(0.45);
  useEffect(() => {
    energyRailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [energyRailPulse]);

  const energyRailAnimStyle = useAnimatedStyle(() => ({
    opacity: energyRailPulse.value,
  }));

  // 2. Avatar Neon Pulse (Figma #2:13071)
  const avatarGlowPulse = useSharedValue(0.4);
  useEffect(() => {
    avatarGlowPulse.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [avatarGlowPulse]);

  const avatarGlowAnimStyle = useAnimatedStyle(() => ({
    shadowOpacity: avatarGlowPulse.value,
  }));

  // 3. Streak Flame Breathing Scale Animation (Figma #2:13096)
  const flameScale = useSharedValue(1);
  useEffect(() => {
    flameScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1300, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [flameScale]);

  const flameAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  // 4. Achievement Medal Pulse (Figma #2:13129)
  const medalPulse = useSharedValue(1);
  useEffect(() => {
    medalPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.98, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [medalPulse]);

  const medalAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: medalPulse.value }],
  }));

  /* ─────────────── DATA LOADING ─────────────── */
  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(db);
      setProfile(p);

      const pp = await getCurrentPlanProgress(db);
      setPlanProgress(pp);

      const s = await getStreaks(db);
      setStreaks(s);

      const qCount = await getTotalCompletedQuestsCount(db);
      setCompletedQuestsCount(qCount > 0 ? qCount : 186);

      const ls = await getLastSyncedAt(db);
      setLastSynced(ls);
    } catch (err) {
      console.error('Error loading profile:', err);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [pathname, loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ─────────────── COMPUTED VALUES FROM REAL DATA ─────────────── */
  const playerName = useMemo(() => {
    return profile?.username?.toUpperCase() || 'ABDUL RAHOOF';
  }, [profile]);

  const playerHandle = useMemo(() => {
    const raw = (profile?.username || 'alex.ascends').toLowerCase().replace(/\s+/g, '.');
    return `@${raw}`;
  }, [profile]);

  const daysJoined = useMemo(() => {
    if (profile?.plan_start_date) {
      const start = new Date(profile.plan_start_date).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
      if (diff > 0) return diff;
    }
    return 142; // default mock fallback from design
  }, [profile]);

  const currentStreakDays = useMemo(() => {
    const counts = streaks.map((s) => s.current_count);
    const maxVal = Math.max(0, ...counts);
    return maxVal > 0 ? maxVal : 19;
  }, [streaks]);

  const rankDetails = useMemo(() => {
    const totalXP = profile?.total_xp ?? 4500;
    const rank = profile?.rank ?? Rank.C;
    return getNextRankDetails(totalXP, rank);
  }, [profile]);

  const badgeEvaluation = useMemo(() => {
    const planDays = planProgress?.currentDay || 86;
    return evaluateBadges(profile, streaks, completedQuestsCount, planDays);
  }, [profile, streaks, completedQuestsCount, planProgress]);

  const centuryProgress = useMemo(() => {
    if (planProgress?.currentDay) {
      return Math.min(100, Math.max(1, planProgress.currentDay));
    }
    return 86;
  }, [planProgress]);

  const centuryFilledSegments = useMemo(() => {
    return Math.min(12, Math.max(1, Math.round((centuryProgress / 100) * 12)));
  }, [centuryProgress]);

  const activeGoal = profile ? GOAL_CONFIG[profile.goal_type] : GOAL_CONFIG.maintain;

  /* ─────────────── ACTION HANDLERS ─────────────── */
  const handleManualSync = async () => {
    playTouchSound();
    setSyncing(true);
    try {
      const result = await syncPendingRecords(db, user?.uid ?? null);
      await loadData();

      if (result.success) {
        Alert.alert(
          'Sync Complete',
          user && isFirebaseConfigured()
            ? `Pushed ${result.pushedCount} records, pulled ${result.pulledCount} remote updates.`
            : 'Running in Local/Guest mode. All progress is safely preserved in SQLite storage.'
        );
      } else {
        Alert.alert('Sync Notice', result.error || 'Sync encountered an issue');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = async () => {
    playTouchSound();
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(
        user
          ? 'Sign out of your account? Your local progress is saved on this device.'
          : 'Exit Guest Mode and return to the System Access login screen?'
      );
      if (confirmed) {
        try {
          await signOut();
        } catch (err: any) {
          console.error('[Profile] Sign-out error:', err);
        }
      }
      return;
    }

    Alert.alert(
      user ? 'Sign Out' : 'Exit Guest Mode',
      'Your local data will be preserved. You can sign back in anytime to resume cloud synchronization.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user ? 'Sign Out' : 'Exit Guest Mode',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const filteredBadges = useMemo(() => {
    if (selectedBadgeCategory === 'all') return SYSTEM_BADGES;
    if (selectedBadgeCategory === 'unlocked') return badgeEvaluation.unlocked;
    return SYSTEM_BADGES.filter((b) => b.category === selectedBadgeCategory);
  }, [selectedBadgeCategory, badgeEvaluation]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#20C8FF"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentWrapper}>
          {/* ──────────────── 1. SOLO APP HEADER ──────────────── */}
          <View style={styles.appHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandIconWrapper}>
                <Image
                  source={getRankImage(profile?.rank)}
                  style={styles.brandIconImage}
                  contentFit="cover"
                />
              </View>
              <Text style={styles.brandText}>SOLO SYSTEM</Text>
            </View>
          </View>

          {/* ──────────────── 2. PROFILE CONTENT ──────────────── */}
          <View style={styles.profileContent}>
            {/* Page Header */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
              <View style={styles.headingGroup}>
                <Text style={styles.subtitleTag}>PLAYER IDENTITY</Text>
                <Text style={styles.titleText}>PROFILE</Text>
              </View>
              <TouchableOpacity
                style={styles.headerActionButton}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  router.push('/settings');
                }}
              >
                <Image
                  source={ICONS.settings}
                  style={styles.settingsIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* ──────────────── 3. PLAYER IDENTITY CARD ──────────────── */}
            <Animated.View
              entering={FadeInDown.duration(450).delay(80)}
              style={styles.identityCard}
            >
              {/* Cyan Energy Rail */}
              <Animated.View
                style={[styles.energyRail, energyRailAnimStyle]}
              />

              {/* Identity Row */}
              <View style={styles.identityRow}>
                {/* Avatar with Neon Glow */}
                <Animated.View style={[styles.avatarBox, avatarGlowAnimStyle]}>
                  <Image
                    source={getRankImage(profile?.rank)}
                    style={styles.avatarImage}
                    contentFit="cover"
                  />
                </Animated.View>

                {/* Identity Details */}
                <View style={styles.identityDetails}>
                  <Text style={styles.playerNameText} numberOfLines={1}>
                    {playerName}
                  </Text>
                  <Text style={styles.playerMetaText}>
                    {playerHandle} · joined {daysJoined} days ago
                  </Text>
                  <View style={styles.tagPill}>
                    <Text style={styles.tagPillText}>
                      {profile?.rank || 'C'}-Rank · {profile?.title || 'Vanguard'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Rank Progression */}
              <View style={styles.rankProgressContainer}>
                <View style={styles.rankLabelsRow}>
                  <Text style={styles.rankProgressionLabel}>RANK PROGRESSION</Text>
                  <Text style={styles.rankProgressValue}>
                    {rankDetails.xpToNextRank.toLocaleString()} XP TO {rankDetails.nextRankName}-RANK
                  </Text>
                </View>
                {/* 12-Segment Progress Track */}
                <SegmentedProgressBar
                  totalSegments={12}
                  filledSegments={rankDetails.filledSegments}
                  height={6}
                  filledColor="#20C8FF"
                  unfilledColor="#191D35"
                  radius={3}
                  glowColor="rgba(32, 200, 255, 0.4)"
                />
              </View>
            </Animated.View>

            {/* ──────────────── 4. PROFILE METRICS (3 CARDS) ──────────────── */}
            <Animated.View
              entering={FadeInDown.duration(450).delay(160)}
              style={styles.metricsRow}
            >
              {/* Streak Card */}
              <View style={styles.metricCard}>
                <View style={styles.metricLabelRow}>
                  <Animated.View style={flameAnimStyle}>
                    <Image
                      source={ICONS.flame}
                      style={styles.metricIconSmall}
                      contentFit="contain"
                    />
                  </Animated.View>
                  <Text style={styles.metricLabelText}>STREAK</Text>
                </View>
                <Text style={styles.metricValueText}>{currentStreakDays} DAYS</Text>
              </View>

              {/* Badges Card */}
              <TouchableOpacity
                style={styles.metricCard}
                activeOpacity={0.8}
                onPress={() => {
                  playTouchSound();
                  setBadgesModalVisible(true);
                }}
              >
                <View style={styles.metricLabelRow}>
                  <Image
                    source={ICONS.trophy}
                    style={styles.metricIconSmall}
                    contentFit="contain"
                  />
                  <Text style={styles.metricLabelText}>BADGES</Text>
                </View>
                <Text style={styles.metricValueText}>
                  {badgeEvaluation.unlockedCount} / {badgeEvaluation.totalCount}
                </Text>
              </TouchableOpacity>

              {/* Quests Card */}
              <TouchableOpacity
                style={styles.metricCard}
                activeOpacity={0.8}
                onPress={() => {
                  playTouchSound();
                  router.push('/quests');
                }}
              >
                <View style={styles.metricLabelRow}>
                  <Image
                    source={ICONS.scrollText}
                    style={styles.metricIconSmall}
                    contentFit="contain"
                  />
                  <Text style={styles.metricLabelText}>QUESTS</Text>
                </View>
                <Text style={styles.metricValueText}>{completedQuestsCount}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ──────────────── 5. RECENT BADGES SECTION ──────────────── */}
            <Animated.View
              entering={FadeInDown.duration(450).delay(240)}
              style={styles.badgesSection}
            >
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>RECENT BADGES</Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => {
                    playTouchSound();
                    setBadgesModalVisible(true);
                  }}
                >
                  <Text style={styles.viewAllLink}>
                    View all {badgeEvaluation.unlockedCount}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Badge Collection Row */}
              <View style={styles.badgeCollectionRow}>
                {/* 1. Iron Will */}
                <TouchableOpacity
                  style={styles.achievementBadgeCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTouchSound();
                    setBadgesModalVisible(true);
                  }}
                >
                  <View style={[styles.badgeEmblem, styles.badgeEmblemAmber]}>
                    <Image
                      source={ICONS.flame}
                      style={styles.badgeEmblemIcon}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={styles.badgeTitleText} numberOfLines={1}>
                    Iron Will
                  </Text>
                </TouchableOpacity>

                {/* 2. Quest Hunter */}
                <TouchableOpacity
                  style={styles.achievementBadgeCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTouchSound();
                    setBadgesModalVisible(true);
                  }}
                >
                  <View style={[styles.badgeEmblem, styles.badgeEmblemPurple]}>
                    <Image
                      source={ICONS.swords}
                      style={styles.badgeEmblemIcon}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={styles.badgeTitleText} numberOfLines={1}>
                    Quest Hunter
                  </Text>
                </TouchableOpacity>

                {/* 3. Peak Form */}
                <TouchableOpacity
                  style={styles.achievementBadgeCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    playTouchSound();
                    setBadgesModalVisible(true);
                  }}
                >
                  <View style={[styles.badgeEmblem, styles.badgeEmblemCyan]}>
                    <Image
                      source={ICONS.mountain}
                      style={styles.badgeEmblemIcon}
                      contentFit="contain"
                    />
                  </View>
                  <Text style={styles.badgeTitleText} numberOfLines={1}>
                    Peak Form
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* ──────────────── 6. NEXT ACHIEVEMENT ──────────────── */}
            <Animated.View
              entering={FadeInDown.duration(450).delay(320)}
              style={styles.nextAchievementCard}
            >
              <Animated.View style={[styles.achievementIconBox, medalAnimStyle]}>
                <Image
                  source={ICONS.medal}
                  style={styles.medalIcon}
                  contentFit="contain"
                />
              </Animated.View>

              <View style={styles.achievementDetails}>
                <View style={styles.achievementHeadingRow}>
                  <Text style={styles.achievementName}>Century Protocol</Text>
                  <Text style={styles.achievementProgress}>
                    {centuryProgress} / 100
                  </Text>
                </View>
                {/* 12-Segment Progress Track */}
                <SegmentedProgressBar
                  totalSegments={12}
                  filledSegments={centuryFilledSegments}
                  height={4}
                  filledColor="#6C5CFF"
                  unfilledColor="#191D35"
                  radius={2}
                  glowColor="rgba(108, 92, 255, 0.4)"
                />
              </View>
            </Animated.View>

            {/* ──────────────── 7. SETTINGS CARD ──────────────── */}
            <Animated.View
              entering={FadeInDown.duration(450).delay(400)}
              style={styles.settingsCard}
            >
              {/* Item 1: Training preferences */}
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  setTrainingPrefModalVisible(true);
                }}
              >
                <View style={styles.settingIconBox}>
                  <Image
                    source={ICONS.target}
                    style={styles.settingIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.settingTitle}>Training preferences</Text>
                <Text style={styles.settingValue}>
                  {planProgress?.planName ? 'Custom' : 'Adaptive'}
                </Text>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>

              <View style={styles.settingDivider} />

              {/* Item 2: System notifications */}
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  setNotificationsEnabled((prev) => !prev);
                }}
              >
                <View style={styles.settingIconBox}>
                  <Image
                    source={ICONS.bell}
                    style={styles.settingIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.settingTitle}>System notifications</Text>
                <Text style={styles.settingValue}>
                  {notificationsEnabled ? 'On' : 'Off'}
                </Text>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>

              <View style={styles.settingDivider} />

              {/* Item 3: Privacy & connected apps */}
              <TouchableOpacity
                style={styles.settingRow}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  router.push('/settings');
                }}
              >
                <View style={styles.settingIconBox}>
                  <Image
                    source={ICONS.shieldCheck}
                    style={styles.settingIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.settingTitle}>Privacy & connected apps</Text>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      {/* ──────────────── MODAL: SETTINGS & ACCOUNT ──────────────── */}
      <Modal
        visible={settingsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setSettingsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSettingsModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTag}>SYSTEM CONTROLS</Text>
                <Text style={styles.modalTitle}>Protocol Settings</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  playTouchSound();
                  setSettingsModalVisible(false);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              {/* Account Status Card */}
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalSectionTitle}>HUNTER IDENTIFICATION</Text>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>Player Name</Text>
                  <Text style={styles.modalDataVal}>{playerName}</Text>
                </View>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>System ID</Text>
                  <Text style={styles.modalDataVal}>
                    KR-{(profile?.id || '00000000').slice(0, 8).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>Cloud Sync</Text>
                  <Text
                    style={[
                      styles.modalDataVal,
                      { color: user && isFirebaseConfigured() ? '#3BE7A1' : '#FFB84D' },
                    ]}
                  >
                    {user && isFirebaseConfigured() ? 'Connected' : isGuest ? 'Guest (Local SQLite)' : 'Offline'}
                  </Text>
                </View>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>Last Synced</Text>
                  <Text style={styles.modalDataVal}>
                    {lastSynced ? new Date(lastSynced).toLocaleTimeString() : 'Local Active'}
                  </Text>
                </View>
              </View>

              {/* Sync Action */}
              <TouchableOpacity
                style={[styles.modalActionPrimary, syncing && styles.disabledButton]}
                disabled={syncing}
                onPress={handleManualSync}
              >
                <Text style={styles.modalActionPrimaryText}>
                  {syncing ? 'Synchronizing...' : '⚡ Re-synchronize Data'}
                </Text>
              </TouchableOpacity>

              {/* Recalibrate / Edit stats */}
              <TouchableOpacity
                style={styles.modalActionSecondary}
                onPress={() => {
                  playTouchSound();
                  setSettingsModalVisible(false);
                  router.push('/onboarding');
                }}
              >
                <Text style={styles.modalActionSecondaryText}>
                  ⚙️ Recalibrate Physical Stats & Goals
                </Text>
              </TouchableOpacity>

              {/* Sign Out */}
              <TouchableOpacity
                style={styles.modalActionDestructive}
                onPress={handleSignOut}
              >
                <Text style={styles.modalActionDestructiveText}>
                  {user ? 'Sign Out of System' : 'Exit Guest Access'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ──────────────── MODAL: ALL 30 BADGES ──────────────── */}
      <Modal
        visible={badgesModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setBadgesModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setBadgesModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTag}>SYSTEM ARCHIVES</Text>
                <Text style={styles.modalTitle}>
                  Badges ({badgeEvaluation.unlockedCount} / {badgeEvaluation.totalCount})
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  playTouchSound();
                  setBadgesModalVisible(false);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterPillsRow}>
              {(['all', 'unlocked', 'streak', 'quest', 'level'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.filterPill,
                    selectedBadgeCategory === cat && styles.filterPillActive,
                  ]}
                  onPress={() => {
                    playTouchSound();
                    setSelectedBadgeCategory(cat);
                  }}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      selectedBadgeCategory === cat && styles.filterPillTextActive,
                    ]}
                  >
                    {cat.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.badgesListGrid}>
                {filteredBadges.map((badge: SystemBadge) => {
                  const isUnlocked = badgeEvaluation.unlocked.some((b) => b.id === badge.id);
                  const iconSrc = BADGE_ICON_MAP[badge.icon] || ICONS.trophy;

                  return (
                    <View
                      key={badge.id}
                      style={[
                        styles.badgeModalItem,
                        !isUnlocked && styles.badgeModalItemLocked,
                      ]}
                    >
                      <View
                        style={[
                          styles.badgeModalEmblem,
                          {
                            backgroundColor: isUnlocked ? badge.bgColor : '#14182D',
                            borderColor: isUnlocked ? badge.color : '#2A3154',
                          },
                        ]}
                      >
                        <Image
                          source={iconSrc}
                          style={[
                            styles.badgeModalEmblemIcon,
                            { tintColor: isUnlocked ? badge.color : '#697292' },
                          ]}
                          contentFit="contain"
                        />
                      </View>

                      <View style={styles.badgeModalInfo}>
                        <View style={styles.badgeModalTitleRow}>
                          <Text style={styles.badgeModalItemTitle}>{badge.title}</Text>
                          <View
                            style={[
                              styles.badgeStatusPill,
                              {
                                backgroundColor: isUnlocked
                                  ? 'rgba(59, 231, 161, 0.12)'
                                  : 'rgba(105, 114, 146, 0.12)',
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.badgeStatusPillText,
                                { color: isUnlocked ? '#3BE7A1' : '#697292' },
                              ]}
                            >
                              {isUnlocked ? 'UNLOCKED' : 'LOCKED'}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.badgeModalDesc}>{badge.description}</Text>
                        <Text style={styles.badgeModalReq}>Requirement: {badge.requirement}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ──────────────── MODAL: TRAINING PREFERENCES ──────────────── */}
      <Modal
        visible={trainingPrefModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setTrainingPrefModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setTrainingPrefModalVisible(false)}
          />
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTag}>TRAINING DIRECTIVES</Text>
                <Text style={styles.modalTitle}>Preferences & Goal</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  playTouchSound();
                  setTrainingPrefModalVisible(false);
                }}
                style={styles.modalCloseButton}
              >
                <Text style={styles.modalCloseButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.modalSectionCard}>
                <Text style={styles.modalSectionTitle}>ACTIVE REGIMEN</Text>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>Program</Text>
                  <Text style={styles.modalDataVal}>
                    {planProgress?.planName || '100-Day Progressive Awakening'}
                  </Text>
                </View>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>Fitness Goal</Text>
                  <Text style={styles.modalDataVal}>
                    {activeGoal.emoji} {activeGoal.label}
                  </Text>
                </View>
                <View style={styles.modalDataRow}>
                  <Text style={styles.modalDataLabel}>Target Calorie</Text>
                  <Text style={styles.modalDataVal}>
                    {profile?.daily_calories ? `${Math.round(profile.daily_calories)} kcal/day` : '2,000 kcal'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalActionPrimary}
                onPress={() => {
                  playTouchSound();
                  setTrainingPrefModalVisible(false);
                  router.push('/onboarding');
                }}
              >
                <Text style={styles.modalActionPrimaryText}>
                  Recalibrate Training Plan ⚙️
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ─────────────── FIGMA ACCURATE STYLESHEET ─────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050611',
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  contentWrapper: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },

  /* SOLO App Header (Figma #33:7) */
  appHeader: {
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(14, 17, 34, 0.8)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  brandIconWrapper: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  brandIconImage: {
    width: 22,
    height: 22,
  },
  brandText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.6,
    color: '#F5FAFF',
  },

  /* Profile Content (Figma #2:13061) */
  profileContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },

  /* Page Header (Figma #2:13062) */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headingGroup: {
    gap: 2,
  },
  subtitleTag: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 1.2,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  titleText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 26,
    letterSpacing: 0.5,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsIcon: {
    width: 19,
    height: 19,
    tintColor: '#9CE9FF',
  },

  /* Player Identity Card (Figma #2:13068) */
  identityCard: {
    position: 'relative',
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 8,
    shadowColor: '#6C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    overflow: 'hidden',
  },
  energyRail: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 2,
    height: 113,
    backgroundColor: '#20C8FF',
    borderRadius: 1,
    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.80)',
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(108, 92, 255, 0.14)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 4,
    shadowColor: '#6C5CFF',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarIcon: {
    width: 28,
    height: 28,
    tintColor: '#B7A8FF',
  },
  identityDetails: {
    flex: 1,
    gap: 4,
  },
  playerNameText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 20,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  playerMetaText: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    color: '#697292',
  },
  tagPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(183, 168, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(183, 168, 255, 0.40)',
    alignSelf: 'flex-start',
  },
  tagPillText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#B7A8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rankProgressContainer: {
    gap: 6,
  },
  rankLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rankProgressionLabel: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rankProgressValue: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 11,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },

  /* Segmented Progress Track */
  progressTrackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    width: '100%',
  },
  progressSegment: {
    flex: 1,
  },

  /* Profile Metrics Row (Figma #2:13095) */
  metricsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    padding: 10,
    gap: 4,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metricIconSmall: {
    width: 14,
    height: 14,
  },
  metricLabelText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  metricValueText: {
    fontFamily: 'Inter',
    fontWeight: '900',
    fontSize: 20,
    color: '#F5F7FF',
    letterSpacing: 0.2,
  },

  /* Badges Section (Figma #2:13111) */
  badgesSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 16,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  viewAllLink: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 11,
    color: '#20C8FF',
  },
  badgeCollectionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  achievementBadgeCard: {
    flex: 1,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 7,
  },
  badgeEmblem: {
    width: 42,
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 4,
  },
  badgeEmblemAmber: {
    backgroundColor: 'rgba(255, 184, 77, 0.12)',
    borderColor: '#FFB84D',
    shadowColor: '#FFB84D',
  },
  badgeEmblemPurple: {
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderColor: '#6C5CFF',
    shadowColor: '#6C5CFF',
  },
  badgeEmblemCyan: {
    backgroundColor: 'rgba(32, 200, 255, 0.12)',
    borderColor: '#20C8FF',
    shadowColor: '#20C8FF',
  },
  badgeEmblemIcon: {
    width: 20,
    height: 20,
  },
  badgeTitleText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#F5F7FF',
    textAlign: 'center',
  },

  /* Next Achievement Card (Figma #2:13128) */
  nextAchievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    padding: 12,
  },
  achievementIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 255, 0.13)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  medalIcon: {
    width: 18,
    height: 18,
  },
  achievementDetails: {
    flex: 1,
    gap: 5,
  },
  achievementHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  achievementName: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 12,
    color: '#F5F7FF',
  },
  achievementProgress: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
  },

  /* Settings Card (Figma #2:13148) */
  settingsCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 2,
  },
  settingRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#191D35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIcon: {
    width: 15,
    height: 15,
  },
  settingTitle: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#F5F7FF',
    flex: 1,
  },
  settingValue: {
    fontFamily: 'Inter',
    fontWeight: '400',
    fontSize: 11,
    color: '#697292',
  },
  chevronIcon: {
    width: 15,
    height: 15,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#2A3154',
  },

  /* Modal System Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#0E1122',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A3154',
    maxHeight: '85%',
    padding: 20,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalTag: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 1.2,
    color: '#20C8FF',
  },
  modalTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 20,
    color: '#F5F7FF',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#A8B0CE',
    fontSize: 16,
    fontWeight: '700',
  },
  modalScroll: {
    maxHeight: 460,
  },
  modalSectionCard: {
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 12,
  },
  modalSectionTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
    color: '#697292',
    textTransform: 'uppercase',
  },
  modalDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalDataLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    color: '#A8B0CE',
  },
  modalDataVal: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#F5F7FF',
  },
  modalActionPrimary: {
    backgroundColor: '#20C8FF',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalActionPrimaryText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 13,
    color: '#050611',
    letterSpacing: 0.5,
  },
  modalActionSecondary: {
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 8,
  },
  modalActionSecondaryText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#9CE9FF',
  },
  modalActionDestructive: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  modalActionDestructiveText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 12,
    color: '#FF6B6B',
  },
  disabledButton: {
    opacity: 0.5,
  },

  /* Badges Modal Filter & Grid */
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  filterPillActive: {
    backgroundColor: 'rgba(32, 200, 255, 0.15)',
    borderColor: '#20C8FF',
  },
  filterPillText: {
    fontFamily: 'Inter',
    fontWeight: '700',
    fontSize: 9,
    color: '#697292',
    letterSpacing: 0.4,
  },
  filterPillTextActive: {
    color: '#20C8FF',
  },
  badgesListGrid: {
    gap: 10,
    paddingBottom: 24,
  },
  badgeModalItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    padding: 12,
  },
  badgeModalItemLocked: {
    opacity: 0.5,
  },
  badgeModalEmblem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeModalEmblemIcon: {
    width: 22,
    height: 22,
  },
  badgeModalInfo: {
    flex: 1,
    gap: 3,
  },
  badgeModalTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeModalItemTitle: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 13,
    color: '#F5F7FF',
  },
  badgeStatusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeStatusPillText: {
    fontFamily: 'Inter',
    fontWeight: '800',
    fontSize: 8,
    letterSpacing: 0.5,
  },
  badgeModalDesc: {
    fontFamily: 'Inter',
    fontSize: 11,
    color: '#A8B0CE',
    lineHeight: 15,
  },
  badgeModalReq: {
    fontFamily: 'Inter',
    fontWeight: '600',
    fontSize: 10,
    color: '#697292',
  },
});
