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
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter, useFocusEffect, usePathname } from 'expo-router';
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
import { ACTIVITY_TYPE_OPTIONS } from '@/lib/calculations/met';
import { StatColors, Fonts, Spacing } from '@/constants/theme';
import { XPClaimModal } from '@/components/xp-claim-modal';
import { StepTrackerCard } from '@/components/status/step-tracker-card';

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

const WEEKDAY_NAMES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export default function ActivityScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
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
        const ww = await getWeekWorkouts(db, activeWeek);
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

  const pathname = usePathname();

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

  const handlePrevWeek = async () => {
    if (viewWeek > 1) {
      const newWeek = viewWeek - 1;
      setViewWeek(newWeek);
      const ww = await getWeekWorkouts(db, newWeek);
      setWeekWorkouts(ww);
      if (ww.length > 0) setSelectedWeekDay(ww[0]);
    }
  };

  const handleNextWeek = async () => {
    if (progress && viewWeek < progress.totalWeeks) {
      const newWeek = viewWeek + 1;
      setViewWeek(newWeek);
      const ww = await getWeekWorkouts(db, newWeek);
      setWeekWorkouts(ww);
      if (ww.length > 0) setSelectedWeekDay(ww[0]);
    }
  };

  const handleSelectDayNumber = async (dayNum: number) => {
    try {
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
        'PROTOCOL INITIALIZED',
        `${planType === '100day' ? '100-Day Shadow Awakening' : "365-Day Monarch's Ascension"} has been activated! Your daily workouts are now scheduled.`
      );
    } catch (err: any) {
      Alert.alert('Activation Error', err?.message || 'Failed to activate plan');
    } finally {
      setActivating(false);
    }
  };

  const getDayDateLabel = (dayNum: number, startDate?: string | null): string => {
    if (!startDate) return `DAY ${dayNum}`;
    try {
      const d = new Date(startDate + 'T00:00:00');
      d.setDate(d.getDate() + (dayNum - 1));
      return d.toLocaleDateString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).toUpperCase();
    } catch {
      return `DAY ${dayNum}`;
    }
  };

  const handleCompleteWorkout = async (workout: Workout) => {
    if (completedIds.has(workout.id)) {
      Alert.alert('Already Complete', 'This workout has already been completed.');
      return;
    }

    try {
      const { pendingXP } = await completeWorkoutWithoutXP(db, workout.id);
      await loadData();

      setClaimResult(null);
      setPendingClaim({
        id: workout.id,
        type: 'workout',
        name: workout.name,
        xpAmount: pendingXP.xp,
        stat: pendingXP.stat,
      });
      setClaimModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not complete workout');
    }
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

  const todayExercises = useMemo(() => parseExercises(todayWorkout), [todayWorkout]);
  const selectedExercises = useMemo(() => parseExercises(selectedWeekDay), [selectedWeekDay]);

  // Determine workout to display in the detail card
  const displayWorkout = selectedWeekDay || todayWorkout || (weekWorkouts.length > 0 ? weekWorkouts[0] : null);
  const displayExercises = selectedWeekDay ? selectedExercises : (todayWorkout ? todayExercises : (weekWorkouts.length > 0 ? parseExercises(weekWorkouts[0]) : []));

  const isRestDay = displayWorkout?.name?.includes('Recovery') ?? false;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.systemTag}>COMBAT TRAINING</Text>
            <Text style={styles.title}>TRAINING GROUNDS</Text>
          </View>
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.addBtnText}>+ LOG ACTIVITY</Text>
          </TouchableOpacity>
        </View>

        {/* 1. PLAN PROGRESS HEADER */}
        {progress ? (
          <View style={styles.planProgressCard}>
            <View style={styles.planProgressTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.planProgressTag}>
                  {progress.planType === '100day' ? '⚡' : '👑'} {progress.planName.toUpperCase()}
                </Text>
                <Text style={styles.planProgressPhase}>
                  Phase: {progress.phase} — {progress.difficulty.toUpperCase()}
                </Text>
              </View>
              <View style={styles.dayCounter}>
                <Text style={styles.dayCounterNum}>{progress.currentDay}</Text>
                <Text style={styles.dayCounterSlash}>/ {progress.totalDays}</Text>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(100, progress.progressPercent)}%` },
                  ]}
                />
              </View>
              <Text style={styles.progressBarLabel}>
                WEEK {progress.currentWeek} OF {progress.totalWeeks} • {progress.completedCount} WORKOUTS COMPLETED ({progress.progressPercent}%)
              </Text>
            </View>
          </View>
        ) : (
          /* NO PLAN ACTIVE — ONE-TAP QUICK ACTIVATION */
          <View style={styles.noPlanCard}>
            <Text style={styles.noPlanEmoji}>⚔️</Text>
            <Text style={styles.noPlanTitle}>NO TRAINING PROTOCOL ACTIVE</Text>
            <Text style={styles.noPlanSub}>
              Select an official Hunter Training Program to generate and view your daily home workout plans mapped by dates:
            </Text>

            <View style={styles.quickActivateRow}>
              <TouchableOpacity
                style={[styles.quickActivateBtn, activating && { opacity: 0.6 }]}
                onPress={() => handleQuickActivate('100day')}
                disabled={activating}
                activeOpacity={0.8}
              >
                <Text style={styles.quickActivateBadge}>⚡ 100 DAYS</Text>
                <Text style={styles.quickActivateTitle}>SHADOW AWAKENING</Text>
                <Text style={styles.quickActivateDesc}>14 Weeks • Foundation to Power</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.quickActivateBtn, styles.quickActivateBtnMonarch, activating && { opacity: 0.6 }]}
                onPress={() => handleQuickActivate('365day')}
                disabled={activating}
                activeOpacity={0.8}
              >
                <Text style={[styles.quickActivateBadge, { color: '#FFAA00' }]}>👑 365 DAYS</Text>
                <Text style={styles.quickActivateTitle}>MONARCH'S ASCENSION</Text>
                <Text style={styles.quickActivateDesc}>52 Weeks • E-Rank to S-Rank</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.fullCalibrationLink}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.7}
            >
              <Text style={styles.fullCalibrationLinkText}>
                ⚙️ RUN FULL SYSTEM BODY CALIBRATION →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. WEEK VIEW & DATE-BASED SCHEDULE */}
        {progress && (
          <View style={styles.weekSection}>
            <View style={styles.weekHeader}>
              <View style={styles.weekNavGroup}>
                <TouchableOpacity
                  style={[styles.weekNavBtn, viewWeek <= 1 && styles.weekNavBtnDisabled]}
                  onPress={handlePrevWeek}
                  disabled={viewWeek <= 1}
                >
                  <Text style={styles.weekNavBtnText}>◀</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>
                  WEEK {viewWeek} OF {progress.totalWeeks}
                </Text>

                <TouchableOpacity
                  style={[styles.weekNavBtn, viewWeek >= progress.totalWeeks && styles.weekNavBtnDisabled]}
                  onPress={handleNextWeek}
                  disabled={viewWeek >= progress.totalWeeks}
                >
                  <Text style={styles.weekNavBtnText}>▶</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={() => setShowCalendar(!showCalendar)} activeOpacity={0.7}>
                <Text style={styles.calendarToggle}>
                  {showCalendar ? '▲ HIDE' : '▼ MONTH GRID'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* 7-Day Week Bar */}
            <View style={styles.weekBar}>
              {Array.from({ length: 7 }, (_, i) => {
                const dayInWeek = i + 1;
                const workout = weekWorkouts.find(
                  (w) => ((w.day - 1) % 7) + 1 === dayInWeek
                );
                const isCompleted = workout ? completedIds.has(workout.id) : false;
                const isToday = workout?.id === todayWorkout?.id;
                const isSelected = displayWorkout?.id === workout?.id;
                const isRest = workout?.name?.includes('Recovery') ?? (dayInWeek === 7);

                const dayNum = workout ? workout.day : (viewWeek - 1) * 7 + dayInWeek;

                return (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.weekDayCell,
                      isToday && styles.weekDayCellToday,
                      isSelected && styles.weekDayCellSelected,
                      isCompleted && styles.weekDayCellDone,
                    ]}
                    onPress={() => {
                      if (workout) {
                        setSelectedWeekDay(workout);
                      }
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.weekDayLabel,
                        isToday && styles.weekDayLabelToday,
                        isSelected && styles.weekDayLabelSelected,
                        isCompleted && styles.weekDayLabelDone,
                      ]}
                    >
                      {WEEKDAY_NAMES[i]}
                    </Text>

                    <Text style={[styles.weekDayNum, isSelected && styles.weekDayNumSelected]}>
                      D{dayNum}
                    </Text>

                    <View
                      style={[
                        styles.weekDayDot,
                        isCompleted
                          ? styles.weekDayDotDone
                          : isToday
                          ? styles.weekDayDotToday
                          : isRest
                          ? styles.weekDayDotRest
                          : styles.weekDayDotFuture,
                      ]}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* MONTHLY CALENDAR GRID (Interactive — Tap any day to view workout) */}
            {showCalendar && progress && (
              <View style={styles.calendarGrid}>
                <Text style={styles.calendarTitle}>
                  MONTH {Math.ceil(viewWeek / 4)} CALENDAR (TAP DAY TO VIEW)
                </Text>
                <View style={styles.calendarWeekLabels}>
                  {WEEKDAY_NAMES.map((d, i) => (
                    <Text key={i} style={styles.calendarWeekLabel}>
                      {d[0]}
                    </Text>
                  ))}
                </View>
                <View style={styles.calendarDays}>
                  {Array.from({ length: 28 }, (_, i) => {
                    const monthStartWeek = Math.floor((viewWeek - 1) / 4) * 4 + 1;
                    const dayNum = (monthStartWeek - 1) * 7 + i + 1;
                    const isInPlan = dayNum >= 1 && dayNum <= progress.totalDays;
                    const isCurrent = dayNum === progress.currentDay;
                    const isSelected = displayWorkout?.day === dayNum;
                    const wId = `${progress.planType}-d${dayNum}`;
                    const isDone = completedIds.has(wId);

                    return (
                      <TouchableOpacity
                        key={i}
                        style={[
                          styles.calendarDayCell,
                          isCurrent && styles.calendarDayCurrent,
                          isSelected && styles.calendarDaySelected,
                          isDone && styles.calendarDayDone,
                          !isInPlan && styles.calendarDayOutside,
                        ]}
                        disabled={!isInPlan}
                        onPress={() => handleSelectDayNumber(dayNum)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.calendarDayNum,
                            isCurrent && styles.calendarDayNumCurrent,
                            isSelected && styles.calendarDayNumSelected,
                            isDone && styles.calendarDayNumDone,
                            !isInPlan && styles.calendarDayNumOutside,
                          ]}
                        >
                          {isInPlan ? dayNum : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </View>
        )}

        {/* 3. WORKOUT DETAILS CARD (Shows Workout Plan for Selected Day / Today) */}
        {displayWorkout && (
          <View style={styles.section}>
            <View style={styles.workoutHeaderRow}>
              <Text style={styles.sectionTitle}>
                {displayWorkout.id === todayWorkout?.id
                  ? `TODAY'S WORKOUT // ${getDayDateLabel(displayWorkout.day, profile?.plan_start_date)}`
                  : `DAY ${displayWorkout.day} PLAN // ${getDayDateLabel(displayWorkout.day, profile?.plan_start_date)}`}
              </Text>
              {selectedWeekDay && (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedWeekDay(null);
                    if (progress) setViewWeek(progress.currentWeek);
                  }}
                >
                  <Text style={styles.returnTodayLink}>RESET TO TODAY ↺</Text>
                </TouchableOpacity>
              )}
            </View>

            <View
              style={[
                styles.todayWorkoutCard,
                isRestDay && styles.todayWorkoutCardRest,
              ]}
            >
              <View style={styles.todayWorkoutHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.todayWorkoutPhase}>
                    {displayWorkout.difficulty?.toUpperCase()} • WEEK {displayWorkout.week} (DAY {displayWorkout.day})
                  </Text>
                  <Text style={styles.todayWorkoutName}>
                    {displayWorkout.name}
                  </Text>
                </View>
                <View style={styles.todayXpBadge}>
                  <Text style={styles.todayXpText}>
                    +{displayWorkout.xp_value} XP
                  </Text>
                </View>
              </View>

              {/* Exercises List */}
              <View style={styles.exerciseList}>
                <Text style={styles.exerciseListTitle}>DAILY HOME ROUTINE (NO EQUIPMENT):</Text>
                {displayExercises.map((ex: any, idx: number) => (
                  <View key={idx} style={styles.exerciseRow}>
                    <Text style={styles.exerciseBullet}>▸</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exerciseText}>
                        <Text style={styles.exerciseTextBold}>{ex.name}</Text>
                        {ex.sets
                          ? ` — ${ex.sets} Sets × ${ex.reps ?? `${ex.duration_min} min`}`
                          : ex.duration_min
                          ? ` — ${ex.duration_min} Minutes`
                          : ''}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>

              {/* Completion Action */}
              {!completedIds.has(displayWorkout.id) ? (
                <TouchableOpacity
                  style={styles.completeWorkoutBtn}
                  onPress={() => handleCompleteWorkout(displayWorkout)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.completeWorkoutBtnText}>
                    ⚔️ COMPLETE WORKOUT (+{displayWorkout.xp_value} XP)
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedBadgeText}>✓ WORKOUT COMPLETED</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* 10,000 STEPS DAILY DIRECTIVE & MOTION TRACKER */}
        <StepTrackerCard onQuestClaimed={loadData} />

        {/* TODAY'S LOGGED ACTIVITIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MANUAL ACTIVITIES LOGGED ({activities.length})</Text>

          {activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text style={styles.emptyText}>No manual combat exercises logged today.</Text>
              <Text style={styles.emptySub}>Log running, lifting, or study to earn XP & burn calories.</Text>
            </View>
          ) : (
            activities.map((a) => {
              const statColor = StatColors[a.stat_affected] || '#00F0FF';
              return (
                <View key={a.id} style={styles.activityCard}>
                  <View style={styles.activityMain}>
                    <Text style={styles.activityTypeName}>{a.type.toUpperCase()}</Text>
                    <Text style={[styles.activityXP, { color: statColor }]}>
                      +{a.xp_earned} {a.stat_affected} XP
                    </Text>
                  </View>
                  <View style={styles.activityMeta}>
                    <Text style={styles.activityMetaText}>{a.duration_min} mins</Text>
                    <Text style={styles.activityMetaText}>🔥 -{Math.round(a.calories_burned)} kcal</Text>
                    <Text style={styles.activityMetaText}>MET: {a.met_value}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* LOG ACTIVITY MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>[ LOG COMBAT / STUDY ACTIVITY ]</Text>

            <ScrollView contentContainerStyle={styles.modalForm}>
              {/* ACTIVITY TYPE SELECTOR */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>ACTIVITY TYPE</Text>
                <View style={styles.typeGrid}>
                  {ACTIVITY_TYPE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.typeOption,
                        activityType === opt.value && styles.typeOptionActive,
                      ]}
                      onPress={() => setActivityType(opt.value)}
                    >
                      <Text style={styles.typeEmoji}>{opt.emoji}</Text>
                      <Text
                        style={[
                          styles.typeLabel,
                          activityType === opt.value && styles.typeLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>DURATION (MINUTES)</Text>
                <TextInput
                  style={styles.textInput}
                  keyboardType="numeric"
                  placeholder="30"
                  placeholderTextColor="#476285"
                  value={durationMin}
                  onChangeText={setDurationMin}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NOTES / DETAILS (OPTIONAL)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. 5km outdoors, morning pace"
                  placeholderTextColor="#476285"
                  value={description}
                  onChangeText={setDescription}
                />
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.createBtn} onPress={handleLogActivity}>
                <Text style={styles.createBtnText}>RECORD TRAINING</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* LOCKED XP CLAIM MODAL */}
      {pendingClaim && (
        <XPClaimModal
          visible={claimModalVisible}
          xpAmount={pendingClaim.xpAmount}
          stat={pendingClaim.stat}
          activityName={pendingClaim.name}
          calories={pendingClaim.calories}
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
    backgroundColor: '#070B14',
  },
  container: {
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.two,
  },
  systemTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 1,
  },
  addBtn: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addBtnText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },

  // --- Plan Progress Card ---
  planProgressCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 12,
  },
  planProgressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  planProgressTag: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00F0FF',
    letterSpacing: 1,
  },
  planProgressPhase: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    marginTop: 2,
  },
  dayCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dayCounterNum: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
  },
  dayCounterSlash: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: '#4B6282',
  },
  progressBarContainer: {
    gap: 4,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#0A1020',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#00A8FF',
    borderRadius: 3,
  },
  progressBarLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    letterSpacing: 0.5,
  },

  // --- Quick Activate Card (Fallback) ---
  noPlanCard: {
    backgroundColor: '#0D1424',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#19315A',
    padding: Spacing.four,
    alignItems: 'center',
    gap: 12,
  },
  noPlanEmoji: {
    fontSize: 32,
  },
  noPlanTitle: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1,
  },
  noPlanSub: {
    fontSize: 11,
    color: '#7A96BA',
    textAlign: 'center',
    lineHeight: 16,
  },
  quickActivateRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
    marginTop: 4,
  },
  quickActivateBtn: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1.5,
    borderColor: '#00A8FF',
    borderRadius: 10,
    padding: 12,
    gap: 4,
    alignItems: 'center',
  },
  quickActivateBtnMonarch: {
    borderColor: '#FFAA00',
  },
  quickActivateBadge: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00F0FF',
  },
  quickActivateTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#E0E8FF',
    textAlign: 'center',
  },
  quickActivateDesc: {
    fontSize: 9,
    color: '#556F91',
    textAlign: 'center',
  },
  fullCalibrationLink: {
    marginTop: 4,
    paddingVertical: 6,
  },
  fullCalibrationLinkText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 0.5,
  },

  // --- Week Section ---
  weekSection: {
    gap: Spacing.two,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weekNavGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  weekNavBtn: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weekNavBtnDisabled: {
    opacity: 0.3,
  },
  weekNavBtnText: {
    fontSize: 11,
    color: '#00A8FF',
    fontWeight: '900',
  },
  calendarToggle: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    fontWeight: '800',
  },
  weekBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  weekDayCell: {
    flex: 1,
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  weekDayCellToday: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  weekDayCellSelected: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.15)',
  },
  weekDayCellDone: {
    backgroundColor: 'rgba(0, 255, 136, 0.06)',
  },
  weekDayLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#556F91',
  },
  weekDayLabelToday: {
    color: '#00F0FF',
  },
  weekDayLabelSelected: {
    color: '#00A8FF',
  },
  weekDayLabelDone: {
    color: '#00FF88',
  },
  weekDayNum: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#7A96BA',
  },
  weekDayNumSelected: {
    color: '#E0E8FF',
  },
  weekDayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  weekDayDotDone: {
    backgroundColor: '#00FF88',
  },
  weekDayDotToday: {
    backgroundColor: '#00F0FF',
  },
  weekDayDotRest: {
    backgroundColor: '#2A3A5C',
  },
  weekDayDotFuture: {
    backgroundColor: '#1A2E50',
  },

  // --- Calendar Grid ---
  calendarGrid: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 10,
    padding: Spacing.three,
    gap: 8,
  },
  calendarTitle: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  calendarWeekLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calendarWeekLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#4B6282',
    fontWeight: '700',
    width: 28,
    textAlign: 'center',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 4,
  },
  calendarDayCell: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A1020',
  },
  calendarDayCurrent: {
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00F0FF',
  },
  calendarDaySelected: {
    backgroundColor: 'rgba(0, 168, 255, 0.25)',
    borderWidth: 1,
    borderColor: '#00A8FF',
  },
  calendarDayDone: {
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
  },
  calendarDayOutside: {
    backgroundColor: 'transparent',
  },
  calendarDayNum: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#556F91',
  },
  calendarDayNumCurrent: {
    color: '#00F0FF',
    fontWeight: '900',
  },
  calendarDayNumSelected: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  calendarDayNumDone: {
    color: '#00FF88',
  },
  calendarDayNumOutside: {
    color: 'transparent',
  },

  // --- Today's Workout Details ---
  section: {
    gap: Spacing.two,
  },
  workoutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  returnTodayLink: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00F0FF',
  },
  todayWorkoutCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#00A8FF',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 12,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  todayWorkoutCardRest: {
    borderColor: '#2A3A5C',
    shadowOpacity: 0,
  },
  todayWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  todayWorkoutPhase: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    letterSpacing: 1,
  },
  todayWorkoutName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E0E8FF',
    marginTop: 2,
  },
  todayXpBadge: {
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  todayXpText: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00F0FF',
  },
  exerciseList: {
    gap: 6,
    backgroundColor: '#090E1A',
    borderRadius: 8,
    padding: 10,
  },
  exerciseListTitle: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  exerciseRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'flex-start',
  },
  exerciseBullet: {
    fontSize: 11,
    color: '#00A8FF',
    marginTop: 1,
  },
  exerciseText: {
    fontSize: 12,
    color: '#A0BBE0',
    lineHeight: 16,
  },
  exerciseTextBold: {
    fontWeight: '800',
    color: '#E0E8FF',
  },
  completeWorkoutBtn: {
    backgroundColor: '#0055AA',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  completeWorkoutBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  completedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  completedBadgeText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#00FF88',
    letterSpacing: 1,
  },

  // --- Activities ---
  emptyCard: {
    backgroundColor: '#0D1424',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#162846',
    padding: Spacing.four,
    alignItems: 'center',
    gap: 6,
  },
  emptyEmoji: {
    fontSize: 28,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B0C8E8',
  },
  emptySub: {
    fontSize: 11,
    color: '#556F91',
    textAlign: 'center',
  },
  activityCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#1A2E50',
    borderRadius: 8,
    padding: Spacing.three,
    gap: 6,
  },
  activityMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTypeName: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  activityXP: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  activityMeta: {
    flexDirection: 'row',
    gap: 14,
  },
  activityMetaText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
  },

  // --- Modal ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalContent: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#00A8FF',
    borderRadius: 14,
    padding: Spacing.four,
    gap: Spacing.three,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    textAlign: 'center',
    letterSpacing: 1.5,
  },
  modalForm: {
    gap: Spacing.two,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#7A96BA',
    letterSpacing: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  typeOption: {
    width: '48%',
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#192E50',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeOptionActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A96BA',
  },
  typeLabelActive: {
    color: '#00F0FF',
  },
  textInput: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E0E8FF',
    fontFamily: Fonts.mono,
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: 4,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '700',
    color: '#7A96BA',
  },
  createBtn: {
    flex: 2,
    backgroundColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  createBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#070B14',
    letterSpacing: 1,
  },
});
