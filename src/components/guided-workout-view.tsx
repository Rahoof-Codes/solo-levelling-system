// ============================================================
// Guided Workout View — Figma Node #2:12841
// Pixel-perfect guided workout interface with dynamic player data,
// exercise GIF display, circular rest timer dial, sets table,
// animated workout controls, and 'up next' preview.
// ============================================================

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Vibration,
  Platform,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import type { Exercise, Workout } from '@/types';
import { Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';
import { getExerciseMetadata } from '@/lib/workoutGifs';
import { formatTimerDisplay } from '@/lib/calculations/workout-duration';
import { calculateCaloriesBurned } from '@/lib/calculations/met';
import { speakVoiceGuidance } from '@/services/voiceGuidance';
import { WorkoutIntroOverlay } from '@/components/workout-intro-overlay';
import { isRecoveryWorkout } from '@/lib/workoutVideos';

interface GuidedWorkoutViewProps {
  workout: Workout;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
  autoPlayIntro?: boolean;
  isRecovery?: boolean;
}

interface SetRecord {
  setNumber: number;
  load: string;
  reps: number;
  isDone: boolean;
}

interface CompletedSetLog {
  exerciseName: string;
  setNumber: number;
  durationSec: number;
  caloriesBurned: number;
}

export function GuidedWorkoutView({
  workout,
  onComplete,
  onCancel,
  autoPlayIntro = true,
  isRecovery: isRecoveryProp,
}: GuidedWorkoutViewProps) {
  const { playTouchSound, playClaimSound } = useAudio();

  // Determine whether this is an active recovery day or regular training session
  const isRecovery = useMemo(() => {
    if (typeof isRecoveryProp === 'boolean') return isRecoveryProp;
    return isRecoveryWorkout(workout);
  }, [isRecoveryProp, workout]);

  // Intro video overlay state (plays before workout begins)
  const [showIntro, setShowIntro] = useState(autoPlayIntro);

  // Parse exercises from workout
  const exercises: Exercise[] = useMemo(() => {
    try {
      const parsed = JSON.parse(workout?.exercises_json || '[]');
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch {}
    // Fallback if empty or rest day
    return [
      { name: 'Superman Hold', sets: 3, duration_min: 0.5 },
      { name: 'Prone Y-Raises', sets: 3, reps: 12 },
      { name: 'Towel Rows (Door)', sets: 3, reps: 10 },
      { name: 'Reverse Snow Angels', sets: 3, reps: 12 },
    ];
  }, [workout?.exercises_json]);

  // ── Circuit-rotation state ──
  // Instead of finishing all sets of one exercise before moving on,
  // we rotate: 1 set of Ex A → rest → 1 set of Ex B → rest → … → loop.
  // `currentExerciseIdx` = which exercise is active right now
  // `completedSetsPerExercise` tracks how many sets each exercise has finished
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);

  // Initialize set data for ALL exercises up-front so the circuit can jump between them
  const [allSetsData, setAllSetsData] = useState<Record<number, SetRecord[]>>({});
  const [completedSetsPerExercise, setCompletedSetsPerExercise] = useState<Record<number, number>>({});

  // Derived: which set number we're on for the *current* exercise
  const currentSetIdx = completedSetsPerExercise[currentExerciseIdx] ?? 0;

  // Session elapsed timer (counts up) — paused while intro video plays, starts automatically once intro ends
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(autoPlayIntro);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest timer (counts down after each set) — 20 seconds between circuit rotations
  const REST_BETWEEN_CIRCUIT = 20;
  const [isResting, setIsResting] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(REST_BETWEEN_CIRCUIT);
  const [restDurationTotal, setRestDurationTotal] = useState(REST_BETWEEN_CIRCUIT);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Per-set timer: tracks when the current set started so we can log duration
  const setStartTimeRef = useRef<number>(Date.now());
  const [completedSetLogs, setCompletedSetLogs] = useState<CompletedSetLog[]>([]);

  // Menu modal
  const [menuVisible, setMenuVisible] = useState(false);

  // Animation values
  const completeBtnGlow = useSharedValue(0);
  const nowPulse = useSharedValue(1);

  // Current exercise data
  const currentExercise = exercises[currentExerciseIdx] || exercises[0];
  const metadata = useMemo(
    () => getExerciseMetadata(currentExercise?.name || ''),
    [currentExercise?.name]
  );

  const totalSetsForCurrent = currentExercise?.sets || 3;
  const currentSets = allSetsData[currentExerciseIdx] || [];

  // Initialize sets for ALL exercises on mount so data is ready when circuit rotates
  useEffect(() => {
    setAllSetsData((prev) => {
      const updated = { ...prev };
      exercises.forEach((ex, idx) => {
        if (!updated[idx]) {
          const exMeta = getExerciseMetadata(ex?.name || '');
          const sets = ex?.sets || 3;
          const defaultReps = ex?.reps || (ex?.duration_min ? Math.round(ex.duration_min * 60) : 10);
          updated[idx] = Array.from({ length: sets }, (_, i) => ({
            setNumber: i + 1,
            load: exMeta.defaultLoad,
            reps: defaultReps,
            isDone: false,
          }));
        }
      });
      return updated;
    });
  }, [exercises]);

  // ── Circuit helpers ──
  // Total sets completed across all exercises
  const totalSetsCompleted = useMemo(() =>
    Object.values(completedSetsPerExercise).reduce((a, b) => a + b, 0),
    [completedSetsPerExercise]
  );
  const totalSetsInWorkout = useMemo(() =>
    exercises.reduce((sum, ex) => sum + (ex?.sets || 3), 0),
    [exercises]
  );

  // Find the next exercise in the circuit that still has sets remaining
  const findNextCircuitExercise = useCallback((afterIdx: number): number | null => {
    const totalEx = exercises.length;
    for (let offset = 1; offset <= totalEx; offset++) {
      const candidate = (afterIdx + offset) % totalEx;
      const doneSets = completedSetsPerExercise[candidate] ?? 0;
      const maxSets = exercises[candidate]?.sets || 3;
      if (doneSets < maxSets) return candidate;
    }
    return null; // all exercises done
  }, [exercises, completedSetsPerExercise]);

  // Next exercise data for 'Up next' card
  const nextCircuitIdx = useMemo(() => findNextCircuitExercise(currentExerciseIdx), [findNextCircuitExercise, currentExerciseIdx]);
  const hasNextExercise = nextCircuitIdx !== null;
  const nextExercise = hasNextExercise ? exercises[nextCircuitIdx!] : null;

  // Intro video completion handler — auto-starts timer and announces exercise
  const handleIntroFinish = useCallback(() => {
    setShowIntro(false);
    setIsPaused(false);
    speakVoiceGuidance(`Protocol initiated. Exercise 1: ${currentExercise.name}`);
    playTouchSound();
  }, [currentExercise.name, playTouchSound]);

  // Session timer ticker — starts automatically and ticks every second
  useEffect(() => {
    if (!isPaused && !showIntro) {
      sessionTimerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    };
  }, [isPaused, showIntro]);

  // Rest timer ticker
  useEffect(() => {
    if (isResting && !isPaused && restSecondsRemaining > 0) {
      restTimerRef.current = setInterval(() => {
        setRestSecondsRemaining((prev) => {
          if (prev === 4) {
            speakVoiceGuidance('Three');
          } else if (prev === 3) {
            speakVoiceGuidance('Two');
          } else if (prev === 2) {
            speakVoiceGuidance('One');
          } else if (prev <= 1) {
            // Rest finished!
            setIsResting(false);
            speakVoiceGuidance('Begin set!');
            if (Platform.OS !== 'web') {
              try { Vibration.vibrate([0, 100, 50, 100]); } catch {}
            }
            playTouchSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [isResting, isPaused, restSecondsRemaining, playTouchSound]);

  // Now badge pulse animation
  useEffect(() => {
    nowPulse.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) })
      ),
      -1,
      true
    );
    completeBtnGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200 }),
        withTiming(0.4, { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  const nowPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: nowPulse.value }],
  }));

  const completeGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: completeBtnGlow.value,
  }));

  // Handlers
  const handleTogglePause = useCallback(() => {
    playTouchSound();
    setIsPaused((prev) => !prev);
  }, [playTouchSound]);

  const handleAddRestTime = useCallback(() => {
    playTouchSound();
    setRestSecondsRemaining((prev) => prev + 15);
    setRestDurationTotal((prev) => prev + 15);
    setIsResting(true);
  }, [playTouchSound]);

  // Reset set start time when rest ends (new set begins) or exercise changes
  useEffect(() => {
    if (!isResting && !isPaused && !showIntro) {
      setStartTimeRef.current = Date.now();
    }
  }, [isResting, isPaused, showIntro, currentExerciseIdx]);

  // Complete current set — circuit rotation logic
  const handleCompleteSet = useCallback(() => {
    playTouchSound();

    // Calculate time taken for this set
    const setDurationSec = Math.round((Date.now() - setStartTimeRef.current) / 1000);
    const setDurationMin = setDurationSec / 60;
    // Estimate calories: MET 5.0 (moderate bodyweight exercise), 70kg default
    const calsBurned = calculateCaloriesBurned(5.0, 70, setDurationMin);

    // Mark current set as completed
    const setIdx = completedSetsPerExercise[currentExerciseIdx] ?? 0;

    // Log this completed set
    setCompletedSetLogs((prev) => [
      ...prev,
      {
        exerciseName: currentExercise.name,
        setNumber: setIdx + 1,
        durationSec: setDurationSec,
        caloriesBurned: Math.max(1, calsBurned),
      },
    ]);

    setAllSetsData((prev) => {
      const sets = prev[currentExerciseIdx] ? [...prev[currentExerciseIdx]] : [];
      if (sets[setIdx]) {
        sets[setIdx] = { ...sets[setIdx], isDone: true };
      }
      return { ...prev, [currentExerciseIdx]: sets };
    });

    // Bump completed count for this exercise
    const updatedCompleted = {
      ...completedSetsPerExercise,
      [currentExerciseIdx]: setIdx + 1,
    };
    setCompletedSetsPerExercise(updatedCompleted);

    // Check if entire workout is done
    const newTotalDone = Object.values(updatedCompleted).reduce((a, b) => a + b, 0);
    if (newTotalDone >= totalSetsInWorkout) {
      // Workout completed!
      speakVoiceGuidance('System notification: Quest complete! Outstanding performance, Hunter.');
      playClaimSound();
      if (Platform.OS !== 'web') {
        try { Vibration.vibrate([0, 150, 100, 250]); } catch {}
      }
      onComplete(elapsedSeconds);
      return;
    }

    // Find next exercise in circuit that still has sets left
    const totalEx = exercises.length;
    let nextIdx: number | null = null;
    for (let offset = 1; offset <= totalEx; offset++) {
      const candidate = (currentExerciseIdx + offset) % totalEx;
      const doneSets = updatedCompleted[candidate] ?? 0;
      const maxSets = exercises[candidate]?.sets || 3;
      if (doneSets < maxSets) {
        nextIdx = candidate;
        break;
      }
    }

    if (nextIdx !== null) {
      const nextEx = exercises[nextIdx];
      speakVoiceGuidance(`Set complete! Switching to ${nextEx.name}. Rest 20 seconds.`);
      setCurrentExerciseIdx(nextIdx);
      setIsResting(true);
      setRestSecondsRemaining(REST_BETWEEN_CIRCUIT);
      setRestDurationTotal(REST_BETWEEN_CIRCUIT);
    }
  }, [
    currentExerciseIdx,
    completedSetsPerExercise,
    totalSetsInWorkout,
    exercises,
    elapsedSeconds,
    onComplete,
    playTouchSound,
    playClaimSound,
    REST_BETWEEN_CIRCUIT,
  ]);

  // Skip back / undo last — in circuit mode, undo the last completed set
  const handlePrevious = useCallback(() => {
    playTouchSound();
    if (isResting) {
      setIsResting(false);
      return;
    }
    // Find the most recent exercise that had a set completed and undo it
    // Try current exercise first, then scan backwards
    const tryUndo = (idx: number) => {
      const done = completedSetsPerExercise[idx] ?? 0;
      if (done > 0) {
        setCompletedSetsPerExercise((prev) => ({ ...prev, [idx]: done - 1 }));
        setAllSetsData((prev) => {
          const sets = prev[idx] ? [...prev[idx]] : [];
          if (sets[done - 1]) {
            sets[done - 1] = { ...sets[done - 1], isDone: false };
          }
          return { ...prev, [idx]: sets };
        });
        setCurrentExerciseIdx(idx);
        return true;
      }
      return false;
    };

    // Try current, then scan backwards wrapping around
    if (!tryUndo(currentExerciseIdx)) {
      for (let offset = 1; offset < exercises.length; offset++) {
        const candidate = (currentExerciseIdx - offset + exercises.length) % exercises.length;
        if (tryUndo(candidate)) break;
      }
    }
  }, [currentExerciseIdx, completedSetsPerExercise, exercises, isResting, playTouchSound]);

  // Back / Quit button
  const handleBackPress = useCallback(() => {
    playTouchSound();
    if (elapsedSeconds < 3) {
      onCancel();
      return;
    }

    if (Platform.OS === 'web') {
      const confirmQuit = typeof window !== 'undefined'
        ? window.confirm("ABANDON WORKOUT?\nYour current training progress will not be saved.")
        : true;
      if (confirmQuit) onCancel();
      return;
    }

    Alert.alert(
      'Abandon Workout?',
      'Your training progress will not be recorded.',
      [
        { text: 'Keep Training', style: 'cancel' },
        { text: 'Abandon', style: 'destructive', onPress: onCancel },
      ]
    );
  }, [elapsedSeconds, onCancel, playTouchSound]);

  // Circular timer progress calculation (0 to 1)
  const timerRingProgress = isResting
    ? (restDurationTotal > 0 ? Math.max(0, Math.min(1, restSecondsRemaining / restDurationTotal)) : 1)
    : Math.max(0, Math.min(1, elapsedSeconds / 1800)); // 30m target progress

  // Format rest display
  const restMinutes = Math.floor(restSecondsRemaining / 60);
  const restSecs = restSecondsRemaining % 60;
  const restDisplay = `${String(restMinutes).padStart(2, '0')}:${String(restSecs).padStart(2, '0')}`;

  // GIF / Media source resolution
  // Uses offline bundled local GIF asset to avoid black screens on phones
  const mediaSource = metadata.gifSource || require('@/assets/images/exercise-demo.png');

  return (
    <SafeAreaView style={styles.safeContainer}>
      <View style={styles.outerFrame}>
        {/* ────────── 1. SOLO APP HEADER (Figma #33:17) ────────── */}
        <View style={styles.appHeader}>
          <View style={styles.brandRow}>
            <View style={styles.appIconWrapper}>
              <Image
                source={require('@/../public/solo-app-icon.png')}
                style={styles.appIconImage}
                contentFit="cover"
              />
            </View>
            <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.sessionContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ────────── 2. SESSION HEADER (Figma #2:12849) ────────── */}
          <View style={styles.sessionHeader}>
            <TouchableOpacity
              style={styles.circleBtn}
              onPress={handleBackPress}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Image
                source={require('@/../public/arrow-left.svg')}
                style={styles.headerIcon}
                contentFit="contain"
              />
            </TouchableOpacity>

            <View style={styles.sessionTitleGroup}>
              <Text style={styles.questSubtitle}>Quest in progress</Text>
              <Text style={styles.questTitle} numberOfLines={1}>
                {workout.name || 'UPPER BODY ASCENSION'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.circleBtn}
              onPress={() => {
                playTouchSound();
                setMenuVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Image
                source={require('@/../public/ellipsis.svg')}
                style={styles.headerIcon}
                contentFit="contain"
              />
            </TouchableOpacity>
          </View>

          {/* ────────── 3. SESSION PROGRESS (Figma #2:12857) ────────── */}
          <View style={styles.sessionProgressContainer}>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabelLeft}>
                ROUND {Math.min((completedSetsPerExercise[0] ?? 0) + 1, exercises[0]?.sets || 3)} · SET {totalSetsCompleted + 1} OF {totalSetsInWorkout}
              </Text>
              <Text style={styles.progressLabelRight}>
                {formatTimerDisplay(elapsedSeconds)}
              </Text>
            </View>

            {/* Segmented Progress Track — now based on total sets completed across all exercises */}
            <View style={styles.progressTrackRow}>
              {Array.from({ length: totalSetsInWorkout }, (_, i) => {
                const isActive = i < totalSetsCompleted;
                const isLeading = i === totalSetsCompleted - 1;

                return (
                  <View
                    key={i}
                    style={[
                      styles.progressTrackSegment,
                      {
                        backgroundColor: isActive ? '#20C8FF' : '#191D35',
                      },
                      isActive && isLeading && {
                        boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.40)',
                      },
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* ────────── 4. EXERCISE VISUAL (Figma #2:12874) ────────── */}
          <View style={styles.exerciseVisualCard}>
            {/* Background Anatomical Muscle GIF (#2:12875) */}
            <Image
              source={mediaSource}
              style={styles.exerciseDemonstrationMedia}
              contentFit="cover"
              transition={300}
            />

            {/* Media Scrim Gradient (#2:12876) */}
            <View
              style={[
                styles.mediaScrim,
                Platform.OS === 'web'
                  ? ({
                      backgroundImage:
                        'linear-gradient(180deg, rgba(5, 6, 17, 0.0) 0%, rgba(5, 6, 17, 0.0) 42%, rgba(5, 6, 17, 0.45) 72%, rgba(5, 6, 17, 0.92) 100%)',
                    } as any)
                  : { backgroundColor: 'rgba(5, 6, 17, 0.35)' },
              ]}
            />

            {/* Top row: Exercise tags (#2:12877) */}
            <View style={styles.exerciseTagsRow}>
              <View style={styles.purpleTag}>
                <Text style={styles.purpleTagText}>{metadata.muscleTag}</Text>
              </View>
              <View style={styles.cyanTag}>
                <Text style={styles.cyanTagText}>
                  Set {currentSetIdx + 1} / {totalSetsForCurrent}
                </Text>
              </View>
            </View>

            {/* Bottom: Exercise title and form cues (#2:12882) */}
            <View style={styles.exerciseTitleBlock}>
              <Text style={styles.exerciseMainName} numberOfLines={2}>
                {currentExercise.name}
              </Text>
              <Text style={styles.exerciseFormCue} numberOfLines={1}>
                {metadata.formCue}
              </Text>
            </View>
          </View>

          {/* ────────── 5. REST AND SETS (Figma #2:12885) ────────── */}
          <View style={styles.restAndSetsRow}>
            {/* Left: Rest timer card (#2:12886) */}
            <View style={styles.restTimerCard}>
              <View style={styles.timerDial}>
                {/* Web & Native Circular Track */}
                {Platform.OS === 'web' ? (
                  <View style={styles.webSvgWrapper}>
                    <svg
                      width="86"
                      height="86"
                      viewBox="0 0 86 86"
                      style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
                    >
                      {/* Background track */}
                      <circle
                        cx="43"
                        cy="43"
                        r="37"
                        stroke="#2A3154"
                        strokeWidth="5"
                        fill="none"
                      />
                      {/* Progress ring with glow */}
                      <circle
                        cx="43"
                        cy="43"
                        r="37"
                        stroke="#20C8FF"
                        strokeWidth="5"
                        strokeDasharray={2 * Math.PI * 37}
                        strokeDashoffset={2 * Math.PI * 37 * (1 - timerRingProgress)}
                        strokeLinecap="round"
                        fill="none"
                        style={{
                          filter: 'drop-shadow(0px 0px 8px rgba(32, 200, 255, 0.5)) drop-shadow(0px 0px 14px rgba(108, 92, 255, 0.4))',
                          transition: 'stroke-dashoffset 0.4s ease',
                        }}
                      />
                    </svg>
                  </View>
                ) : (
                  <View style={styles.nativeRingContainer}>
                    <View style={styles.nativeTrackRing} />
                    <View
                      style={[
                        styles.nativeProgressRing,
                        {
                          borderColor: '#20C8FF',
                          opacity: timerRingProgress > 0 ? 1 : 0.4,
                        },
                      ]}
                    />
                  </View>
                )}

                {/* Centered time display — shows running workout elapsed timer when active, or rest countdown when resting */}
                <Text style={styles.timerTimeText}>
                  {isResting ? restDisplay : formatTimerDisplay(elapsedSeconds)}
                </Text>
              </View>

              <Text style={styles.restRemainingLabel}>
                {isResting
                  ? 'Rest remaining'
                  : isPaused
                  ? 'Session paused'
                  : 'Active workout time'}
              </Text>

              {/* Timer extension / rest button */}
              <TouchableOpacity
                style={styles.timerExtensionBtn}
                onPress={handleAddRestTime}
                activeOpacity={0.7}
              >
                <Image
                  source={require('@/../public/plus.svg')}
                  style={styles.plusIcon}
                  contentFit="contain"
                />
                <Text style={styles.timerExtensionText}>
                  {isResting ? '15 SEC' : 'START REST'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Right: Set table (#2:12895) */}
            <View style={styles.setTableCard}>
              {/* Header row (#2:12896) */}
              <View style={styles.setLabelsRow}>
                <Text style={styles.labelColSet}>SET</Text>
                <Text style={styles.labelColLoad}>LOAD</Text>
                <Text style={styles.labelColReps}>REPS</Text>
                <Text style={styles.labelColState}>STATE</Text>
              </View>

              {/* Set rows — uses completedSetsPerExercise for circuit tracking */}
              {Array.from({ length: totalSetsForCurrent }).map((_, idx) => {
                const doneSets = completedSetsPerExercise[currentExerciseIdx] ?? 0;
                const isCompleted = idx < doneSets;
                const isCurrent = idx === doneSets && doneSets < totalSetsForCurrent;
                const setRecord = currentSets[idx];
                const repsDisplay = setRecord?.reps ?? (currentExercise.reps || 10);
                const loadDisplay = setRecord?.load || metadata.defaultLoad;

                return (
                  <View
                    key={idx}
                    style={[
                      styles.setRow,
                      isCurrent && styles.setRowActive,
                    ]}
                  >
                    {/* SET column */}
                    <View style={styles.setColSet}>
                      {isCompleted ? (
                        <Image
                          source={require('@/../public/circle-check.svg')}
                          style={styles.checkIcon}
                          contentFit="contain"
                        />
                      ) : (
                        <Text
                          style={[
                            styles.setNumText,
                            isCurrent ? styles.setNumActive : styles.setNumUpcoming,
                          ]}
                        >
                          {idx + 1}
                        </Text>
                      )}
                    </View>

                    {/* LOAD column */}
                    <Text
                      style={[
                        styles.setColLoad,
                        isCurrent ? styles.loadActive : styles.loadInactive,
                      ]}
                    >
                      {loadDisplay}
                    </Text>

                    {/* REPS column */}
                    <Text
                      style={[
                        styles.setColReps,
                        isCurrent ? styles.repsActive : styles.repsInactive,
                      ]}
                    >
                      {repsDisplay}
                    </Text>

                    {/* STATE column */}
                    <View style={styles.setColState}>
                      {isCompleted ? (
                        <Text style={styles.stateDone}>Done</Text>
                      ) : isCurrent ? (
                        <Animated.View style={nowPulseStyle}>
                          <Text style={styles.stateNow}>Now</Text>
                        </Animated.View>
                      ) : (
                        <Text style={styles.stateUpcoming}>-</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ────────── 6. WORKOUT CONTROLS (Figma #2:12922) ────────── */}
          <View style={styles.workoutControlsRow}>
            {/* Previous button (#2:12923) */}
            <TouchableOpacity
              style={styles.controlBtnPrevious}
              onPress={handlePrevious}
              activeOpacity={0.7}
            >
              <Image
                source={require('@/../public/skip-back.svg')}
                style={styles.skipBackIcon}
                contentFit="contain"
              />
            </TouchableOpacity>

            {/* Pause / Resume button (#2:12925) */}
            <TouchableOpacity
              style={[styles.controlBtnPause, isPaused && styles.controlBtnPaused]}
              onPress={handleTogglePause}
              activeOpacity={0.8}
            >
              <Image
                source={
                  isPaused
                    ? require('@/../public/play.svg')
                    : require('@/../public/pause.svg')
                }
                style={styles.pauseIcon}
                contentFit="contain"
              />
            </TouchableOpacity>

            {/* Complete set button (#2:12927) */}
            <Animated.View style={[styles.completeBtnWrapper, completeGlowStyle]}>
              <TouchableOpacity
                style={styles.controlBtnComplete}
                onPress={handleCompleteSet}
                activeOpacity={0.85}
              >
                <Image
                  source={require('@/../public/check.svg')}
                  style={styles.completeCheckIcon}
                  contentFit="contain"
                />
                <Text style={styles.completeBtnText}>
                  {totalSetsCompleted + 1 >= totalSetsInWorkout
                    ? 'FINISH'
                    : isResting
                    ? 'SKIP REST'
                    : 'COMPLETE'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ────────── 7. UP NEXT CARD (Figma #2:12930) ────────── */}
          <View style={styles.upNextCard}>
            <View style={styles.upNextIconBox}>
              <Image
                source={require('@/../public/dumbbell.svg')}
                style={styles.dumbbellIcon}
                contentFit="contain"
              />
            </View>

            <View style={styles.upNextContent}>
              <Text style={styles.upNextSub}>
                {hasNextExercise
                  ? `Up next · Set ${(completedSetsPerExercise[nextCircuitIdx!] ?? 0) + 1}`
                  : 'Final Protocol Sequence'}
              </Text>
              <Text style={styles.upNextName} numberOfLines={1}>
                {hasNextExercise
                  ? `${nextExercise?.name} · ${(nextExercise?.sets || 3) - (completedSetsPerExercise[nextCircuitIdx!] ?? 0)} sets left`
                  : 'Workout Ascension Complete Next'}
              </Text>
            </View>

            <Text style={styles.upNextEstimate}>
              {hasNextExercise ? `${totalSetsInWorkout - totalSetsCompleted} left` : 'MAX XP'}
            </Text>
          </View>

          {/* ────────── 8. COMPLETED SETS LOG ────────── */}
          {completedSetLogs.length > 0 && (
            <View style={styles.completedLogsCard}>
              <Text style={styles.completedLogsTitle}>⚔️ BATTLE LOG</Text>
              {completedSetLogs.map((log, idx) => {
                const mins = Math.floor(log.durationSec / 60);
                const secs = log.durationSec % 60;
                const timeStr = mins > 0
                  ? `${mins}m ${String(secs).padStart(2, '0')}s`
                  : `${secs}s`;
                const totalCalsSoFar = completedSetLogs
                  .slice(0, idx + 1)
                  .reduce((sum, l) => sum + l.caloriesBurned, 0);

                return (
                  <View key={idx} style={styles.logRow}>
                    <View style={styles.logIndexBadge}>
                      <Text style={styles.logIndexText}>{idx + 1}</Text>
                    </View>
                    <View style={styles.logContent}>
                      <Text style={styles.logExerciseName} numberOfLines={1}>
                        {log.exerciseName}
                        <Text style={styles.logSetLabel}> — Set {log.setNumber}</Text>
                      </Text>
                      <View style={styles.logMetaRow}>
                        <Text style={styles.logTimeBadge}>⏱ {timeStr}</Text>
                        <Text style={styles.logCalBadge}>🔥 {log.caloriesBurned} kcal</Text>
                      </View>
                    </View>
                    <Text style={styles.logRunningTotal}>{totalCalsSoFar}</Text>
                  </View>
                );
              })}

              {/* Total summary row */}
              <View style={styles.logTotalRow}>
                <Text style={styles.logTotalLabel}>TOTAL BURNED</Text>
                <Text style={styles.logTotalValue}>
                  🔥 {completedSetLogs.reduce((sum, l) => sum + l.caloriesBurned, 0)} kcal
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* ────────── OPTIONS MODAL ────────── */}
        <Modal visible={menuVisible} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>TRAINING PROTOCOL OPTIONS</Text>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  playTouchSound();
                  setMenuVisible(false);
                  // Mark all remaining sets for current exercise as done
                  const remainingSets = totalSetsForCurrent - (completedSetsPerExercise[currentExerciseIdx] ?? 0);
                  if (remainingSets > 0) {
                    setCompletedSetsPerExercise((prev) => ({
                      ...prev,
                      [currentExerciseIdx]: totalSetsForCurrent,
                    }));
                    setAllSetsData((prev) => {
                      const sets = prev[currentExerciseIdx] ? [...prev[currentExerciseIdx]] : [];
                      for (let i = 0; i < sets.length; i++) {
                        sets[i] = { ...sets[i], isDone: true };
                      }
                      return { ...prev, [currentExerciseIdx]: sets };
                    });
                  }
                  const next = findNextCircuitExercise(currentExerciseIdx);
                  if (next !== null) {
                    setCurrentExerciseIdx(next);
                  }
                }}
              >
                <Text style={styles.modalOptionText}>⏩ Skip Current Exercise</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  playTouchSound();
                  setMenuVisible(false);
                  handleAddRestTime();
                }}
              >
                <Text style={styles.modalOptionText}>⏱️ Add +15s Rest</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalOption, styles.modalOptionDanger]}
                onPress={() => {
                  setMenuVisible(false);
                  handleBackPress();
                }}
              >
                <Text style={styles.modalOptionTextDanger}>⚠️ Abandon Session</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={styles.modalCloseText}>CLOSE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ────────── WORKOUT INTRO VIDEO OVERLAY ────────── */}
        {showIntro && (
          <WorkoutIntroOverlay
            isRecovery={isRecovery}
            onFinish={handleIntroFinish}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#050611',
  },
  outerFrame: {
    flex: 1,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#080A16',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 24,
    overflow: 'hidden',
  },
  appHeader: {
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 49, 84, 0.4)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIconWrapper: {
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
    width: 22,
    height: 22,
  },
  brandTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.6,
    color: '#F5FAFF',
  },
  scrollArea: {
    flex: 1,
  },
  sessionContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 12,
  },

  // Session header
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 18,
    height: 18,
  },
  sessionTitleGroup: {
    alignItems: 'center',
    gap: 2,
    flex: 1,
    paddingHorizontal: 12,
  },
  questSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  questTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 16,
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },

  // Progress
  sessionProgressContainer: {
    gap: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabelLeft: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
    color: '#A8B0CE',
  },
  progressLabelRight: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
    color: '#9CE9FF',
  },
  progressTrackRow: {
    flexDirection: 'row',
    height: 5,
    gap: 2,
    alignItems: 'stretch',
  },
  progressTrackSegment: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
  },

  // Exercise visual
  exerciseVisualCard: {
    height: 205,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5669B6',
    backgroundColor: '#0E1122',
    overflow: 'hidden',
    position: 'relative',
    padding: 16,
    justifyContent: 'space-between',
    boxShadow: '0px 10px 24px 0px rgba(0, 0, 0, 0.40)',
  },
  exerciseDemonstrationMedia: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  mediaScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 6, 17, 0.65)',
  },
  exerciseTagsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  purpleTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(183, 168, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(183, 168, 255, 0.40)',
  },
  purpleTagText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#B7A8FF',
    textTransform: 'uppercase',
  },
  cyanTag: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.40)',
  },
  cyanTagText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  exerciseTitleBlock: {
    gap: 4,
    zIndex: 2,
  },
  exerciseMainName: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 24,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseFormCue: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 11,
    color: '#9CE9FF',
  },

  // Rest and sets
  restAndSetsRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  restTimerCard: {
    width: 118,
    minHeight: 176,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  timerDial: {
    width: 86,
    height: 86,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  webSvgWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 86,
    height: 86,
  },
  nativeRingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 86,
    height: 86,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativeTrackRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 5,
    borderColor: '#2A3154',
  },
  nativeProgressRing: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 5,
  },
  timerTimeText: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 22,
    color: '#F5F7FF',
    zIndex: 2,
  },
  restRemainingLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
  },
  timerExtensionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  plusIcon: {
    width: 12,
    height: 12,
  },
  timerExtensionText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },

  // Set table
  setTableCard: {
    flex: 1,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 8,
    gap: 2,
    justifyContent: 'center',
  },
  setLabelsRow: {
    height: 24,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  labelColSet: {
    width: 28,
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
  },
  labelColLoad: {
    width: 58,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
  },
  labelColReps: {
    width: 38,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
  },
  labelColState: {
    width: 42,
    textAlign: 'right',
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
  },

  // Set row
  setRow: {
    height: 38,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 4,
  },
  setRowActive: {
    backgroundColor: 'rgba(108, 92, 255, 0.13)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    borderRadius: 8,
  },
  setColSet: {
    width: 28,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkIcon: {
    width: 14,
    height: 14,
  },
  setNumText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
  },
  setNumActive: {
    color: '#20C8FF',
  },
  setNumUpcoming: {
    color: '#697292',
  },
  setColLoad: {
    width: 58,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
  },
  loadActive: {
    color: '#F5F7FF',
  },
  loadInactive: {
    color: '#697292',
  },
  setColReps: {
    width: 38,
    textAlign: 'center',
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
  },
  repsActive: {
    color: '#F5F7FF',
  },
  repsInactive: {
    color: '#697292',
  },
  setColState: {
    width: 42,
    alignItems: 'flex-end',
  },
  stateDone: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#3BE7A1',
    textTransform: 'uppercase',
  },
  stateNow: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  stateUpcoming: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#697292',
  },

  // Controls
  workoutControlsRow: {
    height: 58,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'stretch',
  },
  controlBtnPrevious: {
    flex: 1,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipBackIcon: {
    width: 20,
    height: 20,
  },
  controlBtnPause: {
    width: 76,
    backgroundColor: '#6C5CFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
  },
  controlBtnPaused: {
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 18px 1px rgba(32, 200, 255, 0.40)',
  },
  pauseIcon: {
    width: 23,
    height: 23,
  },
  completeBtnWrapper: {
    flex: 1,
    borderRadius: 16,
    boxShadow: '0px 0px 14px 1px rgba(32, 200, 255, 0.25)',
  },
  controlBtnComplete: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderWidth: 1,
    borderColor: '#20C8FF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  completeCheckIcon: {
    width: 18,
    height: 18,
  },
  completeBtnText: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },

  // Up next card
  upNextCard: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
  },
  upNextIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dumbbellIcon: {
    width: 19,
    height: 19,
  },
  upNextContent: {
    flex: 1,
    gap: 3,
  },
  upNextSub: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#697292',
    textTransform: 'uppercase',
  },
  upNextName: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 12,
    color: '#F5F7FF',
  },
  upNextEstimate: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#20C8FF',
  },

  // Completed sets log (Battle Log)
  completedLogsCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  completedLogsTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 12,
    color: '#3BE7A1',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 4,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(59, 231, 161, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(59, 231, 161, 0.12)',
  },
  logIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(32, 200, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logIndexText: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 10,
    color: '#20C8FF',
  },
  logContent: {
    flex: 1,
    gap: 3,
  },
  logExerciseName: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#F5F7FF',
  },
  logSetLabel: {
    fontWeight: '600',
    color: '#697292',
  },
  logMetaRow: {
    flexDirection: 'row',
    gap: 12,
  },
  logTimeBadge: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 10,
    color: '#9CE9FF',
  },
  logCalBadge: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 10,
    color: '#FFB347',
  },
  logRunningTotal: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 14,
    color: '#3BE7A1',
    minWidth: 30,
    textAlign: 'right',
  },
  logTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(59, 231, 161, 0.2)',
  },
  logTotalLabel: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 10,
    color: '#697292',
    letterSpacing: 0.8,
  },
  logTotalValue: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 13,
    color: '#3BE7A1',
  },

  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 20,
    gap: 14,
  },
  modalTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '900',
    fontSize: 13,
    color: '#20C8FF',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  modalOptionText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 13,
    color: '#F5F7FF',
  },
  modalOptionDanger: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  modalOptionTextDanger: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 13,
    color: '#EF4444',
  },
  modalCloseBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  modalCloseText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 11,
    color: '#697292',
  },
});
