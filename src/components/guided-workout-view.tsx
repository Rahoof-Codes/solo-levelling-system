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
import { speakVoiceGuidance } from '@/services/voiceGuidance';
import { WorkoutIntroOverlay } from '@/components/workout-intro-overlay';

interface GuidedWorkoutViewProps {
  workout: Workout;
  onComplete: (durationActual: number) => void;
  onCancel: () => void;
  autoPlayIntro?: boolean;
}

interface SetRecord {
  setNumber: number;
  load: string;
  reps: number;
  isDone: boolean;
}

export function GuidedWorkoutView({
  workout,
  onComplete,
  onCancel,
  autoPlayIntro = true,
}: GuidedWorkoutViewProps) {
  const { playTouchSound, playClaimSound } = useAudio();

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

  // Current exercise & set index state
  const [currentExerciseIdx, setCurrentExerciseIdx] = useState(0);
  const [currentSetIdx, setCurrentSetIdx] = useState(0);

  // Initialize set data for all exercises
  const [allSetsData, setAllSetsData] = useState<Record<number, SetRecord[]>>({});

  // Session elapsed timer (counts up) — paused while intro video plays, starts automatically once intro ends
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(autoPlayIntro);
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Rest timer (counts down after each set) - 2 minutes (120s)
  const [isResting, setIsResting] = useState(false);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState(120);
  const [restDurationTotal, setRestDurationTotal] = useState(120);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Initialize sets for current exercise
  useEffect(() => {
    setAllSetsData((prev) => {
      if (prev[currentExerciseIdx]) return prev;
      const defaultReps = currentExercise?.reps || (currentExercise?.duration_min ? Math.round(currentExercise.duration_min * 60) : 10);
      const newSets: SetRecord[] = Array.from({ length: totalSetsForCurrent }, (_, i) => ({
        setNumber: i + 1,
        load: metadata.defaultLoad,
        reps: defaultReps,
        isDone: false,
      }));
      return { ...prev, [currentExerciseIdx]: newSets };
    });
  }, [currentExerciseIdx, totalSetsForCurrent, currentExercise, metadata.defaultLoad]);

  // Next exercise data for 'Up next' card
  const hasNextExercise = currentExerciseIdx < exercises.length - 1;
  const nextExercise = hasNextExercise ? exercises[currentExerciseIdx + 1] : null;

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

  // Complete current set
  const handleCompleteSet = useCallback(() => {
    playTouchSound();

    // Mark current set as completed
    setAllSetsData((prev) => {
      const sets = prev[currentExerciseIdx] ? [...prev[currentExerciseIdx]] : [];
      if (sets[currentSetIdx]) {
        sets[currentSetIdx] = { ...sets[currentSetIdx], isDone: true };
      }
      return { ...prev, [currentExerciseIdx]: sets };
    });

    const isLastSetOfExercise = currentSetIdx >= totalSetsForCurrent - 1;
    const isLastExercise = currentExerciseIdx >= exercises.length - 1;

    if (isLastSetOfExercise && isLastExercise) {
      // Workout completed!
      speakVoiceGuidance('System notification: Quest complete! Outstanding performance, Hunter.');
      playClaimSound();
      if (Platform.OS !== 'web') {
        try { Vibration.vibrate([0, 150, 100, 250]); } catch {}
      }
      onComplete(elapsedSeconds);
      return;
    }

    if (isLastSetOfExercise) {
      // Advance to next exercise
      speakVoiceGuidance('Exercise complete! Rest interval started.');
      setCurrentExerciseIdx((prev) => prev + 1);
      setCurrentSetIdx(0);
      setIsResting(true);
      setRestSecondsRemaining(120);
      setRestDurationTotal(120);
    } else {
      // Advance to next set in current exercise
      speakVoiceGuidance('Set complete! Rest interval started.');
      setCurrentSetIdx((prev) => prev + 1);
      setIsResting(true);
      setRestSecondsRemaining(120);
      setRestDurationTotal(120);
    }
  }, [
    currentExerciseIdx,
    currentSetIdx,
    totalSetsForCurrent,
    exercises.length,
    elapsedSeconds,
    onComplete,
    playTouchSound,
    playClaimSound,
  ]);

  // Skip back to previous set
  const handlePrevious = useCallback(() => {
    playTouchSound();
    if (isResting) {
      setIsResting(false);
      return;
    }
    if (currentSetIdx > 0) {
      setCurrentSetIdx((prev) => prev - 1);
    } else if (currentExerciseIdx > 0) {
      const prevExIdx = currentExerciseIdx - 1;
      const prevExSets = exercises[prevExIdx]?.sets || 3;
      setCurrentExerciseIdx(prevExIdx);
      setCurrentSetIdx(prevExSets - 1);
    }
  }, [currentSetIdx, currentExerciseIdx, exercises, isResting, playTouchSound]);

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
                EXERCISE {currentExerciseIdx + 1} OF {exercises.length}
              </Text>
              <Text style={styles.progressLabelRight}>
                {formatTimerDisplay(elapsedSeconds)}
              </Text>
            </View>

            {/* Segmented Progress Track (#2:12861) */}
            <View style={styles.progressTrackRow}>
              {Array.from({ length: 12 }, (_, i) => {
                const stepPerSegment = 12 / exercises.length;
                const completedSegments = Math.round(
                  (currentExerciseIdx + (currentSetIdx / totalSetsForCurrent)) * stepPerSegment
                );
                const isActive = i < Math.max(1, completedSegments);
                const isLeading = i === completedSegments - 1;

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

              {/* Set rows */}
              {Array.from({ length: totalSetsForCurrent }).map((_, idx) => {
                const isCompleted = idx < currentSetIdx;
                const isCurrent = idx === currentSetIdx;
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
                  {currentExerciseIdx === exercises.length - 1 && currentSetIdx === totalSetsForCurrent - 1
                    ? 'FINISH'
                    : isResting
                    ? 'NEXT SET'
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
                  ? `Up next · ${currentExerciseIdx + 2} of ${exercises.length}`
                  : 'Final Protocol Sequence'}
              </Text>
              <Text style={styles.upNextName} numberOfLines={1}>
                {hasNextExercise
                  ? `${nextExercise?.name} · ${nextExercise?.sets || 3} sets`
                  : 'Workout Ascension Complete Next'}
              </Text>
            </View>

            <Text style={styles.upNextEstimate}>
              {hasNextExercise ? `~${Math.max(1, (exercises.length - currentExerciseIdx - 1) * 4)}m` : 'MAX XP'}
            </Text>
          </View>
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
                  if (hasNextExercise) {
                    setCurrentExerciseIdx((prev) => prev + 1);
                    setCurrentSetIdx(0);
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
          <WorkoutIntroOverlay onFinish={handleIntroFinish} />
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
