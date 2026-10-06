/**
 * Awaken the System — Player Registration & Onboarding (Native)
 * Matches Figma design node #25:2543 pixel-for-pixel
 * with complete Solo Leveling electric, glowing, and breathing animations.
 * Mobile-first native layout (status bar icons removed per user request).
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ActivityLevel, type GoalType, type Sex, type PlanType } from '@/types';
import { updateProfileOnboarding, getProfile } from '@/db/operations';
import { Colors } from '@/constants/theme';
import { ParticleField } from '@/components/ui/particles';
import { useAudio } from '@/contexts/AudioContext';

const { width: SCREEN_W } = Dimensions.get('window');
const C = Colors.dark;

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced';
type PrimaryGoal = 'build_strength' | 'lose_fat' | 'improve_fitness' | 'mobility';

const DAYS_OPTIONS = ['3 days', '4 days', '5 days', '6 days'];
const SPACE_OPTIONS = ['Small room', 'Living room', 'Home gym', 'Calisthenics park'];

export default function AwakenScreenNative() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { playTouchSound, playAriseSound } = useAudio();

  // Form State
  const [username, setUsername] = useState('ABDUL RAHOOF');
  const [weightKg, setWeightKg] = useState('78');
  const [heightCm, setHeightCm] = useState('175');
  const [age, setAge] = useState('26');
  const [sex, setSex] = useState<Sex>('male');
  const [fitnessLevel, setFitnessLevel] = useState<FitnessLevel>('intermediate');
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal>('build_strength');
  const [daysIndex, setDaysIndex] = useState(1); // '4 days'
  const [spaceIndex, setSpaceIndex] = useState(0); // 'Small room'
  const [saving, setSaving] = useState(false);

  // Preload existing profile if any
  useEffect(() => {
    async function loadExisting() {
      try {
        const p = await getProfile(db);
        if (p) {
          if (p.username) setUsername(p.username.toUpperCase());
          if (p.weight_kg) setWeightKg(String(p.weight_kg));
          if (p.height_cm) setHeightCm(String(p.height_cm));
          if (p.age) setAge(String(p.age));
          if (p.sex) setSex(p.sex);
          if (p.activity_level) {
            if (p.activity_level === 'sedentary' || p.activity_level === 'lightly_active') {
              setFitnessLevel('beginner');
            } else if (p.activity_level === 'moderately_active') {
              setFitnessLevel('intermediate');
            } else {
              setFitnessLevel('advanced');
            }
          }
          if (p.goal_type) {
            if (p.goal_type === 'gain_weight') setPrimaryGoal('build_strength');
            else if (p.goal_type === 'lose_weight') setPrimaryGoal('lose_fat');
            else setPrimaryGoal('improve_fitness');
          }
        }
      } catch (err) {
        console.warn('Failed to load profile for Awaken screen:', err);
      }
    }
    loadExisting();
  }, [db]);

  /* ─── Animated values ─── */
  const eyeGlowAnim = useSharedValue(0.4);
  const lightningFlicker = useSharedValue(0.7);
  const spark1 = useSharedValue(0.4);
  const spark2 = useSharedValue(0.6);
  const spark3 = useSharedValue(0.3);
  const sparkFloat = useSharedValue(0);
  const brandGlow = useSharedValue(0.3);
  const signalRingScale = useSharedValue(1);
  const signalRingOpacity = useSharedValue(0.8);
  const horizonPulse = useSharedValue(0.5);
  const topLinePulse = useSharedValue(0.6);
  const beaconPulse = useSharedValue(0.6);
  const btnPulse = useSharedValue(1);

  useEffect(() => {
    // 1. Eye glow breathing
    eyeGlowAnim.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 2600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 2600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 2. Electric lightning crackle
    lightningFlicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 120 }),
        withTiming(0.2, { duration: 80 }),
        withTiming(0.9, { duration: 180 }),
        withTiming(0.35, { duration: 300 }),
        withTiming(0.95, { duration: 100 }),
        withTiming(0.15, { duration: 70 }),
        withTiming(0.8, { duration: 220 })
      ),
      -1,
      true
    );

    // 3. Sparks twinkle & float
    spark1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    spark2.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    spark3.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.2, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    sparkFloat.value = withRepeat(
      withSequence(
        withTiming(-4, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(4, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 4. Brand mark glow
    brandGlow.value = withRepeat(
      withSequence(
        withTiming(0.85, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.25, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 5. Signal ripple ring
    signalRingScale.value = withRepeat(
      withTiming(2.4, { duration: 1800, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
    signalRingOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 200 }),
        withTiming(0, { duration: 1600, easing: Easing.out(Easing.ease) })
      ),
      -1,
      false
    );

    // 6. Horizon energy line
    horizonPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 1800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 7. Top energy line
    topLinePulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 8. Ready beacon pulse
    beaconPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.45, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // 9. Awaken button pulse
    btnPulse.value = withRepeat(
      withSequence(
        withTiming(1.018, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const eyeGlowStyle = useAnimatedStyle(() => ({
    opacity: eyeGlowAnim.value,
    transform: [{ scale: 0.96 + eyeGlowAnim.value * 0.08 }],
  }));
  const lightningStyle = useAnimatedStyle(() => ({
    opacity: lightningFlicker.value,
  }));
  const spark1Style = useAnimatedStyle(() => ({
    opacity: spark1.value,
    transform: [{ translateY: sparkFloat.value }],
  }));
  const spark2Style = useAnimatedStyle(() => ({
    opacity: spark2.value,
    transform: [{ translateY: -sparkFloat.value }],
  }));
  const spark3Style = useAnimatedStyle(() => ({
    opacity: spark3.value,
    transform: [{ translateY: sparkFloat.value * 0.7 }],
  }));
  const brandGlowStyle = useAnimatedStyle(() => ({
    opacity: 0.5 + brandGlow.value * 0.5,
  }));
  const signalRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: signalRingScale.value }],
    opacity: signalRingOpacity.value,
  }));
  const horizonStyle = useAnimatedStyle(() => ({
    opacity: horizonPulse.value,
  }));
  const topLineStyle = useAnimatedStyle(() => ({
    opacity: topLinePulse.value,
  }));
  const beaconStyle = useAnimatedStyle(() => ({
    opacity: beaconPulse.value,
  }));
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnPulse.value }],
  }));

  // Dynamic calibration outcome
  const rankProfileText = useMemo(() => {
    let rank = 'C-Rank';
    if (fitnessLevel === 'beginner') rank = 'E-Rank';
    else if (fitnessLevel === 'advanced') rank = 'B-Rank';

    let path = 'Foundation';
    if (primaryGoal === 'build_strength') path = 'Strength protocol';
    else if (primaryGoal === 'lose_fat') path = 'Conditioning protocol';
    else if (primaryGoal === 'mobility') path = 'Agility protocol';

    return `${rank} profile · Week 1 ${path} · no equipment`;
  }, [fitnessLevel, primaryGoal]);

  const handleAwaken = async () => {
    if (saving) return;
    try {
      setSaving(true);
      playTouchSound();
      playAriseSound();

      const parsedAge = parseInt(age, 10) || 26;
      const parsedHeight = parseFloat(heightCm) || 175;
      const parsedWeight = parseFloat(weightKg) || 78;

      let activityLevel: ActivityLevel = 'moderately_active';
      if (fitnessLevel === 'beginner') activityLevel = 'lightly_active';
      else if (fitnessLevel === 'advanced') activityLevel = 'very_active';

      let goalType: GoalType = 'maintain';
      if (primaryGoal === 'build_strength') goalType = 'gain_weight';
      else if (primaryGoal === 'lose_fat') goalType = 'lose_weight';

      const selectedPlan: PlanType = daysIndex === 3 ? '365day' : '100day';

      await updateProfileOnboarding(db, {
        username: username.trim() || 'HUNTER',
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        sex,
        activity_level: activityLevel,
        goal_type: goalType,
        selected_plan: selectedPlan,
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('[AwakenScreen] save failed:', err);
      Alert.alert('Awakening Failed', err?.message ?? 'Could not initialize system.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Ambient Particles */}
        <ParticleField count={6} color={C.systemCyan} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ────────── AWAKENING VISUAL (HERO BANNER) ────────── */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.awakeningVisual}>
            {/* Background image */}
            <Image
              source={require('@/../assets/images/eye_reveal.png')}
              style={styles.visualImage}
              resizeMode="cover"
            />

            {/* Eye glow aura */}
            <Animated.View style={[styles.eyeGlowAura, eyeGlowStyle]} />

            {/* Lightning arcs with electric flicker */}
            <Animated.View style={[styles.lightningArc, styles.lightningLeft, lightningStyle]} />
            <Animated.View style={[styles.lightningArc, styles.lightningRight, lightningStyle]} />

            {/* Animated spark dots */}
            <Animated.View style={[styles.spark, styles.spark1, spark1Style]} />
            <Animated.View style={[styles.spark, styles.spark2, spark2Style]} />
            <Animated.View style={[styles.sparkPurple, styles.spark3, spark3Style]} />

            {/* Visual gradient scrim */}
            <View style={styles.visualScrim} />

            {/* Visual Header Overlay */}
            <View style={styles.visualHeader}>
              <View style={styles.brand}>
                <Animated.View style={[styles.brandMark, brandGlowStyle]}>
                  <Image
                    source={require('@/../assets/images/triangle.svg')}
                    style={styles.brandIcon}
                    resizeMode="contain"
                  />
                </Animated.View>
                <View style={styles.brandName}>
                  <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
                  <Text style={styles.brandSubtitle}>PLAYER REGISTRATION</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  if (router.canGoBack()) router.back();
                  else router.replace('/');
                }}
              >
                <Image
                  source={require('@/../assets/images/arrow-left.svg')}
                  style={styles.backIcon}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Visual Signal */}
            <View style={styles.visualSignal}>
              <View style={styles.signalDotWrapper}>
                <Animated.View style={[styles.signalRipple, signalRingStyle]} />
                <View style={styles.signalDot} />
              </View>
              <Text style={styles.signalText}>AWAKENING LINK ESTABLISHED</Text>
            </View>

            {/* Horizon energy line */}
            <Animated.View style={[styles.horizonLine, horizonStyle]} />
          </Animated.View>

          {/* ────────── SETUP HEADING ────────── */}
          <Animated.View entering={FadeInDown.duration(450).delay(80)} style={styles.setupHeading}>
            <View style={styles.titleRow}>
              <Text style={styles.mainTitle}>AWAKEN THE SYSTEM</Text>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>SETUP 1 / 1</Text>
              </View>
            </View>
            <Text style={styles.subtitleText}>
              Enter your details. The System will calibrate a safe, home-only progression path.
            </Text>
          </Animated.View>

          {/* ────────── PLAYER SETUP FORM ────────── */}
          <Animated.View entering={FadeInDown.duration(500).delay(140)} style={styles.playerSetupForm}>
            {/* Top energy line */}
            <Animated.View style={[styles.topEnergyLine, topLineStyle]} />

            {/* Field: Player name */}
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>PLAYER NAME</Text>
              <View style={styles.inputRow}>
                <Image
                  source={require('@/../assets/images/user-round.svg')}
                  style={styles.fieldIcon}
                  resizeMode="contain"
                />
                <TextInput
                  style={styles.textInput}
                  value={username}
                  onChangeText={(val) => setUsername(val.toUpperCase())}
                  placeholder="PLAYER NAME"
                  placeholderTextColor="#697292"
                />
              </View>
            </View>

            {/* Field: Body measurements */}
            <View style={styles.bodyMeasurementsRow}>
              {/* Weight */}
              <View style={styles.measurementCol}>
                <Text style={styles.fieldLabel}>WEIGHT</Text>
                <View style={styles.measurementInputRow}>
                  <TextInput
                    style={styles.measurementTextInput}
                    value={weightKg}
                    onChangeText={setWeightKg}
                    keyboardType="numeric"
                    placeholder="78"
                    placeholderTextColor="#697292"
                  />
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>

              {/* Height */}
              <View style={styles.measurementCol}>
                <Text style={styles.fieldLabel}>HEIGHT</Text>
                <View style={styles.measurementInputRow}>
                  <TextInput
                    style={styles.measurementTextInput}
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="numeric"
                    placeholder="175"
                    placeholderTextColor="#697292"
                  />
                  <Text style={styles.unitText}>cm</Text>
                </View>
              </View>

              {/* Age */}
              <View style={styles.measurementCol}>
                <Text style={styles.fieldLabel}>AGE</Text>
                <View style={styles.measurementInputRow}>
                  <TextInput
                    style={styles.measurementTextInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="numeric"
                    placeholder="26"
                    placeholderTextColor="#697292"
                  />
                  <Text style={styles.unitText}>yrs</Text>
                </View>
              </View>
            </View>

            {/* Field: Fitness level */}
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>FITNESS LEVEL</Text>
              <View style={styles.choicesRow}>
                {(['beginner', 'intermediate', 'advanced'] as FitnessLevel[]).map((level) => {
                  const isSelected = fitnessLevel === level;
                  const label = level.charAt(0).toUpperCase() + level.slice(1);
                  return (
                    <TouchableOpacity
                      key={level}
                      style={[styles.choiceBtn, isSelected && styles.choiceBtnActive]}
                      onPress={() => {
                        playTouchSound();
                        setFitnessLevel(level);
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.choiceBtnText, isSelected && styles.choiceBtnTextActive]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Field: Primary goal */}
            <View style={styles.fieldCol}>
              <Text style={styles.fieldLabel}>PRIMARY GOAL</Text>
              <View style={styles.goalGrid}>
                {/* Row 1 */}
                <View style={styles.choicesRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, primaryGoal === 'build_strength' && styles.choiceBtnActive]}
                    onPress={() => {
                      playTouchSound();
                      setPrimaryGoal('build_strength');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.choiceBtnText, primaryGoal === 'build_strength' && styles.choiceBtnTextActive]}>
                      Build strength
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, primaryGoal === 'lose_fat' && styles.choiceBtnActive]}
                    onPress={() => {
                      playTouchSound();
                      setPrimaryGoal('lose_fat');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.choiceBtnText, primaryGoal === 'lose_fat' && styles.choiceBtnTextActive]}>
                      Lose fat
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Row 2 */}
                <View style={styles.choicesRow}>
                  <TouchableOpacity
                    style={[styles.choiceBtn, primaryGoal === 'improve_fitness' && styles.choiceBtnActive]}
                    onPress={() => {
                      playTouchSound();
                      setPrimaryGoal('improve_fitness');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.choiceBtnText, primaryGoal === 'improve_fitness' && styles.choiceBtnTextActive]}>
                      Improve fitness
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.choiceBtn, primaryGoal === 'mobility' && styles.choiceBtnActive]}
                    onPress={() => {
                      playTouchSound();
                      setPrimaryGoal('mobility');
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.choiceBtnText, primaryGoal === 'mobility' && styles.choiceBtnTextActive]}>
                      Mobility
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Field: Training preferences */}
            <View style={styles.preferencesRow}>
              {/* Days per week */}
              <View style={styles.prefCol}>
                <Text style={styles.fieldLabel}>DAYS PER WEEK</Text>
                <TouchableOpacity
                  style={styles.prefInputRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    playTouchSound();
                    setDaysIndex((prev) => (prev + 1) % DAYS_OPTIONS.length);
                  }}
                >
                  <Image
                    source={require('@/../assets/images/calendar-days.svg')}
                    style={styles.prefIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.prefValueText}>{DAYS_OPTIONS[daysIndex]}</Text>
                </TouchableOpacity>
              </View>

              {/* Workout space */}
              <View style={styles.prefCol}>
                <Text style={styles.fieldLabel}>WORKOUT SPACE</Text>
                <TouchableOpacity
                  style={styles.prefInputRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    playTouchSound();
                    setSpaceIndex((prev) => (prev + 1) % SPACE_OPTIONS.length);
                  }}
                >
                  <Image
                    source={require('@/../assets/images/house.svg')}
                    style={styles.prefIcon}
                    resizeMode="contain"
                  />
                  <Text style={styles.prefValueText}>{SPACE_OPTIONS[spaceIndex]}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>

          {/* ────────── CALIBRATION OUTCOME ────────── */}
          <Animated.View entering={FadeInUp.duration(450).delay(200)} style={styles.calibrationOutcome}>
            <View style={styles.outcomeIconBox}>
              <Image
                source={require('@/../assets/images/sparkles.svg')}
                style={styles.sparklesIcon}
                resizeMode="contain"
              />
            </View>
            <View style={styles.outcomeCopy}>
              <Text style={styles.outcomeTitle}>ON AWAKENING</Text>
              <Text style={styles.outcomeSubtitle}>{rankProfileText}</Text>
            </View>
            <Image
              source={require('@/../assets/images/arrow-right.svg')}
              style={styles.outcomeArrow}
              resizeMode="contain"
            />
          </Animated.View>

          {/* ────────── SYSTEM READINESS ────────── */}
          <Animated.View entering={FadeInUp.duration(450).delay(260)} style={styles.systemReadiness}>
            <View style={styles.readinessHeading}>
              <Animated.View style={[styles.readyBeaconDot, beaconStyle]} />
              <Text style={styles.readyHeadingText}>SYSTEM READY TO AWAKEN</Text>
            </View>
            <View style={styles.readinessMetrics}>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>SAFETY</Text>
                <Text style={styles.metricValue}>Cleared</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>PROTOCOL</Text>
                <Text style={styles.metricValue}>Home only</Text>
              </View>
              <View style={styles.metricCol}>
                <Text style={styles.metricLabel}>FIRST PATH</Text>
                <Text style={styles.metricValue}>4 weeks</Text>
              </View>
            </View>
          </Animated.View>

          {/* ────────── ACTION AREA ────────── */}
          <Animated.View entering={FadeInUp.duration(500).delay(320)} style={styles.actionArea}>
            <Animated.View style={btnAnimStyle}>
              <TouchableOpacity
                style={[styles.awakenBtn, saving && styles.btnDisabled]}
                onPress={handleAwaken}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.awakenBtnText}>AWAKEN</Text>
                    <Image
                      source={require('@/../assets/images/zap.svg')}
                      style={styles.zapIcon}
                      resizeMode="contain"
                    />
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Text style={styles.privacyCaption}>
              SYSTEM CALIBRATION IS PRIVATE · YOU CAN EDIT THESE DETAILS LATER
            </Text>
          </Animated.View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050611',
  },
  container: {
    flex: 1,
    backgroundColor: '#050611',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    gap: 9,
    maxWidth: 420,
    alignSelf: 'center',
    width: '100%',
  },

  /* ─── Hero Visual ─── */
  awakeningVisual: {
    height: 134,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0E1122',
  },
  visualImage: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: 134,
  },
  eyeGlowAura: {
    position: 'absolute',
    left: -20,
    top: 20,
    width: SCREEN_W,
    height: 104,
    backgroundColor: 'rgba(32, 200, 255, 0.12)',
    borderRadius: 999,
  },
  lightningArc: {
    position: 'absolute',
    height: 2,
    width: 111,
    backgroundColor: 'rgba(32, 200, 255, 0.7)',
    shadowColor: C.systemCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 4,
  },
  lightningLeft: {
    left: 20,
    top: 35,
    transform: [{ rotate: '-12deg' }],
  },
  lightningRight: {
    right: 20,
    top: 65,
    transform: [{ rotate: '10deg' }],
  },
  spark: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.systemCyan,
    shadowColor: C.systemCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  sparkPurple: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#A855F7',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 3,
  },
  spark1: {
    top: 30,
    left: 80,
  },
  spark2: {
    top: 75,
    right: 70,
  },
  spark3: {
    top: 45,
    left: 170,
  },
  visualScrim: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 6, 17, 0.45)',
  },
  visualHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 2,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandMark: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: 'rgba(108, 92, 255, 0.13)',
    borderWidth: 1,
    borderColor: '#20C8FF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.systemPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 18,
    elevation: 8,
  },
  brandIcon: {
    width: 15,
    height: 15,
  },
  brandName: {
    justifyContent: 'center',
    gap: 1,
  },
  brandTitle: {
    fontWeight: '800',
    fontSize: 11,
    lineHeight: 14,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontWeight: '800',
    fontSize: 7,
    lineHeight: 10,
    color: '#20C8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: 'rgba(14, 17, 34, 0.80)',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 16,
    height: 16,
  },
  visualSignal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    zIndex: 2,
  },
  signalDotWrapper: {
    width: 6,
    height: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalRipple: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#20C8FF',
  },
  signalDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#20C8FF',
    shadowColor: C.systemCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  signalText: {
    fontWeight: '800',
    fontSize: 8,
    color: '#9CE9FF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  horizonLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    height: 1,
    backgroundColor: C.systemCyan,
    shadowColor: C.systemCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },

  /* ─── Setup Heading ─── */
  setupHeading: {
    marginTop: 2,
    gap: 3,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mainTitle: {
    fontWeight: '900',
    fontSize: 23,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(32, 200, 255, 0.07)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.33)',
    borderRadius: 4,
  },
  stepBadgeText: {
    fontWeight: '800',
    fontSize: 8,
    color: '#20C8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  subtitleText: {
    fontWeight: '400',
    fontSize: 10,
    lineHeight: 13.5,
    color: '#A8B0CE',
  },

  /* ─── Form Container ─── */
  playerSetupForm: {
    backgroundColor: 'rgba(10, 12, 31, 0.90)',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
    position: 'relative',
  },
  topEnergyLine: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 0,
    height: 1,
    backgroundColor: C.systemCyan,
  },
  fieldCol: {
    gap: 4,
  },
  fieldLabel: {
    fontWeight: '800',
    fontSize: 8,
    color: '#697292',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  inputRow: {
    height: 38,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  fieldIcon: {
    width: 14,
    height: 14,
  },
  textInput: {
    flex: 1,
    fontWeight: '800',
    fontSize: 11,
    color: '#F5F7FF',
    padding: 0,
  },
  bodyMeasurementsRow: {
    flexDirection: 'row',
    gap: 7,
  },
  measurementCol: {
    flex: 1,
    gap: 4,
  },
  measurementInputRow: {
    height: 38,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  measurementTextInput: {
    flex: 1,
    fontWeight: '800',
    fontSize: 11,
    color: '#F5F7FF',
    padding: 0,
  },
  unitText: {
    fontWeight: '700',
    fontSize: 9,
    color: '#697292',
    marginLeft: 4,
    flexShrink: 0,
  },

  /* Choices */
  choicesRow: {
    flexDirection: 'row',
    gap: 6,
  },
  choiceBtn: {
    flex: 1,
    height: 30,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  choiceBtnActive: {
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    borderColor: '#20C8FF',
    shadowColor: C.systemCyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 4,
  },
  choiceBtnText: {
    fontWeight: '800',
    fontSize: 8,
    color: '#697292',
    textTransform: 'uppercase',
  },
  choiceBtnTextActive: {
    color: '#20C8FF',
  },
  goalGrid: {
    gap: 6,
  },

  /* Preferences */
  preferencesRow: {
    flexDirection: 'row',
    gap: 7,
  },
  prefCol: {
    flex: 1,
    gap: 4,
  },
  prefInputRow: {
    height: 38,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  prefIcon: {
    width: 14,
    height: 14,
  },
  prefValueText: {
    fontWeight: '800',
    fontSize: 11,
    color: '#F5F7FF',
  },

  /* ─── Calibration Outcome ─── */
  calibrationOutcome: {
    height: 40,
    backgroundColor: 'rgba(32, 200, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(32, 200, 255, 0.27)',
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  outcomeIconBox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(32, 200, 255, 0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparklesIcon: {
    width: 13,
    height: 13,
  },
  outcomeCopy: {
    flex: 1,
    gap: 1,
  },
  outcomeTitle: {
    fontWeight: '800',
    fontSize: 8,
    color: '#20C8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  outcomeSubtitle: {
    fontWeight: '600',
    fontSize: 9,
    color: '#A8B0CE',
  },
  outcomeArrow: {
    width: 14,
    height: 14,
  },

  /* ─── System Readiness ─── */
  systemReadiness: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    padding: 10,
    gap: 7,
  },
  readinessHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  readyBeaconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3BE7A1',
    shadowColor: '#3BE7A1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  readyHeadingText: {
    fontWeight: '800',
    fontSize: 8,
    color: '#3BE7A1',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  readinessMetrics: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCol: {
    flex: 1,
    gap: 2,
  },
  metricLabel: {
    fontWeight: '800',
    fontSize: 7,
    color: '#697292',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricValue: {
    fontWeight: '800',
    fontSize: 9,
    color: '#F5F7FF',
  },

  /* ─── Action Area ─── */
  actionArea: {
    marginTop: 4,
    gap: 8,
  },
  awakenBtn: {
    height: 52,
    backgroundColor: '#6C5CFF',
    borderRadius: 8,
    shadowColor: C.systemPurple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 9,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  awakenBtnText: {
    fontWeight: '800',
    fontSize: 14,
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  zapIcon: {
    width: 17,
    height: 17,
  },
  privacyCaption: {
    fontWeight: '400',
    fontSize: 8,
    color: '#697292',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
});
