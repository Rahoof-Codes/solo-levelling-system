// ============================================================
// Step Tracker Hook — React Hook for 10k Steps & Motion Tracking
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { getTodaySteps, updateTodaySteps, getProfile, completeQuest } from '@/db/operations';
import { stepSensorService, type MotionData } from '@/services/stepSensor';
import { type DailySteps, type Quest } from '@/types';

export function useStepTracker() {
  const db = useSQLiteContext();

  const [stepsData, setStepsData] = useState<DailySteps>({
    id: '',
    date: new Date().toISOString().split('T')[0],
    steps: 0,
    target_steps: 10000,
    distance_km: 0,
    calories_burned: 0,
    is_goal_reached: 0,
    updated_at: new Date().toISOString(),
    synced: 0,
  });

  const [motion, setMotion] = useState<MotionData>({
    isMoving: false,
    intensity: 0,
    cadenceSPM: 0,
    hardwareAvailable: false,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [associatedQuest, setAssociatedQuest] = useState<Quest | null>(null);

  const stepsRef = useRef<number>(0);
  const dbSyncTimerRef = useRef<any>(null);
  const heightRef = useRef<number>(175);
  const weightRef = useRef<number>(70);

  // 1. Load initial steps from database
  const loadDatabaseSteps = useCallback(async () => {
    try {
      const profile = await getProfile(db);
      if (profile) {
        if (profile.height_cm) heightRef.current = profile.height_cm;
        if (profile.weight_kg) weightRef.current = profile.weight_kg;
      }

      const today = await getTodaySteps(db);
      stepsRef.current = today.steps;
      setStepsData(today);

      // Check for 10k steps quest for today
      const todayStr = new Date().toISOString().split('T')[0];
      const quest = await db.getFirstAsync<Quest>(
        "SELECT * FROM quests WHERE due_date = ? AND title LIKE '%10,000 Steps%' LIMIT 1;",
        [todayStr]
      );
      setAssociatedQuest(quest);
      associatedQuestRef.current = quest;
    } catch (err) {
      console.error('[useStepTracker] Failed to load step record:', err);
    } finally {
      setIsLoading(false);
    }
  }, [db]);

  const associatedQuestRef = useRef<Quest | null>(null);

  // 2. Persist step updates to SQLite (debounced)
  const syncStepsToDatabase = useCallback(
    async (currentSteps: number) => {
      try {
        const dist = stepSensorService.calculateDistanceKm(currentSteps, heightRef.current);
        const cal = stepSensorService.calculateCalories(currentSteps, weightRef.current);

        const { stepRecord, goalJustReached } = await updateTodaySteps(db, currentSteps, dist, cal);
        setStepsData(stepRecord);

        // If 10k goal was reached and quest is not yet completed, refresh quest info
        const q = associatedQuestRef.current;
        if (goalJustReached || (stepRecord.is_goal_reached && q && !q.is_completed)) {
          const todayStr = new Date().toISOString().split('T')[0];
          const quest = await db.getFirstAsync<Quest>(
            "SELECT * FROM quests WHERE due_date = ? AND title LIKE '%10,000 Steps%' LIMIT 1;",
            [todayStr]
          );
          setAssociatedQuest(quest);
          associatedQuestRef.current = quest;
        }
      } catch (err) {
        console.error('[useStepTracker] Error saving steps to database:', err);
      }
    },
    [db]
  );

  // 3. Listen to motion & step updates from StepSensorService
  useEffect(() => {
    loadDatabaseSteps();

    const handleStepUpdate = (stepIncrement: number, _totalLiveSteps: number, motionData: MotionData) => {
      setMotion(motionData);

      if (stepIncrement > 0) {
        const newTotal = stepsRef.current + stepIncrement;
        stepsRef.current = newTotal;

        const dist = stepSensorService.calculateDistanceKm(newTotal, heightRef.current);
        const cal = stepSensorService.calculateCalories(newTotal, weightRef.current);

        setStepsData((prev) => ({
          ...prev,
          steps: newTotal,
          distance_km: dist,
          calories_burned: cal,
          is_goal_reached: newTotal >= (prev.target_steps || 10000) ? 1 : 0,
        }));

        // Debounce database sync to 1 second
        if (dbSyncTimerRef.current) {
          clearTimeout(dbSyncTimerRef.current);
        }
        dbSyncTimerRef.current = setTimeout(() => {
          syncStepsToDatabase(newTotal);
        }, 1000);
      }
    };

    stepSensorService.startTracking(handleStepUpdate);

    return () => {
      stepSensorService.stopTracking(handleStepUpdate);
      if (dbSyncTimerRef.current) {
        clearTimeout(dbSyncTimerRef.current);
        syncStepsToDatabase(stepsRef.current);
      }
    };
  }, [loadDatabaseSteps, syncStepsToDatabase]);

  // 4. Manually simulate steps for testing
  const simulateSteps = useCallback(
    (count: number) => {
      stepSensorService.simulateSteps(count);
    },
    []
  );

  // 5. Claim XP for the 10,000 Steps Quest
  const claim10kStepsQuest = useCallback(async () => {
    if (!associatedQuest || associatedQuest.is_completed) {
      return { success: false, message: 'Quest already claimed or unavailable' };
    }

    if (stepsData.steps < (stepsData.target_steps || 10000)) {
      return { success: false, message: `Reach 10,000 steps to claim (current: ${stepsData.steps.toLocaleString()})` };
    }

    try {
      const { quest, xpResult } = await completeQuest(db, associatedQuest.id);
      setAssociatedQuest(quest);
      return { success: true, xpResult };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Failed to claim 10k steps quest XP' };
    }
  }, [associatedQuest, stepsData, db]);

  const targetSteps = stepsData.target_steps || 10000;
  const progress = Math.min(1, Math.max(0, stepsData.steps / targetSteps));
  const isGoalReached = stepsData.steps >= targetSteps;

  return {
    steps: stepsData.steps,
    targetSteps,
    progress,
    distanceKm: stepsData.distance_km,
    caloriesBurned: stepsData.calories_burned,
    isGoalReached,
    motion,
    isLoading,
    associatedQuest,
    simulateSteps,
    refreshSteps: loadDatabaseSteps,
    claim10kStepsQuest,
  };
}
