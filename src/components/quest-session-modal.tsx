// ============================================================
// Quest Session Modal — Replaced with Solo System Guided Workout & Timer
// Completely replaces old timer style with the new Figma-matching
// Guided Workout view (Node #2:12841) featuring circular SVG rest timer dial,
// animated session progress track, sets tracking, and exercise demonstrations.
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import type { Quest, Workout, Exercise } from '@/types';
import { GuidedWorkoutView } from '@/components/guided-workout-view';
import { StudyFocusView } from '@/components/study-focus-view';
import { getProfile, getTodayWorkout } from '@/db/operations';
import { isStudyQuest } from '@/lib/calculations/workout-duration';

interface QuestSessionModalProps {
  visible: boolean;
  quest: Quest | null;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
}

/**
 * Convert a Quest into a structured Workout object that feeds the GuidedWorkoutView.
 */
function convertQuestToWorkout(quest: Quest, todayWorkout?: Workout | null): Workout {
  const title = (quest.title || '').toLowerCase();
  let exercises: Exercise[] = [];

  // If this is a general workout quest and the user has a workout scheduled today, use it!
  if (
    todayWorkout &&
    (title.includes('workout') || title.includes('session') || title.includes('circuit'))
  ) {
    try {
      const parsed = JSON.parse(todayWorkout.exercises_json || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        exercises = parsed;
      }
    } catch {}
  }

  // If no scheduled exercises were used, map intelligently by quest title
  if (exercises.length === 0) {
    if (title.includes('push-up') || title.includes('pushup')) {
      exercises = [
        { name: 'Push-ups', sets: 4, reps: 25 },
        { name: 'Diamond Push-ups', sets: 2, reps: 15 },
        { name: 'Decline Push-ups', sets: 2, reps: 15 },
      ];
    } else if (title.includes('sit-up') || title.includes('situp') || title.includes('core') || title.includes('abs')) {
      exercises = [
        { name: 'Crunches', sets: 4, reps: 25 },
        { name: 'Bicycle Crunches', sets: 3, reps: 20 },
        { name: 'Plank', sets: 3, duration_min: 0.75 },
      ];
    } else if (title.includes('squat') || title.includes('leg')) {
      exercises = [
        { name: 'Bodyweight Squats', sets: 4, reps: 25 },
        { name: 'Jump Squats', sets: 3, reps: 15 },
        { name: 'Walking Lunges', sets: 3, reps: 12 },
      ];
    } else if (title.includes('run') || title.includes('cardio')) {
      exercises = [
        { name: 'Jumping Jacks', sets: 3, reps: 30 },
        { name: 'Mountain Climbers', sets: 3, reps: 30 },
        { name: 'Burpees', sets: 3, reps: 15 },
      ];
    } else if (title.includes('workout') || title.includes('strength') || title.includes('training')) {
      // 30-Minute Workout default protocol circuit
      exercises = [
        { name: 'Incline dumbbell press', sets: 4, reps: 10 },
        { name: 'Single-arm cable row', sets: 4, reps: 12 },
        { name: 'Push-ups', sets: 3, reps: 15 },
        { name: 'Bodyweight Squats', sets: 3, reps: 20 },
        { name: 'Superman Hold', sets: 3, duration_min: 0.5 },
      ];
    } else {
      // Generic objective / custom quest
      exercises = [
        { name: quest.title, sets: 3, reps: 12 },
      ];
    }
  }

  return {
    id: quest.id,
    plan_id: 'daily-quest',
    name: quest.title.toUpperCase(),
    week: 1,
    day: 1,
    exercises_json: JSON.stringify(exercises),
    difficulty: 'intermediate',
    xp_value: quest.xp_reward,
    stats: JSON.stringify([quest.stat_affected]),
    updated_at: new Date().toISOString(),
    synced: 1,
  };
}

export function QuestSessionModal({
  visible,
  quest,
  onComplete,
  onCancel,
}: QuestSessionModalProps) {
  const db = useSQLiteContext();
  const [todayWorkout, setTodayWorkout] = useState<Workout | null>(null);

  // Attempt to link to today's workout if available
  useEffect(() => {
    let isMounted = true;
    async function loadTodayWorkout() {
      if (!quest) return;
      const lower = (quest.title || '').toLowerCase();
      if (lower.includes('workout') || lower.includes('session') || lower.includes('circuit')) {
        try {
          const profile = await getProfile(db);
          if (profile?.plan_start_date) {
            const w = await getTodayWorkout(db, profile.plan_start_date);
            if (isMounted && w) {
              setTodayWorkout(w);
            }
          }
        } catch (err) {
          console.warn('[QuestSessionModal] Could not fetch today workout:', err);
        }
      }
    }

    if (visible && quest) {
      loadTodayWorkout();
    }

    return () => {
      isMounted = false;
    };
  }, [db, quest, visible]);

  const workout: Workout | null = useMemo(() => {
    if (!quest) return null;
    return convertQuestToWorkout(quest, todayWorkout);
  }, [quest, todayWorkout]);

  if (!visible || !quest) return null;

  const isStudy = isStudyQuest(quest);
  if (!isStudy && !workout) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      transparent={false}
      onRequestClose={onCancel}
    >
      <View style={styles.container}>
        {isStudy ? (
          <StudyFocusView
            quest={quest}
            onComplete={onComplete}
            onCancel={onCancel}
          />
        ) : (
          workout && (
            <GuidedWorkoutView
              workout={workout}
              onComplete={onComplete}
              onCancel={onCancel}
            />
          )
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050611',
  },
});
