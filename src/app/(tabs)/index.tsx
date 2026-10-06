import { ParticleField } from '@/components/ui/particles';
import { Fonts } from '@/constants/theme';
import { getRankImage } from '@/constants/rankImages';
import { useAudio } from '@/contexts/AudioContext';
import {
  checkAndUpdateDailyLoginStreak,
  getActivePlan,
  getCompletedWorkoutIds,
  getDailyCalorieSummary,
  getPastWeekActivity,
  getProfile,
  getQuestsForDate,
  getStreaks,
  getTodayActivities,
  getTodaySteps,
  getTodayWorkout,
  type DayActivityStatus,
} from '@/db/operations';
import { getXPProgress } from '@/lib/calculations/leveling';
import {
  type Activity,
  type DailyCalorieSummary,
  type DailySteps,
  type Profile,
  type Quest,
  type Streak,
  type Workout,
} from '@/types';
import { Image } from 'expo-image';
import { useFocusEffect, usePathname, useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * 12-Segment Progress Track
 * Matches Figma nodes #2:12547 (XP) & #2:12589 (Objective)
 */
function SegmentedTrack({
  totalSegments = 12,
  activeCount = 0,
  activeColor = '#20C8FF',
  inactiveColor = '#191D35',
  glowColor,
}: {
  totalSegments?: number;
  activeCount?: number;
  activeColor?: string;
  inactiveColor?: string;
  glowColor?: string;
}) {
  const segments = useMemo(() => Array.from({ length: totalSegments }), [totalSegments]);

  return (
    <View style={styles.trackContainer}>
      {segments.map((_, i) => {
        const isActive = i < activeCount;
        const isLeading = i === activeCount - 1;
        return (
          <View
            key={i}
            style={[
              styles.trackSegment,
              {
                backgroundColor: isActive ? activeColor : inactiveColor,
              },
              isActive && isLeading && glowColor
                ? {
                  boxShadow: `0px 0px 8px 1px ${glowColor}`,
                  shadowColor: glowColor,
                  shadowOpacity: 0.9,
                  shadowRadius: 8,
                  elevation: 6,
                }
                : null,
            ]}
          />
        );
      })}
    </View>
  );
}

export default function SystemDashboardScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useSQLiteContext();
  const { bgmEnabled, toggleBGM, playTouchSound } = useAudio();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieSummary, setCalorieSummary] = useState<DailyCalorieSummary>({
    consumed: 0,
    burned: 0,
    target: 2000,
    net: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fat_consumed: 0,
  });
  const [quests, setQuests] = useState<Quest[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [weekHistory, setWeekHistory] = useState<DayActivityStatus[]>([]);
  const [todaySteps, setTodaySteps] = useState<DailySteps | null>(null);
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);
  const [completedWorkoutIds, setCompletedWorkoutIds] = useState<Set<string>>(new Set());
  const [refreshing, setRefreshing] = useState(false);
  const [noticeModalVisible, setNoticeModalVisible] = useState(false);

  /* ─────────────── FIGMA DESIGN ANIMATIONS ─────────────── */

  // 1. Vertical Energy Rail Continuous Glowing Pulse (Figma #2:12531 & #2:12577)
  const energyRailPulse = useSharedValue(0.5);
  useEffect(() => {
    energyRailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [energyRailPulse]);

  const energyRailStyle = useAnimatedStyle(() => ({
    opacity: energyRailPulse.value,
  }));

  // 2. Sung Jin-Woo Shadow Silhouette Breathing Aura (Figma #2:12532)
  const portraitBreath = useSharedValue(0.38);
  useEffect(() => {
    portraitBreath.value = withRepeat(
      withSequence(
        withTiming(0.48, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.34, { duration: 2500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [portraitBreath]);

  const portraitStyle = useAnimatedStyle(() => ({
    opacity: portraitBreath.value,
  }));

  // 3. Live Beacon Expanding Pulse (Figma #2:12638)
  const beaconScale = useSharedValue(1);
  const beaconOpacity = useSharedValue(0.8);
  useEffect(() => {
    beaconScale.value = withRepeat(
      withSequence(
        withTiming(2.0, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 0 })
      ),
      -1,
      false
    );
    beaconOpacity.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }),
        withTiming(0.8, { duration: 0 })
      ),
      -1,
      false
    );
  }, [beaconScale, beaconOpacity]);

  const beaconRippleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: beaconScale.value }],
    opacity: beaconOpacity.value,
  }));

  // 4. Level Badge Neon Pulse (Figma #2:12535)
  const badgeGlow = useSharedValue(0.5);
  useEffect(() => {
    badgeGlow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [badgeGlow]);

  const badgeGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: badgeGlow.value,
  }));

  // 5. Online Status Dot Pulsing Glow (Figma #2:12542)
  const statusDotPulse = useSharedValue(0.85);
  useEffect(() => {
    statusDotPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.65, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [statusDotPulse]);

  const statusDotAnimStyle = useAnimatedStyle(() => ({
    opacity: statusDotPulse.value,
    transform: [{ scale: statusDotPulse.value }],
  }));

  // 6. Objective Card Interactive Scale on hover/press
  const objectiveScale = useSharedValue(1);
  const onObjectivePressIn = () => {
    objectiveScale.value = withSpring(0.98, { damping: 15 });
  };
  const onObjectivePressOut = () => {
    objectiveScale.value = withSpring(1, { damping: 15 });
  };
  const objectiveCardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: objectiveScale.value }],
  }));

  /* ─────────────── REAL DATA LOADING ─────────────── */

  const loadData = useCallback(async () => {
    try {
      await checkAndUpdateDailyLoginStreak(db);
      const p = await getProfile(db);
      setProfile(p);

      const [cal, q, s, wh, steps, acts, plan, compIds] = await Promise.all([
        getDailyCalorieSummary(db),
        getQuestsForDate(db),
        getStreaks(db),
        getPastWeekActivity(db),
        getTodaySteps(db),
        getTodayActivities(db),
        getActivePlan(db),
        getCompletedWorkoutIds(db),
      ]);

      setCalorieSummary(cal);
      setQuests(q);
      setStreaks(s);
      setWeekHistory(wh);
      setTodaySteps(steps);
      setTodayActivities(acts);
      setCompletedWorkoutIds(compIds);

      if (p?.plan_start_date) {
        const tw = await getTodayWorkout(db, p.plan_start_date);
        setTodayWorkout(tw);
      } else {
        setTodayWorkout(null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
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

  /* ─────────────── REAL PROGRESS & VALUES ─────────────── */

  const xpProgress = useMemo(() => {
    return profile ? getXPProgress(profile.total_xp) : null;
  }, [profile]);

  // Real Level, Username, and Rank
  const currentLevel = profile?.level ?? (xpProgress?.currentLevel ?? 1);
  const username = profile?.username ? profile.username.toUpperCase() : 'HUNTER';
  const currentRank = profile?.rank || xpProgress?.currentRank || 'E';
  const currentTitle = profile?.title || 'Novice';
  const rankTag = `${currentRank}-Rank · ${currentTitle}`.toUpperCase();

  // Real XP within level
  const currentXp = xpProgress?.xpInCurrentLevel ?? (profile?.total_xp ?? 0);
  const targetXp = xpProgress?.xpNeededForNextLevel ?? 100;
  const xpPercent = targetXp > 0 ? Math.min(1, Math.max(0, currentXp / targetXp)) : 0;
  const xpActiveSegments = Math.min(12, Math.max(0, Math.round(xpPercent * 12)));

  // Real Daily Metrics
  const burnedCalories = Math.round(
    calorieSummary.burned || todaySteps?.calories_burned || 0
  );
  const stepsCount = todaySteps?.steps ?? 0;
  const stepsDisplay = stepsCount >= 1000
    ? `${(stepsCount / 1000).toFixed(1)}K`
    : `${stepsCount}`;

  const totalActiveMinutes = useMemo(() => {
    const actMin = todayActivities.reduce((acc, a) => acc + (a.duration_min || 0), 0);
    return Math.round(actMin);
  }, [todayActivities]);
  const activeDisplay = totalActiveMinutes >= 60
    ? `${Math.floor(totalActiveMinutes / 60)}h ${totalActiveMinutes % 60}m`
    : `${totalActiveMinutes}m`;

  // Real Next Objective
  const nextObjective = useMemo(() => {
    // 1. Check if there is an uncompleted workout today from active plan
    if (todayWorkout) {
      const isDone = completedWorkoutIds.has(todayWorkout.id);
      if (!isDone) {
        let exerciseCount = 0;
        let totalSets = 0;
        try {
          const exList = JSON.parse(todayWorkout.exercises_json || '[]');
          exerciseCount = Array.isArray(exList) ? exList.length : 0;
          totalSets = Array.isArray(exList)
            ? exList.reduce((acc: number, e: any) => acc + (e.sets || 3), 0)
            : 12;
        } catch {
          exerciseCount = 4;
          totalSets = 12;
        }

        return {
          tag: 'NEXT OBJECTIVE',
          tagColor: '#20C8FF',
          reward: `+${todayWorkout.xp_value} XP`,
          title: todayWorkout.name.toUpperCase(),
          subtitle: `${exerciseCount} exercises · ${totalSets} sets`,
          activeSegments: 0,
          totalSegments: 12,
          route: '/(tabs)/activity' as const,
        };
      }
    }

    // 2. Check if there are daily quests pending
    const pendingQuest = quests.find((q) => q.is_completed === 0);
    if (pendingQuest) {
      return {
        tag: 'DAILY QUEST',
        tagColor: '#20C8FF',
        reward: `+${pendingQuest.xp_reward} XP`,
        title: pendingQuest.title.toUpperCase(),
        subtitle: pendingQuest.description || 'Complete daily requirements',
        activeSegments: 0,
        totalSegments: 12,
        route: '/(tabs)/quests' as const,
      };
    }

    // 3. If today's workout was completed today
    if (todayWorkout && completedWorkoutIds.has(todayWorkout.id)) {
      return {
        tag: 'COMPLETED',
        tagColor: '#3BE7A1',
        reward: `+${todayWorkout.xp_value} XP`,
        title: todayWorkout.name.toUpperCase(),
        subtitle: 'All daily objectives cleared · Rest & recover',
        activeSegments: 12,
        totalSegments: 12,
        route: '/(tabs)/activity' as const,
      };
    }

    // 4. Default quest
    return {
      tag: 'DAILY QUEST',
      tagColor: '#20C8FF',
      reward: '+100 XP',
      title: 'DAILY RECONNAISSANCE',
      subtitle: `${stepsCount.toLocaleString()} / 10,000 steps logged`,
      activeSegments: Math.min(12, Math.max(0, Math.round((stepsCount / 10000) * 12))),
      totalSegments: 12,
      route: '/(tabs)/activity' as const,
    };
  }, [todayWorkout, completedWorkoutIds, quests, stepsCount]);

  // Real Streak count
  const primaryStreak = useMemo(() => {
    const qStreak = streaks.find((s) => s.type === 'daily_quest')?.current_count ?? 0;
    const wStreak = streaks.find((s) => s.type === 'workout')?.current_count ?? 0;
    const lStreak = streaks.find((s) => s.type === 'login')?.current_count ?? 0;
    return Math.max(qStreak, wStreak, lStreak);
  }, [streaks]);

  // Real Weekly Momentum from past 7 days activity
  const weekDays = useMemo(() => {
    if (weekHistory && weekHistory.length === 7) {
      return weekHistory.map((day) => ({
        label: day.dayLabel ? day.dayLabel[0] : '—',
        completed: day.isCompleted,
        isToday: day.isToday,
      }));
    }

    const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    return dayLabels.map((label) => ({
      label,
      completed: false,
      isToday: false,
    }));
  }, [weekHistory]);

  // Real System Logs
  const systemLogs = useMemo(() => {
    const list: Array<{ icon: any; message: string; time: string }> = [];

    if (primaryStreak > 0) {
      list.push({
        icon: require('@/../public/shield-check.svg'),
        message: `Daily streak protection active (${primaryStreak}d)`,
        time: 'Today',
      });
    } else {
      list.push({
        icon: require('@/../public/shield-check.svg'),
        message: 'System online · Hunter registration verified',
        time: 'Now',
      });
    }

    if (stepsCount > 0) {
      list.push({
        icon: require('@/../public/heart-pulse.svg'),
        message: `Pedometer telemetry synced · ${stepsCount.toLocaleString()} steps`,
        time: 'Today',
      });
    } else if (totalActiveMinutes > 0) {
      list.push({
        icon: require('@/../public/heart-pulse.svg'),
        message: `Physical exertion logged · ${totalActiveMinutes}m active`,
        time: 'Today',
      });
    } else {
      list.push({
        icon: require('@/../public/heart-pulse.svg'),
        message: 'Recovery readiness calibrated to 100%',
        time: '1h',
      });
    }

    return list;
  }, [primaryStreak, stepsCount, totalActiveMinutes]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Background particle aura */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <ParticleField count={8} color="#20C8FF" />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#20C8FF"
            colors={['#20C8FF']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.dashboardContainer}>
          {/* ────────── PAGE HEADER (Figma #2:12524) ────────── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
            <View style={styles.soloBrand}>
              <View style={styles.appIconContainer}>
                <Image
                  source={getRankImage(profile?.rank)}
                  style={styles.appIconImage}
                  contentFit="cover"
                />
              </View>
              <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
            </View>

            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={() => {
                playTouchSound();
                setNoticeModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              <Image
                source={require('@/../public/bell.svg')}
                style={styles.bellIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
          </Animated.View>

          {/* ────────── PLAYER LEVEL CARD (Figma #2:12530) ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.playerLevelCard}>
            {/* Energy Rail — Left Cyan Accent Line (Figma #2:12531) */}
            <Animated.View style={[styles.energyRail, energyRailStyle]} />

            {/* Energy Portrait — Sung Jin-Woo Shadow Aura (Figma #2:12532) */}
            <Animated.View style={[styles.energyPortraitWrapper, portraitStyle]}>
              <Image
                source={getRankImage(profile?.rank)}
                style={styles.energyPortraitImage}
                contentFit="cover"
              />
            </Animated.View>

            {/* Player Summary (Figma #2:12533) */}
            <View style={styles.playerSummary}>
              <View style={styles.levelBadgeRow}>
                {/* Level Marker (Figma #2:12535) */}
                <Animated.View style={[styles.levelMarker, badgeGlowStyle]}>
                  <Text style={styles.levelMarkerSub}>LV.</Text>
                  <Text style={styles.levelMarkerNum}>{currentLevel}</Text>
                </Animated.View>

                {/* Player Details (Figma #2:12538) */}
                <View style={styles.playerDetails}>
                  <Text style={styles.playerName} numberOfLines={1}>
                    {username}
                  </Text>
                  <View style={styles.rankTag}>
                    <Text style={styles.rankTagText}>{rankTag}</Text>
                  </View>
                </View>
              </View>

              {/* Online Status Dot (Figma #2:12542) */}
              <View style={styles.statusBeaconContainer}>
                <Animated.View style={[styles.statusBeaconDot, statusDotAnimStyle]} />
              </View>
            </View>

            {/* Experience Section (Figma #2:12543) */}
            <View style={styles.experienceSection}>
              <View style={styles.experienceLabels}>
                <Text style={styles.experienceTitle}>Experience</Text>
                <Text style={styles.experienceValue}>
                  {currentXp.toLocaleString()} / {targetXp.toLocaleString()} XP
                </Text>
              </View>

              {/* 12-Segment Progress Track (Figma #2:12547) */}
              <SegmentedTrack
                totalSegments={12}
                activeCount={xpActiveSegments}
                activeColor="#20C8FF"
                inactiveColor="#191D35"
                glowColor="#20C8FF"
              />
            </View>
          </Animated.View>

          {/* ────────── DAILY STATS ROW (Figma #2:12560) ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(160)} style={styles.dailyStatsRow}>
            {/* Metric 1: kcal (Figma #2:12561) */}
            <TouchableOpacity
              style={styles.dailyMetricCard}
              activeOpacity={0.75}
              onPress={() => {
                playTouchSound();
                router.push('/(tabs)/log');
              }}
            >
              <View style={styles.metricIconRow}>
                <Image
                  source={require('@/../public/flame.svg')}
                  style={styles.metricIcon}
                  contentFit="contain"
                />
                <Text style={styles.metricLabel}>kcal</Text>
              </View>
              <Text style={styles.metricValue}>
                {burnedCalories.toLocaleString()}
              </Text>
            </TouchableOpacity>

            {/* Metric 2: steps (Figma #2:12566) */}
            <TouchableOpacity
              style={styles.dailyMetricCard}
              activeOpacity={0.75}
              onPress={() => {
                playTouchSound();
                router.push('/(tabs)/activity');
              }}
            >
              <View style={styles.metricIconRow}>
                <Image
                  source={require('@/../public/footprints.svg')}
                  style={styles.metricIcon}
                  contentFit="contain"
                />
                <Text style={styles.metricLabel}>steps</Text>
              </View>
              <Text style={styles.metricValue}>{stepsDisplay}</Text>
            </TouchableOpacity>

            {/* Metric 3: active (Figma #2:12571) */}
            <TouchableOpacity
              style={styles.dailyMetricCard}
              activeOpacity={0.75}
              onPress={() => {
                playTouchSound();
                router.push('/(tabs)/activity');
              }}
            >
              <View style={styles.metricIconRow}>
                <Image
                  source={require('@/../public/clock-3.svg')}
                  style={styles.metricIcon}
                  contentFit="contain"
                />
                <Text style={styles.metricLabel}>active</Text>
              </View>
              <Text style={styles.metricValue}>{activeDisplay}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* ────────── NEXT OBJECTIVE (Figma #2:12576) ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(240)}>
            <Animated.View style={objectiveCardAnimStyle}>
              <TouchableOpacity
                style={styles.objectiveCard}
                activeOpacity={0.9}
                onPressIn={onObjectivePressIn}
                onPressOut={onObjectivePressOut}
                onPress={() => {
                  playTouchSound();
                  router.push(nextObjective.route);
                }}
              >
                {/* Energy Rail (Figma #2:12577) */}
                <Animated.View style={[styles.energyRailObjective, energyRailStyle]} />

                {/* Objective Heading (Figma #2:12578) */}
                <View style={styles.objectiveHeading}>
                  <View style={styles.objectiveTag}>
                    <Text style={styles.objectiveTagText}>{nextObjective.tag}</Text>
                  </View>
                  <Text style={styles.objectiveXpReward}>{nextObjective.reward}</Text>
                </View>

                {/* Objective Details (Figma #2:12582) */}
                <View style={styles.objectiveDetails}>
                  <View style={styles.objectiveIconBox}>
                    <Image
                      source={require('@/../public/dumbbell.svg')}
                      style={styles.objectiveIcon}
                      contentFit="contain"
                    />
                  </View>

                  <View style={styles.objectiveCopy}>
                    <Text style={styles.objectiveTitle} numberOfLines={1}>
                      {nextObjective.title}
                    </Text>
                    <Text style={styles.objectiveSubtitle} numberOfLines={1}>
                      {nextObjective.subtitle}
                    </Text>
                  </View>

                  <Image
                    source={require('@/../public/chevron-right.svg')}
                    style={styles.chevronIcon}
                    contentFit="contain"
                  />
                </View>

                {/* Objective Progress Track (Figma #2:12589) */}
                <SegmentedTrack
                  totalSegments={nextObjective.totalSegments}
                  activeCount={nextObjective.activeSegments}
                  activeColor="#6C5CFF"
                  inactiveColor="#191D35"
                  glowColor="#6C5CFF"
                />
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* ────────── WEEKLY MOMENTUM (Figma #2:12602) ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(320)} style={styles.momentumSection}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionHeadingTitle}>Momentum</Text>
              <Text style={styles.sectionHeadingStreak}>
                {primaryStreak === 1 ? '1 day streak' : `${primaryStreak} day streak`}
              </Text>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((day, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.daySlot}
                  activeOpacity={0.7}
                  onPress={() => playTouchSound()}
                >
                  {day.completed ? (
                    <View style={styles.dayStateActive}>
                      <Image
                        source={require('@/../public/check.svg')}
                        style={styles.checkIcon}
                        contentFit="contain"
                      />
                    </View>
                  ) : (
                    <View style={styles.dayStateInactive}>
                      <Text style={styles.dashText}>—</Text>
                    </View>
                  )}
                  <Text style={[styles.dayLabel, !day.completed && styles.dayLabelInactive]}>
                    {day.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* ────────── SYSTEM LOG (Figma #2:12635) ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(400)} style={styles.systemLogCard}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionHeadingTitle}>System log</Text>
              <View style={styles.liveBadgeRow}>
                <View style={styles.liveBeaconWrapper}>
                  <Animated.View style={[styles.liveBeaconRing, beaconRippleStyle]} />
                  <View style={styles.liveBeaconDot} />
                </View>
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>

            {systemLogs.map((entry, idx) => (
              <View key={idx} style={styles.logEntry}>
                <Image
                  source={entry.icon}
                  style={styles.logIcon}
                  contentFit="contain"
                />
                <Text style={styles.logMessage}>{entry.message}</Text>
                <Text style={styles.logTime}>{entry.time}</Text>
              </View>
            ))}
          </Animated.View>
        </View>
      </ScrollView>

      {/* ────────── SYSTEM NOTICE MODAL ────────── */}
      <Modal
        visible={noticeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoticeModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNoticeModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>SYSTEM NOTIFICATIONS</Text>
              <TouchableOpacity
                onPress={() => setNoticeModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.noticeItem}>
              <Text style={styles.noticeBadge}>SYSTEM STATUS</Text>
              <Text style={styles.noticeTitle}>Neural Synapse Synchronized</Text>
              <Text style={styles.noticeBody}>
                All daily fitness tracking protocols and SQLite storage engines are operating at peak efficiency.
              </Text>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.audioToggleBtn, bgmEnabled && styles.audioToggleBtnActive]}
                onPress={() => {
                  playTouchSound();
                  toggleBGM();
                }}
              >
                <Text style={styles.audioToggleText}>
                  {bgmEnabled ? '🎵 BGM: ACTIVE' : '🔇 BGM: MUTED'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={() => {
                  playTouchSound();
                  setNoticeModalVisible(false);
                }}
              >
                <Text style={styles.modalPrimaryBtnText}>DISMISS</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#080A16',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingBottom: 24,
  },
  dashboardContainer: {
    width: '100%',
    maxWidth: 430,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 12 : 8,
    gap: 12,
  },

  /* ─── Page Header ─── */
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 2,
  },
  soloBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  appIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  appIconImage: {
    width: '100%',
    height: '100%',
  },
  brandTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.6,
    color: '#F5FAFF',
  },
  headerActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bellIcon: {
    width: 19,
    height: 19,
  },

  /* ─── Player Level Card ─── */
  playerLevelCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 8,
  },
  energyRail: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 2,
    height: 107,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 8px 1px #20C8FF',
  },
  energyPortraitWrapper: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 132,
    height: 127,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    overflow: 'hidden',
    pointerEvents: 'none',
  },
  energyPortraitImage: {
    width: '100%',
    height: '100%',
  },
  playerSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  levelBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelMarker: {
    width: 58,
    height: 58,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
  },
  levelMarkerSub: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#B7A8FF',
    lineHeight: 11,
  },
  levelMarkerNum: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 26,
    color: '#F5F7FF',
    lineHeight: 30,
  },
  playerDetails: {
    gap: 3,
  },
  playerName: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 20,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  rankTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(183, 168, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(183, 168, 255, 0.40)',
    alignSelf: 'flex-start',
  },
  rankTagText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#B7A8FF',
    textTransform: 'uppercase',
  },
  statusBeaconContainer: {
    width: 8,
    height: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBeaconDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3BE7A1',
    boxShadow: '0px 0px 10px 1px rgba(59, 231, 161, 0.70)',
  },

  /* ─── Experience Section ─── */
  experienceSection: {
    gap: 6,
    zIndex: 1,
  },
  experienceLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  experienceTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
  },
  experienceValue: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
    color: '#9CE9FF',
  },

  /* ─── 12-Segment Progress Track ─── */
  trackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 6,
    width: '100%',
  },
  trackSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
  },

  /* ─── Daily Stats Row ─── */
  dailyStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dailyMetricCard: {
    flex: 1,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    padding: 10,
    gap: 5,
  },
  metricIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricIcon: {
    width: 14,
    height: 14,
  },
  metricLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
  },
  metricValue: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 20,
    color: '#F5F7FF',
  },

  /* ─── Next Objective Card ─── */
  objectiveCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 8,
  },
  energyRailObjective: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 2,
    height: 105,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 8px 1px #20C8FF',
  },
  objectiveHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  objectiveTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.40)',
  },
  objectiveTagText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  objectiveXpReward: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#3BE7A1',
  },
  objectiveDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  objectiveIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderWidth: 1,
    borderColor: '#20C8FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectiveIcon: {
    width: 22,
    height: 22,
  },
  objectiveCopy: {
    flex: 1,
    gap: 3,
  },
  objectiveTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 16,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  objectiveSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 11,
    color: '#A8B0CE',
    lineHeight: 15,
  },
  chevronIcon: {
    width: 18,
    height: 18,
  },

  /* ─── Weekly Momentum Section ─── */
  momentumSection: {
    gap: 8,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeadingTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 16,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  sectionHeadingStreak: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 11,
    color: '#20C8FF',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  daySlot: {
    width: 38,
    alignItems: 'center',
    gap: 5,
  },
  dayStateActive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 255, 0.16)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayStateInactive: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkIcon: {
    width: 14,
    height: 14,
  },
  dashText: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 9,
    color: '#697292',
  },
  dayLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#F5F7FF',
  },
  dayLabelInactive: {
    color: '#697292',
  },

  /* ─── System Log Section ─── */
  systemLogCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  liveBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveBeaconWrapper: {
    width: 12,
    height: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  liveBeaconRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#20C8FF',
  },
  liveBeaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20C8FF',
  },
  liveText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 11,
    color: '#20C8FF',
  },
  logEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  logIcon: {
    width: 15,
    height: 15,
  },
  logMessage: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 11,
    color: '#A8B0CE',
  },
  logTime: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 9,
    color: '#697292',
  },

  /* ─── Modal Styles ─── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 17, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 20,
    gap: 16,
    boxShadow: '0px 0px 24px 2px rgba(108, 92, 255, 0.5)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 14,
    color: '#F5F7FF',
    letterSpacing: 1,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    color: '#697292',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#2A3154',
  },
  noticeItem: {
    gap: 6,
  },
  noticeBadge: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    letterSpacing: 0.5,
  },
  noticeTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 14,
    color: '#F5F7FF',
  },
  noticeBody: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 12,
    color: '#A8B0CE',
    lineHeight: 18,
  },
  modalActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  audioToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3154',
    backgroundColor: '#14182D',
    alignItems: 'center',
  },
  audioToggleBtnActive: {
    borderColor: '#6C5CFF',
    backgroundColor: 'rgba(108, 92, 255, 0.16)',
  },
  audioToggleText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
    color: '#F5F7FF',
  },
  modalPrimaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#6C5CFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryBtnText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#F5F7FF',
    letterSpacing: 0.5,
  },
});
