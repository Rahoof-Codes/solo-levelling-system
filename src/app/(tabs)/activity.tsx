import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect, usePathname } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { getRankImage } from '@/constants/rankImages';

import {
  getCurrentPlanProgress,
  getTodayWorkout,
  getWeekWorkouts,
  getCompletedWorkoutIds,
  completeWorkoutWithoutXP,
  claimWorkoutXP,
  logActivityWithoutXP,
  claimActivityXP,
  getTodayActivities,
  getProfile,
  activateWorkoutPlan,
} from '@/db/operations';
import {
  type Workout,
  type Activity,
  type Profile,
  type PlanType,
  ActivityType,
  Stat,
} from '@/types';
import { Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';
import { XPClaimModal } from '@/components/xp-claim-modal';
import { WorkoutSessionModal } from '@/components/workout-session-modal';
import { ParticleField } from '@/components/ui/particles';

interface PendingClaim {
  id: string;
  type: 'activity' | 'workout';
  name: string;
  xpAmount: number;
  stat: Stat;
  calories?: number;
}

interface PlanProgress {
  planType: PlanType | null;
  planName: string;
  currentDay: number;
  totalDays: number;
  currentWeek: number;
  totalWeeks: number;
  phase: string;
  difficulty: string;
  completedCount: number;
  progressPercent: number;
}

const WEEK_TAB_DEFAULTS = [
  { week: 1, title: 'WEEK 1', subtitle: 'FOUNDATION' },
  { week: 2, title: 'WEEK 2', subtitle: 'BUILD' },
  { week: 3, title: 'WEEK 3', subtitle: 'POWER' },
  { week: 4, title: 'WEEK 4', subtitle: 'ASCEND' },
];

/**
 * 12-Segment Progress Track
 * Matches Figma node #25:2437
 */
function SegmentedTrack({
  totalSegments = 12,
  activeCount = 0,
  activeColor = '#20C8FF',
  inactiveColor = '#191D35',
  glowColor = 'rgba(32, 200, 255, 0.4)',
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
                    shadowRadius: 6,
                    elevation: 4,
                  }
                : null,
            ]}
          />
        );
      })}
    </View>
  );
}

export default function ActivityScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useSQLiteContext();
  const { playTouchSound } = useAudio();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<PlanProgress | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);
  const [viewWeek, setViewWeek] = useState<number>(1);
  const [weekWorkouts, setWeekWorkouts] = useState<Workout[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedWeekDay, setSelectedWeekDay] = useState<Workout | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [activating, setActivating] = useState(false);

  // Workout Session Modal State
  const [sessionModalVisible, setSessionModalVisible] = useState(false);
  const [sessionWorkout, setSessionWorkout] = useState<Workout | null>(null);

  // Custom Activity Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>(ActivityType.RUNNING);
  const [description, setDescription] = useState('');
  const [durationMin, setDurationMin] = useState('30');

  // Locked XP Claim Modal State
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [pendingClaim, setPendingClaim] = useState<PendingClaim | null>(null);
  const [claimResult, setClaimResult] = useState<{
    leveledUp: boolean;
    newLevel?: number;
    rankChanged: boolean;
    newRank?: string;
  } | null>(null);

  /* ─────────────── FIGMA DESIGN ANIMATIONS ─────────────── */

  // 1. Continuous Glowing Energy Rail Pulse (#25:2400 & #25:2431)
  const energyRailPulse = useSharedValue(0.5);
  useEffect(() => {
    energyRailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [energyRailPulse]);

  const energyRailStyle = useAnimatedStyle(() => ({
    opacity: energyRailPulse.value,
  }));

  // 2. Active Status Dot Pulsing Glow (#25:2408)
  const statusDotPulse = useSharedValue(0.85);
  useEffect(() => {
    statusDotPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [statusDotPulse]);

  const statusDotAnimStyle = useAnimatedStyle(() => ({
    opacity: statusDotPulse.value,
    transform: [{ scale: statusDotPulse.value }],
  }));

  // 3. Begin Workout Button Interactive Scale
  const buttonScale = useSharedValue(1);
  const onButtonPressIn = () => {
    buttonScale.value = withSpring(0.96, { damping: 15 });
  };
  const onButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 15 });
  };
  const buttonAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const loadData = useCallback(async () => {
    try {
      const p = await getCurrentPlanProgress(db);
      setProgress(p);

      const prof = await getProfile(db);
      setProfile(prof);

      if (p) {
        if (prof?.plan_start_date) {
          const tw = await getTodayWorkout(db, prof.plan_start_date);
          setTodayWorkout(tw);
        }

        const activeWeek = viewWeek || p.currentWeek || 1;
        const planId = p.planType === '365day' ? 'plan-monarch-ascension-365' : 'plan-shadow-awakening-100';
        const ww = await getWeekWorkouts(db, activeWeek, planId);
        setWeekWorkouts(ww);

        const cIds = await getCompletedWorkoutIds(db);
        setCompletedIds(cIds);
      }

      const a = await getTodayActivities(db);
      setActivities(a);
    } catch (err) {
      console.error('Error loading training data:', err);
    }
  }, [db, viewWeek]);

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

  const handleSelectWeek = async (weekNum: number) => {
    playTouchSound();
    setViewWeek(weekNum);
    const planId = progress?.planType === '365day' ? 'plan-monarch-ascension-365' : 'plan-shadow-awakening-100';
    const ww = await getWeekWorkouts(db, weekNum, planId);
    setWeekWorkouts(ww);
    if (ww.length > 0) {
      setSelectedWeekDay(ww[0]);
    } else {
      setSelectedWeekDay(null);
    }
  };

  const handleSelectDayNumber = async (dayNum: number) => {
    try {
      playTouchSound();
      const w = await db.getFirstAsync<Workout>(
        'SELECT * FROM workouts WHERE day = ? LIMIT 1;',
        [dayNum]
      );
      if (w) {
        setSelectedWeekDay(w);
        if (w.week !== viewWeek) {
          setViewWeek(w.week);
          const ww = await getWeekWorkouts(db, w.week);
          setWeekWorkouts(ww);
        }
      }
      setShowCalendar(false);
    } catch (e) {
      console.warn('Failed to load workout for day:', dayNum, e);
    }
  };

  const handleQuickActivate = async (planType: PlanType) => {
    try {
      setActivating(true);
      await activateWorkoutPlan(db, planType);
      await loadData();
      Alert.alert(
        'Plan Activated!',
        `${planType === '100day' ? '100-Day Shadow Awakening' : "365-Day Monarch's Ascension"} has been activated!`
      );
    } catch (err: any) {
      Alert.alert('Activation Error', err?.message || 'Failed to activate plan');
    } finally {
      setActivating(false);
    }
  };

  const handleStartWorkout = (workout: Workout) => {
    playTouchSound();
    if (completedIds.has(workout.id)) {
      Alert.alert('Already Complete', 'This workout has already been completed.');
      return;
    }
    router.push({
      pathname: '/workout-session',
      params: { workoutId: workout.id },
    });
  };

  const handleSessionComplete = async (durationActual: number) => {
    if (!sessionWorkout) return;
    setSessionModalVisible(false);

    try {
      const { pendingXP } = await completeWorkoutWithoutXP(db, sessionWorkout.id, durationActual);
      await loadData();

      setClaimResult(null);
      setPendingClaim({
        id: sessionWorkout.id,
        type: 'workout',
        name: sessionWorkout.name,
        xpAmount: pendingXP.xp,
        stat: pendingXP.stat,
      });
      setClaimModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not complete workout');
    } finally {
      setSessionWorkout(null);
    }
  };

  const handleSessionCancel = () => {
    setSessionModalVisible(false);
    setSessionWorkout(null);
  };

  const handleLogActivity = async () => {
    const mins = parseInt(durationMin, 10) || 0;
    if (mins <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid duration in minutes');
      return;
    }

    try {
      const { activity, pendingXP } = await logActivityWithoutXP(db, {
        type: activityType,
        description: description.trim() || undefined,
        duration_min: mins,
      });

      const loggedName = `${activity.type} (${mins}m)`;
      setDescription('');
      setDurationMin('30');
      setModalVisible(false);

      await loadData();

      setClaimResult(null);
      setPendingClaim({
        id: activity.id,
        type: 'activity',
        name: loggedName,
        xpAmount: pendingXP.xp,
        stat: pendingXP.stat,
        calories: pendingXP.calories,
      });
      setClaimModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not log activity');
    }
  };

  const handleClaimXP = async () => {
    if (!pendingClaim) return;

    try {
      let xpResult: { newProfile: any; leveledUp: boolean; rankChanged: boolean };

      if (pendingClaim.type === 'workout') {
        xpResult = await claimWorkoutXP(
          db,
          pendingClaim.id,
          pendingClaim.stat,
          pendingClaim.xpAmount
        );
      } else {
        xpResult = await claimActivityXP(
          db,
          pendingClaim.id,
          pendingClaim.stat,
          pendingClaim.xpAmount
        );
      }

      await loadData();

      setClaimResult({
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newProfile.level,
        rankChanged: xpResult.rankChanged,
        newRank: xpResult.newProfile.rank,
      });
    } catch (err: any) {
      Alert.alert('System Error', err?.message ?? 'Failed to claim XP');
    }
  };

  const handleDismissClaim = () => {
    setClaimModalVisible(false);
    setPendingClaim(null);
    setClaimResult(null);
  };

  // Parse exercises for display
  const parseExercises = (workout: Workout | null) => {
    if (!workout) return [];
    try {
      return JSON.parse(workout.exercises_json || '[]');
    } catch {
      return [];
    }
  };

  // Determine workout to display in the detail card
  const displayWorkout = useMemo(() => {
    if (selectedWeekDay) return selectedWeekDay;
    if (todayWorkout && todayWorkout.week === viewWeek) return todayWorkout;
    if (weekWorkouts.length > 0) return weekWorkouts[0];
    return null;
  }, [selectedWeekDay, todayWorkout, viewWeek, weekWorkouts]);

  const displayExercises = useMemo(() => {
    return parseExercises(displayWorkout);
  }, [displayWorkout]);

  // Real player attributes
  const playerName = profile?.username ? profile.username.toUpperCase() : 'ABDUL RAHOOF';
  const playerLevel = profile?.level ?? 27;
  const playerRank = profile?.rank || 'C';
  const playerTitle = profile?.title ? profile.title.toUpperCase() : 'VANGUARD';
  const playerRankLabel = `${playerRank}-RANK · ${playerTitle}`;

  // Workout count and recovery count
  const workoutCount = useMemo(() => {
    return weekWorkouts.filter((w) => !w.name.toLowerCase().includes('recovery')).length;
  }, [weekWorkouts]);
  const recoveryCount = useMemo(() => {
    return Math.max(0, weekWorkouts.length - workoutCount);
  }, [weekWorkouts, workoutCount]);

  // Week sessions completion calculation (based on training sessions, matching Figma)
  const totalInWeek = useMemo(() => {
    return workoutCount > 0 ? workoutCount : Math.max(1, weekWorkouts.length);
  }, [workoutCount, weekWorkouts]);

  const completedInWeek = useMemo(() => {
    return weekWorkouts.filter((w) => !w.name.toLowerCase().includes('recovery') && completedIds.has(w.id)).length;
  }, [weekWorkouts, completedIds]);

  const formatRepsOrDuration = (ex: any) => {
    const sets = ex.sets || 3;
    if (ex.reps) {
      return `${sets} × ${ex.reps}`;
    }
    if (ex.duration_min) {
      if (ex.duration_min < 1) {
        return `${sets} × ${Math.round(ex.duration_min * 60)}s`;
      }
      return `${sets} × ${ex.duration_min} MIN`;
    }
    return `${sets} × 10`;
  };

  // 12-segment mapping for week sessions
  const activeSegmentsCount = useMemo(() => {
    if (totalInWeek === 0) return 0;
    return Math.min(12, Math.round((completedInWeek / totalInWeek) * 12));
  }, [completedInWeek, totalInWeek]);

  // Current phase name
  const currentPhaseName = progress?.phase || 'Foundation';

  // 4 Week tabs calculation
  const weekTabs = useMemo(() => {
    const base = Math.floor((viewWeek - 1) / 4) * 4 + 1;
    return [0, 1, 2, 3].map((offset) => {
      const wNum = base + offset;
      const def = WEEK_TAB_DEFAULTS[offset];
      return {
        week: wNum,
        title: `WEEK ${wNum}`,
        subtitle: def ? def.subtitle : `STAGE ${wNum}`,
      };
    });
  }, [viewWeek]);

  const isDisplayWorkoutCompleted = displayWorkout ? completedIds.has(displayWorkout.id) : false;

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
        <View style={styles.contentContainer}>
          {/* ────────── SOLO APP HEADER (#33:37) ────────── */}
          <View style={styles.soloAppHeader}>
            <View style={styles.soloBrand}>
              <View style={styles.soloAppIconContainer}>
                <Image
                  source={getRankImage(profile?.rank)}
                  style={styles.soloAppIcon}
                  contentFit="cover"
                />
              </View>
              <Text style={styles.soloBrandText}>SOLO SYSTEM</Text>
            </View>
          </View>

          {/* ────────── TRAINING CONTENT (#25:2392) ────────── */}
          <View style={styles.trainingContent}>
            {/* PAGE HEADER (#25:2393) */}
            <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
              <View style={styles.headingBlock}>
                <Text style={styles.protocolSubtitle}>HOME PROTOCOL · NO EQUIPMENT</Text>
                <Text style={styles.pageTitle}>TRAINING</Text>
              </View>
              <TouchableOpacity
                style={styles.calendarActionBtn}
                onPress={() => {
                  playTouchSound();
                  setShowCalendar(true);
                }}
                activeOpacity={0.75}
              >
                <Image
                  source={require('@/../public/calendar-days.svg')}
                  style={styles.calendarIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </Animated.View>

            {/* PLAYER CONTEXT (#25:2399) */}
            <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.playerContextCard}>
              {/* Energy rail (#25:2400) */}
              <Animated.View style={[styles.playerEnergyRail, energyRailStyle]} />

              {/* Level marker (#25:2401) */}
              <View style={styles.levelMarker}>
                <Text style={styles.levelLabel}>LV.</Text>
                <Text style={styles.levelValue}>{playerLevel}</Text>
              </View>

              {/* Player details (#25:2404) */}
              <View style={styles.playerDetails}>
                <Text style={styles.playerName} numberOfLines={1}>{playerName}</Text>
                <Text style={styles.playerRank}>{playerRankLabel}</Text>
              </View>

              {/* Plan status (#25:2407) */}
              <View style={styles.planStatus}>
                <Animated.View style={[styles.statusDot, statusDotAnimStyle]} />
                <Text style={styles.statusText}>{progress ? 'ACTIVE' : 'READY'}</Text>
              </View>
            </Animated.View>

            {/* WEEK PROGRESSION TABS (#25:2410) */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.weekProgression}>
              {weekTabs.map((tab) => {
                const isActive = tab.week === viewWeek;
                const isLocked = progress ? tab.week > progress.totalWeeks : tab.week > 1;

                return (
                  <TouchableOpacity
                    key={tab.week}
                    style={[
                      styles.weekTab,
                      isActive ? styles.weekTabActive : styles.weekTabInactive,
                    ]}
                    onPress={() => handleSelectWeek(tab.week)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.weekTabTitle, isActive ? styles.weekTabTitleActive : styles.weekTabTitleInactive]}>
                      {tab.title}
                    </Text>
                    <View style={styles.weekStateRow}>
                      {!isActive && (
                        <Image
                          source={require('@/../public/lock.svg')}
                          style={styles.lockIcon}
                          contentFit="contain"
                        />
                      )}
                      <Text style={[styles.weekStateText, isActive ? styles.weekStateTextActive : styles.weekStateTextInactive]}>
                        {tab.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.View>

            {/* WEEK SUMMARY CARD (#25:2430) */}
            <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.weekSummaryCard}>
              {/* Energy rail (#25:2431) */}
              <Animated.View style={[styles.summaryEnergyRail, energyRailStyle]} />

              <View style={styles.summaryHeading}>
                <View style={styles.summaryCopy}>
                  <Text style={styles.summarySubtitle}>
                    Week {viewWeek} · {currentPhaseName}
                  </Text>
                  <Text style={styles.summaryTitle}>
                    {completedInWeek} / {totalInWeek} sessions complete
                  </Text>
                </View>
                <Text style={styles.summaryDaysText}>7 DAYS</Text>
              </View>

              {/* Progress track (#25:2437) */}
              <SegmentedTrack
                totalSegments={12}
                activeCount={activeSegmentsCount}
                activeColor="#20C8FF"
                inactiveColor="#191D35"
                glowColor="rgba(32, 200, 255, 0.4)"
              />

              <Text style={styles.summaryFootnote}>
                {workoutCount} workouts · {recoveryCount} recovery days · small-space friendly
              </Text>
            </Animated.View>

            {/* SELECTED WORKOUT CARD (#25:2451) */}
            {displayWorkout ? (
              <Animated.View entering={FadeInDown.duration(400).delay(180)} style={styles.selectedWorkoutCard}>
                {/* Heading (#25:2452) */}
                <View style={styles.workoutHeading}>
                  <View style={styles.workoutTitleBlock}>
                    <Text style={styles.workoutSubtitle}>
                      Day {displayWorkout.day} · Selected
                    </Text>
                    <Text style={styles.workoutMainTitle} numberOfLines={1}>
                      {displayWorkout.name.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.difficultyBadge}>
                    <Text style={styles.difficultyText}>
                      {(displayWorkout.difficulty || 'Beginner').toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Metadata row (#25:2458) */}
                <View style={styles.workoutMetadata}>
                  <View style={styles.metaItem}>
                    <Image
                      source={require('@/../public/clock-3.svg')}
                      style={styles.metaIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.metaText}>28 MIN</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Image
                      source={require('@/../public/house.svg')}
                      style={styles.metaIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.metaText}>HOME</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Image
                      source={require('@/../public/badge-check.svg')}
                      style={styles.metaIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.metaText}>NO GEAR</Text>
                  </View>
                </View>

                {/* Divider (#25:2468) */}
                <View style={styles.divider} />

                {/* Exercise list (#25:2469) */}
                <View style={styles.exerciseList}>
                  {displayExercises.length > 0 ? (
                    displayExercises.slice(0, 5).map((ex: any, idx: number) => {
                      const repsLabel = formatRepsOrDuration(ex);

                      return (
                        <View key={idx} style={styles.exerciseRow}>
                          <View style={styles.exerciseNameWrapper}>
                            <View style={styles.exerciseMarkerDot} />
                            <Text style={styles.exerciseNameText} numberOfLines={1}>
                              {ex.name}
                            </Text>
                          </View>
                          <Text style={styles.exerciseRepsText}>{repsLabel}</Text>
                        </View>
                      );
                    })
                  ) : (
                    <>
                      <View style={styles.exerciseRow}>
                        <View style={styles.exerciseNameWrapper}>
                          <View style={styles.exerciseMarkerDot} />
                          <Text style={styles.exerciseNameText}>Incline push-ups</Text>
                        </View>
                        <Text style={styles.exerciseRepsText}>3 × 10</Text>
                      </View>
                      <View style={styles.exerciseRow}>
                        <View style={styles.exerciseNameWrapper}>
                          <View style={styles.exerciseMarkerDot} />
                          <Text style={styles.exerciseNameText}>Kneeling push-ups</Text>
                        </View>
                        <Text style={styles.exerciseRepsText}>3 × 8</Text>
                      </View>
                      <View style={styles.exerciseRow}>
                        <View style={styles.exerciseNameWrapper}>
                          <View style={styles.exerciseMarkerDot} />
                          <Text style={styles.exerciseNameText}>Plank shoulder taps</Text>
                        </View>
                        <Text style={styles.exerciseRepsText}>3 × 12</Text>
                      </View>
                      <View style={styles.exerciseRow}>
                        <View style={styles.exerciseNameWrapper}>
                          <View style={styles.exerciseMarkerDot} />
                          <Text style={styles.exerciseNameText}>Isometric chest squeeze</Text>
                        </View>
                        <Text style={styles.exerciseRepsText}>3 × 20s</Text>
                      </View>
                    </>
                  )}
                </View>

                {/* Action button (#25:2490) */}
                <Animated.View style={buttonAnimStyle}>
                  <TouchableOpacity
                    style={[
                      styles.beginWorkoutBtn,
                      isDisplayWorkoutCompleted && styles.beginWorkoutBtnDone,
                    ]}
                    onPress={() => handleStartWorkout(displayWorkout)}
                    onPressIn={onButtonPressIn}
                    onPressOut={onButtonPressOut}
                    activeOpacity={0.85}
                  >
                    <Image
                      source={
                        isDisplayWorkoutCompleted
                          ? require('@/../public/check.svg')
                          : require('@/../public/play.svg')
                      }
                      style={styles.playIcon}
                      contentFit="contain"
                    />
                    <Text style={styles.beginWorkoutText}>
                      {isDisplayWorkoutCompleted
                        ? 'WORKOUT COMPLETED'
                        : `BEGIN DAY ${displayWorkout.day}`}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              </Animated.View>
            ) : null}

            {/* WEEKLY SCHEDULE (#25:2493) */}
            <Animated.View entering={FadeInDown.duration(400).delay(220)} style={styles.weeklySchedule}>
              <View style={styles.scheduleHeading}>
                <Text style={styles.scheduleSectionTitle}>THIS WEEK</Text>
                <Text style={styles.scheduleSubtitle}>Unlock in order</Text>
              </View>

              {weekWorkouts.length > 0 ? (
                weekWorkouts.map((w, index) => {
                  const dayInWeek = ((w.day - 1) % 7) + 1;
                  const isSelected = displayWorkout?.id === w.id;
                  const isDone = completedIds.has(w.id);
                  const isRecovery = w.name.toLowerCase().includes('recovery');

                  let subtext = `${w.difficulty || 'beginner'} · ${w.xp_value} XP`;
                  try {
                    const exList = JSON.parse(w.exercises_json || '[]');
                    if (Array.isArray(exList) && exList.length > 0) {
                      subtext = `28 min · ${exList.length} exercises`;
                    }
                  } catch {
                    subtext = '28 min · 4 exercises';
                  }

                  return (
                    <TouchableOpacity
                      key={w.id}
                      style={[
                        styles.scheduleRow,
                        isSelected ? styles.scheduleRowSelected : styles.scheduleRowDefault,
                      ]}
                      onPress={() => {
                        playTouchSound();
                        setSelectedWeekDay(w);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.dayMarker, isSelected ? styles.dayMarkerSelected : styles.dayMarkerDefault]}>
                        <Text style={[styles.dayMarkerText, isSelected ? styles.dayMarkerTextSelected : styles.dayMarkerTextDefault]}>
                          D{dayInWeek}
                        </Text>
                      </View>

                      <View style={styles.scheduleDetails}>
                        <Text style={styles.scheduleTitle} numberOfLines={1}>{w.name}</Text>
                        <Text style={styles.scheduleMeta} numberOfLines={1}>{subtext}</Text>
                      </View>

                      <View style={styles.scheduleIconWrapper}>
                        {isDone ? (
                          <Image
                            source={require('@/../public/check.svg')}
                            style={[styles.rowActionIcon, { tintColor: '#3BE7A1' }]}
                            contentFit="contain"
                          />
                        ) : isSelected ? (
                          <Image
                            source={require('@/../public/play.svg')}
                            style={[styles.rowActionIcon, { tintColor: '#20C8FF' }]}
                            contentFit="contain"
                          />
                        ) : isRecovery ? (
                          <Image
                            source={require('@/../public/heart-pulse.svg')}
                            style={[styles.rowActionIcon, { tintColor: '#3BE7A1' }]}
                            contentFit="contain"
                          />
                        ) : (
                          <Image
                            source={require('@/../public/lock.svg')}
                            style={[styles.rowActionIcon, { tintColor: '#697292' }]}
                            contentFit="contain"
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                /* Fallback if no week workouts found / no plan active */
                <View style={styles.noPlanBox}>
                  <Text style={styles.noPlanHeading}>No Training Plan Active</Text>
                  <Text style={styles.noPlanSubtext}>
                    Activate a Hunter protocol to initiate daily schedule:
                  </Text>
                  <TouchableOpacity
                    style={styles.quickActivateButton}
                    onPress={() => handleQuickActivate('100day')}
                    disabled={activating}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.quickActivateButtonText}>
                      ⚡ ACTIVATE 100-DAY SHADOW AWAKENING
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      {/* ────────── CALENDAR MODAL ────────── */}
      <Modal visible={showCalendar} animationType="fade" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>TRAINING CALENDAR</Text>
              <TouchableOpacity
                onPress={() => {
                  playTouchSound();
                  setShowCalendar(false);
                }}
                style={styles.closeBtn}
              >
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.calendarSubhead}>
              Month {Math.ceil(viewWeek / 4)} · Select any day to view regimen
            </Text>

            <View style={styles.calendarGrid}>
              {Array.from({ length: 28 }, (_, i) => {
                const monthStartWeek = Math.floor((viewWeek - 1) / 4) * 4 + 1;
                const dayNum = (monthStartWeek - 1) * 7 + i + 1;
                const isSelected = displayWorkout?.day === dayNum;
                const isDone = completedIds.has(`100day-d${dayNum}`) || completedIds.has(`365day-d${dayNum}`);

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.calendarCell,
                      isSelected && styles.calendarCellSelected,
                      isDone && styles.calendarCellDone,
                    ]}
                    onPress={() => handleSelectDayNumber(dayNum)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.calendarCellText,
                        isSelected && styles.calendarCellTextSelected,
                        isDone && styles.calendarCellTextDone,
                      ]}
                    >
                      D{dayNum}
                    </Text>
                    {isDone && <View style={styles.calendarDoneDot} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Log custom activity shortcut */}
            <TouchableOpacity
              style={styles.logActivityBtn}
              onPress={() => {
                setShowCalendar(false);
                setModalVisible(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.logActivityBtnText}>+ Log Custom Activity</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ────────── CUSTOM ACTIVITY MODAL ────────── */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>LOG ACTIVITY</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>TYPE</Text>
            <View style={styles.typeSelector}>
              {[
                ActivityType.RUNNING,
                ActivityType.WALKING,
                ActivityType.LIFTING,
                ActivityType.HIIT,
                ActivityType.CYCLING,
                ActivityType.STUDY,
              ].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeChip, activityType === t && styles.typeChipActive]}
                  onPress={() => {
                    setActivityType(t);
                    if (t === ActivityType.STUDY) {
                      setDurationMin('45');
                    }
                  }}
                >
                  <Text style={[styles.typeChipText, activityType === t && styles.typeChipTextActive]}>
                    {t.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>DURATION (MINUTES)</Text>
            <TextInput
              style={styles.input}
              value={durationMin}
              onChangeText={setDurationMin}
              keyboardType="number-pad"
              placeholder="30"
              placeholderTextColor="#697292"
            />

            <Text style={styles.inputLabel}>NOTES / DESCRIPTION</Text>
            <TextInput
              style={styles.input}
              value={description}
              onChangeText={setDescription}
              placeholder="E.g. 5k morning run"
              placeholderTextColor="#697292"
            />

            <TouchableOpacity style={styles.submitBtn} onPress={handleLogActivity} activeOpacity={0.8}>
              <Text style={styles.submitBtnText}>CONFIRM & CLAIM XP</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ────────── WORKOUT SESSION MODAL ────────── */}
      {sessionWorkout && (
        <WorkoutSessionModal
          visible={sessionModalVisible}
          workout={sessionWorkout}
          onComplete={handleSessionComplete}
          onCancel={handleSessionCancel}
        />
      )}

      {/* ────────── XP CLAIM MODAL ────────── */}
      {pendingClaim && (
        <XPClaimModal
          visible={claimModalVisible}
          activityName={pendingClaim.name}
          subtitle="HUNTER ACTIVITY"
          xpAmount={pendingClaim.xpAmount}
          stat={pendingClaim.stat}
          calories={pendingClaim.calories}
          completionTagText="ACTIVITY CLEAR"
          onClaim={handleClaimXP}
          onDismiss={handleDismissClaim}
          claimResult={claimResult}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050611',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(135deg, #0E1122 0%, #080A16 55%, #050611 100%)',
      },
    }),
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  contentContainer: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },

  /* ─── SOLO App Header (#33:37) ─── */
  soloAppHeader: {
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  soloBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  soloAppIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  soloAppIcon: {
    width: 22,
    height: 22,
  },
  soloBrandText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.6,
    color: '#F5FAFF',
  },

  /* ─── Training Content (#25:2392) ─── */
  trainingContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 10,
  },

  /* ─── Page Header (#25:2393) ─── */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headingBlock: {
    gap: 2,
  },
  protocolSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 26,
    color: '#F5F7FF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  calendarActionBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIcon: {
    width: 18,
    height: 18,
    tintColor: '#20C8FF',
  },

  /* ─── Player Context Card (#25:2399) ─── */
  playerContextCard: {
    height: 54,
    borderRadius: 12,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    position: 'relative',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 8,
  },
  playerEnergyRail: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 2,
    height: 38,
    backgroundColor: '#20C8FF',
    borderRadius: 1,
    boxShadow: '0px 0px 8px 1px #20C8FF',
  },
  levelMarker: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 7,
    color: '#B7A8FF',
    lineHeight: 8,
  },
  levelValue: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 14,
    color: '#F5F7FF',
    lineHeight: 16,
  },
  playerDetails: {
    flex: 1,
    gap: 3,
  },
  playerName: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 12,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  playerRank: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 8,
    color: '#B7A8FF',
    textTransform: 'uppercase',
  },
  planStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3BE7A1',
    boxShadow: '0px 0px 6px 1px rgba(59, 231, 161, 0.7)',
  },
  statusText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 8,
    color: '#3BE7A1',
    textTransform: 'uppercase',
  },

  /* ─── Week Progression Tabs (#25:2410) ─── */
  weekProgression: {
    flexDirection: 'row',
    gap: 6,
    alignSelf: 'stretch',
  },
  weekTab: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  weekTabActive: {
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderWidth: 1,
    borderColor: '#20C8FF',
    boxShadow: '0px 0px 18px 1px rgba(32, 200, 255, 0.27)',
    elevation: 4,
  },
  weekTabInactive: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  weekTabTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
  },
  weekTabTitleActive: {
    color: '#20C8FF',
  },
  weekTabTitleInactive: {
    color: '#697292',
  },
  weekStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  lockIcon: {
    width: 9,
    height: 9,
    tintColor: '#697292',
  },
  weekStateText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  weekStateTextActive: {
    color: '#9CE9FF',
  },
  weekStateTextInactive: {
    color: '#697292',
  },

  /* ─── Week Summary Card (#25:2430) ─── */
  weekSummaryCard: {
    height: 82,
    borderRadius: 12,
    backgroundColor: '#060D1E',
    borderWidth: 1,
    borderColor: '#1E3A6E',
    padding: 12,
    gap: 8,
    position: 'relative',
    boxShadow: '0px 0px 18px 1px rgba(32, 200, 255, 0.27)',
    elevation: 6,
  },
  summaryEnergyRail: {
    position: 'absolute',
    left: 0,
    top: 10,
    width: 2,
    height: 62,
    backgroundColor: '#20C8FF',
    borderRadius: 1,
    boxShadow: '0px 0px 8px 1px #20C8FF',
  },
  summaryHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCopy: {
    gap: 2,
  },
  summarySubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  summaryTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 16,
    color: '#F5F7FF',
  },
  summaryDaysText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 10,
    color: '#9CE9FF',
  },
  trackContainer: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    gap: 3,
    height: 5,
  },
  trackSegment: {
    flex: 1,
    height: 5,
    borderRadius: 999,
  },
  summaryFootnote: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 8,
    color: '#697292',
  },

  /* ─── Selected Workout Card (#25:2451) ─── */
  selectedWorkoutCard: {
    borderRadius: 16,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    padding: 12,
    gap: 8,
    boxShadow: '0px 10px 24px 0px rgba(0, 0, 0, 0.40)',
    elevation: 8,
  },
  workoutHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutTitleBlock: {
    gap: 2,
    flex: 1,
  },
  workoutSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  workoutMainTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 18,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  difficultyBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(59, 231, 161, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(59, 231, 161, 0.33)',
    borderRadius: 4,
  },
  difficultyText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 8,
    color: '#3BE7A1',
    textTransform: 'uppercase',
  },
  workoutMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaIcon: {
    width: 13,
    height: 13,
    tintColor: '#A8B0CE',
  },
  metaText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 10,
    color: '#A8B0CE',
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A3154',
  },
  exerciseList: {
    gap: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  exerciseMarkerDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#20C8FF',
  },
  exerciseNameText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 10,
    color: '#A8B0CE',
  },
  exerciseRepsText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#9CE9FF',
  },
  beginWorkoutBtn: {
    height: 44,
    borderRadius: 8,
    backgroundColor: '#6C5CFF',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(90deg, #6C5CFF 0%, #385FEA 100%)',
      },
    }),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 6,
    marginTop: 2,
  },
  beginWorkoutBtnDone: {
    backgroundColor: '#1E293B',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(90deg, #1E293B 0%, #0F172A 100%)',
      },
    }),
    boxShadow: 'none',
  },
  playIcon: {
    width: 16,
    height: 16,
    tintColor: '#FFFFFF',
  },
  beginWorkoutText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 12,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* ─── Weekly Schedule (#25:2493) ─── */
  weeklySchedule: {
    gap: 6,
    alignSelf: 'stretch',
  },
  scheduleHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scheduleSectionTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  scheduleSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 8,
    color: '#697292',
  },
  scheduleRow: {
    height: 41,
    paddingHorizontal: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scheduleRowSelected: {
    backgroundColor: 'rgba(32, 200, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.33)',
  },
  scheduleRowDefault: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  dayMarker: {
    width: 30,
    height: 26,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayMarkerSelected: {
    backgroundColor: 'rgba(32, 200, 255, 0.10)',
  },
  dayMarkerDefault: {
    backgroundColor: '#191D35',
  },
  dayMarkerText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  dayMarkerTextSelected: {
    color: '#20C8FF',
  },
  dayMarkerTextDefault: {
    color: '#697292',
  },
  scheduleDetails: {
    flex: 1,
    gap: 2,
  },
  scheduleTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#F5F7FF',
  },
  scheduleMeta: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 8,
    color: '#697292',
  },
  scheduleIconWrapper: {
    width: 14,
    height: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowActionIcon: {
    width: 14,
    height: 14,
  },

  /* ─── No Plan Fallback ─── */
  noPlanBox: {
    backgroundColor: '#0E1122',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A3154',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  noPlanHeading: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 13,
    color: '#F5F7FF',
  },
  noPlanSubtext: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: '#697292',
    textAlign: 'center',
  },
  quickActivateButton: {
    backgroundColor: 'rgba(32, 200, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#20C8FF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  quickActivateButtonText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 10,
    color: '#20C8FF',
    letterSpacing: 0.5,
  },

  /* ─── Modal Styles ─── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 6, 17, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 18,
    gap: 12,
    boxShadow: '0px 0px 24px 2px rgba(108, 92, 255, 0.40)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 14,
    color: '#F5F7FF',
    letterSpacing: 0.8,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#191D35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeBtnText: {
    color: '#A8B0CE',
    fontSize: 14,
    fontWeight: '700',
  },
  calendarSubhead: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: '#697292',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 6,
  },
  calendarCell: {
    width: '12.5%',
    aspectRatio: 1,
    borderRadius: 6,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  calendarCellSelected: {
    backgroundColor: 'rgba(32, 200, 255, 0.15)',
    borderColor: '#20C8FF',
  },
  calendarCellDone: {
    borderColor: '#3BE7A1',
  },
  calendarCellText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#697292',
  },
  calendarCellTextSelected: {
    color: '#20C8FF',
  },
  calendarCellTextDone: {
    color: '#3BE7A1',
  },
  calendarDoneDot: {
    position: 'absolute',
    bottom: 2,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#3BE7A1',
  },
  logActivityBtn: {
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  logActivityBtnText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
    color: '#20C8FF',
  },

  /* ─── Form Inputs ─── */
  inputLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    letterSpacing: 0.5,
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeChip: {
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  typeChipActive: {
    backgroundColor: 'rgba(32, 200, 255, 0.15)',
    borderColor: '#20C8FF',
  },
  typeChipText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#697292',
  },
  typeChipTextActive: {
    color: '#20C8FF',
  },
  input: {
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#F5F7FF',
    fontFamily: Fonts.sans,
    fontSize: 12,
  },
  submitBtn: {
    backgroundColor: '#6C5CFF',
    ...Platform.select({
      web: {
        backgroundImage: 'linear-gradient(90deg, #6C5CFF 0%, #385FEA 100%)',
      },
    }),
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  submitBtnText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
});
