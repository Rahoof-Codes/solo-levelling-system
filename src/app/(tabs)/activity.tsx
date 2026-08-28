import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from 'expo-router';
import {
  getWorkoutPlans,
  getWorkoutsForPlan,
  completeWorkoutWithoutXP,
  claimWorkoutXP,
  logActivityWithoutXP,
  claimActivityXP,
  getTodayActivities,
} from '@/db/operations';
import {
  type WorkoutPlan,
  type Workout,
  type Activity,
  ActivityType,
  Stat,
} from '@/types';
import { ACTIVITY_TYPE_OPTIONS } from '@/lib/calculations/met';
import { StatColors, Fonts, Spacing } from '@/constants/theme';
import { XPClaimModal } from '@/components/xp-claim-modal';

interface PendingClaim {
  id: string;
  type: 'activity' | 'workout';
  name: string;
  xpAmount: number;
  stat: Stat;
  calories?: number;
}

export default function ActivityScreen() {
  const db = useSQLiteContext();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [refreshing, setRefreshing] = useState(false);

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
      const p = await getWorkoutPlans(db);
      setPlans(p);

      const activePlanId = selectedPlanId || p[0]?.id || null;
      if (activePlanId) {
        setSelectedPlanId(activePlanId);
        const w = await getWorkoutsForPlan(db, activePlanId);
        setWorkouts(w);
      }

      const a = await getTodayActivities(db);
      setActivities(a);
    } catch (err) {
      console.error('Error loading training data:', err);
    }
  }, [db, selectedPlanId]);

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

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlanId(planId);
    const w = await getWorkoutsForPlan(db, planId);
    setWorkouts(w);
  };

  const handleCompleteWorkout = async (workout: Workout) => {
    try {
      const { pendingXP } = await completeWorkoutWithoutXP(db, workout.id);
      await loadData();

      // Open locked XP modal
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

      // Open locked XP modal
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

        {/* WORKOUT PLANS TABS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SEEDED WORKOUT PLANS</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planTabs}>
            {plans.map((p) => {
              const isSelected = p.id === selectedPlanId;
              const stats: Stat[] = JSON.parse(p.focus_stats || '[]');
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.planTab, isSelected && styles.planTabActive]}
                  onPress={() => handleSelectPlan(p.id)}
                >
                  <Text style={[styles.planTabName, isSelected && styles.planTabNameActive]}>
                    {p.name}
                  </Text>
                  <Text style={styles.planTabStats}>{stats.join(' / ')}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* WORKOUTS IN SELECTED PLAN */}
          <View style={styles.workoutList}>
            {workouts.slice(0, 4).map((w) => {
              const exercises = JSON.parse(w.exercises_json || '[]');
              const stats: Stat[] = JSON.parse(w.stats || '["STR"]');
              const primaryStat = stats[0] || Stat.STR;
              const statColor = StatColors[primaryStat] || '#00F0FF';

              return (
                <View key={w.id} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutName}>{w.name}</Text>
                    <View style={[styles.statPill, { borderColor: statColor }]}>
                      <Text style={[styles.statPillText, { color: statColor }]}>
                        +{w.xp_value} XP
                      </Text>
                    </View>
                  </View>

                  <View style={styles.exerciseList}>
                    {exercises.map((ex: any, idx: number) => (
                      <Text key={idx} style={styles.exerciseText}>
                        • {ex.name} {ex.sets ? `(${ex.sets}×${ex.reps ?? `${ex.duration_min}m`})` : ''}
                      </Text>
                    ))}
                  </View>

                  <TouchableOpacity
                    style={styles.completeWorkoutBtn}
                    onPress={() => handleCompleteWorkout(w)}
                  >
                    <Text style={styles.completeWorkoutBtnText}>COMPLETE WORKOUT →</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* TODAY'S LOGGED ACTIVITIES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY'S ACTIVITIES ({activities.length})</Text>

          {activities.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyEmoji}>⚡</Text>
              <Text style={styles.emptyText}>No manual exercises logged today.</Text>
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
    gap: Spacing.four,
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
  section: {
    gap: Spacing.two,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  planTabs: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingVertical: 4,
  },
  planTab: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#1A2E50',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 2,
  },
  planTabActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
  },
  planTabName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#A0BBE0',
  },
  planTabNameActive: {
    color: '#00F0FF',
  },
  planTabStats: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
  },
  workoutList: {
    gap: Spacing.two,
    marginTop: 6,
  },
  workoutCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 10,
    padding: Spacing.three,
    gap: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#E0E8FF',
  },
  statPill: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#090E1A',
  },
  statPillText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  exerciseList: {
    gap: 3,
  },
  exerciseText: {
    fontSize: 12,
    color: '#7A96BA',
  },
  completeWorkoutBtn: {
    backgroundColor: '#0055AA',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  completeWorkoutBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
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
