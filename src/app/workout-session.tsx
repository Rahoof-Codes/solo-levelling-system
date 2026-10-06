// ============================================================
// Workout Session Page — Guided Workout Screen (Figma #2:12841)
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import type { Workout, Profile, Stat } from '@/types';
import {
  getWorkoutById,
  getTodayWorkout,
  getProfile,
  completeWorkoutWithoutXP,
  claimWorkoutXP,
} from '@/db/operations';
import { GuidedWorkoutView } from '@/components/guided-workout-view';
import { XPClaimModal } from '@/components/xp-claim-modal';
import { Fonts } from '@/constants/theme';

export default function WorkoutSessionScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { workoutId } = useLocalSearchParams<{ workoutId?: string }>();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);

  // Claim XP modal state
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [pendingClaim, setPendingClaim] = useState<{
    id: string;
    name: string;
    xpAmount: number;
    stat: Stat;
  } | null>(null);
  const [claimResult, setClaimResult] = useState<{
    leveledUp: boolean;
    newLevel: number;
    rankChanged: boolean;
  } | null>(null);

  // Load workout data
  useEffect(() => {
    async function loadWorkout() {
      try {
        setLoading(true);
        if (workoutId) {
          const w = await getWorkoutById(db, workoutId);
          if (w) {
            setWorkout(w);
            setLoading(false);
            return;
          }
        }

        // Fallback to today's workout
        const profile = await getProfile(db);
        if (profile?.plan_start_date) {
          const today = await getTodayWorkout(db, profile.plan_start_date);
          if (today) {
            setWorkout(today);
            setLoading(false);
            return;
          }
        }

        // Default fallback mock if database has no active workout
        setWorkout({
          id: 'default-session',
          plan_id: 'default',
          name: 'Upper Body Ascension',
          week: 1,
          day: 1,
          exercises_json: JSON.stringify([
            { name: 'Incline dumbbell press', sets: 4, reps: 10 },
            { name: 'Single-arm cable row', sets: 4, reps: 12 },
            { name: 'Push-ups', sets: 3, reps: 15 },
            { name: 'Superman Hold', sets: 3, duration_min: 0.5 },
          ]),
          difficulty: 'intermediate',
          xp_value: 65,
          stats: '["STR","VIT"]',
          updated_at: new Date().toISOString(),
          synced: 0,
        });
      } catch (err) {
        console.error('[WorkoutSession] Error loading workout:', err);
      } finally {
        setLoading(false);
      }
    }

    loadWorkout();
  }, [db, workoutId]);

  // Complete workout flow
  const handleComplete = useCallback(
    async (durationActual: number) => {
      if (!workout) return;

      try {
        if (workout.id !== 'default-session') {
          const { pendingXP } = await completeWorkoutWithoutXP(
            db,
            workout.id,
            durationActual
          );
          setPendingClaim({
            id: workout.id,
            name: workout.name,
            xpAmount: pendingXP.xp,
            stat: pendingXP.stat,
          });
          setClaimModalVisible(true);
        } else {
          router.replace('/(tabs)/activity');
        }
      } catch (err) {
        console.error('[WorkoutSession] Failed to complete workout:', err);
        router.replace('/(tabs)/activity');
      }
    },
    [db, workout, router]
  );

  const handleClaimXP = async () => {
    if (!pendingClaim) return;

    try {
      const xpResult = await claimWorkoutXP(
        db,
        pendingClaim.id,
        pendingClaim.stat,
        pendingClaim.xpAmount
      );
      setClaimResult({
        leveledUp: xpResult.leveledUp,
        newLevel: xpResult.newProfile.level,
        rankChanged: xpResult.rankChanged,
      });
    } catch (err) {
      console.error('[WorkoutSession] Error claiming XP:', err);
      setClaimModalVisible(false);
      router.replace('/(tabs)/activity');
    }
  };

  const handleDismissClaim = () => {
    setClaimModalVisible(false);
    setPendingClaim(null);
    setClaimResult(null);
    router.replace('/(tabs)/activity');
  };

  const handleCancel = useCallback(() => {
    router.replace('/(tabs)/activity');
  }, [router]);

  if (loading || !workout) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#20C8FF" />
        <Text style={styles.loadingText}>INITIALIZING TRAINING PROTOCOL...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <GuidedWorkoutView
        workout={workout}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />

      {pendingClaim && (
        <XPClaimModal
          visible={claimModalVisible}
          activityName={pendingClaim.name}
          subtitle="TRAINING PROTOCOL"
          xpAmount={pendingClaim.xpAmount}
          stat={pendingClaim.stat}
          completionTagText="SESSION CLEAR"
          completionCountText="COMPLETED"
          onClaim={handleClaimXP}
          onDismiss={handleDismissClaim}
          claimResult={claimResult}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050611',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#050611',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 12,
    color: '#20C8FF',
    letterSpacing: 1,
  },
});
