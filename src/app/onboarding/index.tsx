import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ActivityLevel, type GoalType, type Sex, type PlanType } from '@/types';
import {
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_CONFIG,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
} from '@/lib/calculations/bmr';
import { updateProfileOnboarding, getProfile } from '@/db/operations';
import { Colors, Fonts, Spacing, ForgeCard } from '@/constants/theme';
import { ParticleField } from '@/components/ui/particles';

const GOAL_OPTIONS: { value: GoalType; title: string; emoji: string; subtitle: string; tag: string }[] = [
  {
    value: 'lose_weight',
    title: 'Lose Weight (Deficit)',
    emoji: '🔥',
    subtitle: 'Calorie deficit (-500 kcal) with high protein to burn fat and preserve lean muscle.',
    tag: '-500 kcal/day',
  },
  {
    value: 'maintain',
    title: 'Maintain Weight',
    emoji: '⚖️',
    subtitle: 'Balanced caloric maintenance to sustain current weight and build steady physical baseline.',
    tag: 'TDEE Match',
  },
  {
    value: 'gain_weight',
    title: 'Gain Weight (Surplus)',
    emoji: '⚔️',
    subtitle: 'Caloric surplus (+500 kcal) paired with training stimulus to build strength & muscle.',
    tag: '+500 kcal/day',
  },
];

const STEP_TITLES = [
  'Body Parameters',
  'Activity Level',
  'Fitness Goal',
  'Training Program',
  'Awakening Summary',
];

export default function OnboardingScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [username, setUsername] = useState('Sung Jin-Woo');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('24');
  const [heightCm, setHeightCm] = useState('180');
  const [weightKg, setWeightKg] = useState('75');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [goalType, setGoalType] = useState<GoalType>('maintain');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('100day');

  // Preload existing profile for seamless recalibration
  useEffect(() => {
    async function loadExisting() {
      try {
        const p = await getProfile(db);
        if (p) {
          if (p.username) setUsername(p.username);
          if (p.sex) setSex(p.sex);
          if (p.age) setAge(String(p.age));
          if (p.height_cm) setHeightCm(String(p.height_cm));
          if (p.weight_kg) setWeightKg(String(p.weight_kg));
          if (p.activity_level) setActivityLevel(p.activity_level);
          if (p.goal_type) setGoalType(p.goal_type);
          if (p.selected_plan) setSelectedPlan(p.selected_plan);
        }
      } catch (err) {
        console.warn('Failed to load profile for recalibration:', err);
      }
    }
    loadExisting();
  }, [db]);

  // Computed results
  const parsedAge = parseInt(age, 10) || 25;
  const parsedHeight = parseFloat(heightCm) || 175;
  const parsedWeight = parseFloat(weightKg) || 70;

  const bmr = calculateBMR(parsedWeight, parsedHeight, parsedAge, sex);
  const tdee = calculateTDEE(bmr, activityLevel);
  const macros = calculateMacros(tdee, goalType);

  const handleNext = () => {
    if (step === 1) {
      if (!age || !heightCm || !weightKg) {
        Alert.alert('Missing Info', 'Please enter your age, height, and weight to continue.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      setStep(5);
    }
  };

  const [saving, setSaving] = useState(false);

  const handleFinish = async () => {
    if (saving) return;
    try {
      setSaving(true);
      await updateProfileOnboarding(db, {
        username: username.trim() || 'Hunter',
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        sex,
        activity_level: activityLevel,
        goal_type: goalType,
        selected_plan: selectedPlan,
      });

      // On Web, force a direct reload to root so all SQLite cache and tab screens refresh immediately
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.location.href = '/';
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      console.error('[Onboarding] handleFinish error:', err);
      Alert.alert('Save Failed', err?.message ?? 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Floating Ember Particles */}
      <ParticleField count={6} color={Colors.dark.accent} />

      <ScrollView contentContainerStyle={styles.container}>
        {/* SYSTEM STATUS TAG */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.topHeader}>
          <View style={styles.systemTagBadge}>
            <View style={styles.systemTagDot} />
            <Text style={styles.systemTagText}>SYSTEM // CALIBRATION</Text>
          </View>
          <Text style={styles.systemTitle}>{STEP_TITLES[step - 1]}</Text>
          <Text style={styles.systemSubtitle}>Step {step} of 5 — Configure your hunter physical parameters</Text>

          {/* Segmented Step Progress Bar */}
          <View style={styles.stepProgressBar}>
            {[1, 2, 3, 4, 5].map((s) => (
              <View
                key={s}
                style={[
                  styles.stepSegment,
                  s <= step && styles.stepSegmentActive,
                  s === step && styles.stepSegmentCurrent,
                ]}
              />
            ))}
          </View>
        </Animated.View>

        {/* STEP 1: PHYSICAL CALIBRATION */}
        {step === 1 && (
          <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderIcon}>👤</Text>
              <Text style={styles.cardHeader}>Hunter Profile</Text>
            </View>

            {/* Hunter Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HUNTER NAME</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter Hunter Name"
                placeholderTextColor={Colors.dark.textMuted}
              />
            </View>

            {/* Sex Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BIOLOGICAL SEX</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, sex === 'male' && styles.toggleBtnActive]}
                  onPress={() => setSex('male')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, sex === 'male' && styles.toggleTextActive]}>
                    MALE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, sex === 'female' && styles.toggleBtnActive]}
                  onPress={() => setSex('female')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleText, sex === 'female' && styles.toggleTextActive]}>
                    FEMALE
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Age, Height, Weight */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>AGE (YRS)</Text>
                <TextInput
                  style={styles.textInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="24"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>HEIGHT (CM)</Text>
                <TextInput
                  style={styles.textInput}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  placeholder="180"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>WEIGHT (KG)</Text>
                <TextInput
                  style={styles.textInput}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  placeholder="75"
                  placeholderTextColor={Colors.dark.textMuted}
                />
              </View>
            </View>
          </Animated.View>
        )}

        {/* STEP 2: ACTIVITY LEVEL */}
        {step === 2 && (
          <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderIcon}>⚡</Text>
              <Text style={styles.cardHeader}>Daily Activity Level</Text>
            </View>

            <View style={styles.activityList}>
              {ACTIVITY_LEVEL_OPTIONS.map((opt) => {
                const isSelected = activityLevel === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.activityOption, isSelected && styles.activityOptionActive]}
                    onPress={() => setActivityLevel(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.activityHeader}>
                      <Text
                        style={[
                          styles.activityTitle,
                          isSelected && styles.activityTitleActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <View style={[styles.multiplierBadge, isSelected && styles.multiplierBadgeActive]}>
                        <Text style={[styles.activityMultiplier, isSelected && styles.activityMultiplierActive]}>
                          ×{opt.multiplier}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.activityDesc}>{opt.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* STEP 3: WEIGHT GOAL SECTION */}
        {step === 3 && (
          <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderIcon}>🎯</Text>
              <Text style={styles.cardHeader}>Fitness Goal</Text>
            </View>

            <View style={styles.goalList}>
              {GOAL_OPTIONS.map((opt) => {
                const isSelected = goalType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.goalOption, isSelected && styles.goalOptionActive]}
                    onPress={() => setGoalType(opt.value)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.goalTopRow}>
                      <View style={styles.goalTitleGroup}>
                        <Text style={styles.goalEmoji}>{opt.emoji}</Text>
                        <Text style={[styles.goalTitle, isSelected && styles.goalTitleActive]}>
                          {opt.title}
                        </Text>
                      </View>
                      <View style={[styles.goalTagBadge, isSelected && styles.goalTagBadgeActive]}>
                        <Text style={[styles.goalTagText, isSelected && styles.goalTagTextActive]}>
                          {opt.tag}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.goalSubtitle}>{opt.subtitle}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        )}

        {/* STEP 4: TRAINING PLAN SELECTION */}
        {step === 4 && (
          <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderIcon}>⚔️</Text>
              <Text style={styles.cardHeader}>Choose Your Program</Text>
            </View>

            <View style={styles.planList}>
              {/* 100-Day Plan */}
              <TouchableOpacity
                style={[styles.planOption, selectedPlan === '100day' && styles.planOptionActive]}
                onPress={() => setSelectedPlan('100day')}
                activeOpacity={0.8}
              >
                <View style={styles.planTopRow}>
                  <View style={styles.planTitleGroup}>
                    <Text style={styles.planEmoji}>⚡</Text>
                    <Text style={[styles.planTitle, selectedPlan === '100day' && styles.planTitleActive]}>
                      Shadow Awakening
                    </Text>
                  </View>
                  <View style={[styles.planDaysBadge, selectedPlan === '100day' && styles.planDaysBadgeActive]}>
                    <Text style={[styles.planDaysText, selectedPlan === '100day' && styles.planDaysTextActive]}>
                      100 DAYS
                    </Text>
                  </View>
                </View>
                <Text style={styles.planSubtitle}>
                  Fast-track home transformation. 14 weeks of escalating bodyweight training from
                  foundation to explosive power. 6 days on, 1 day recovery.
                </Text>
                <View style={styles.planPhases}>
                  <Text style={styles.planPhaseTag}>Foundation → Strength → Power → Final Trial</Text>
                </View>
              </TouchableOpacity>

              {/* 365-Day Plan */}
              <TouchableOpacity
                style={[styles.planOption, selectedPlan === '365day' && styles.planOptionActive]}
                onPress={() => setSelectedPlan('365day')}
                activeOpacity={0.8}
              >
                <View style={styles.planTopRow}>
                  <View style={styles.planTitleGroup}>
                    <Text style={styles.planEmoji}>👑</Text>
                    <Text style={[styles.planTitle, selectedPlan === '365day' && styles.planTitleActive]}>
                      Monarch's Ascension
                    </Text>
                  </View>
                  <View style={[styles.planDaysBadge, selectedPlan === '365day' && styles.planDaysBadgeActive]}>
                    <Text style={[styles.planDaysText, selectedPlan === '365day' && styles.planDaysTextActive]}>
                      365 DAYS
                    </Text>
                  </View>
                </View>
                <Text style={styles.planSubtitle}>
                  The full year journey. 52 weeks of progressive home training — evolve from E-Rank
                  to S-Rank worthy. Master every physical discipline.
                </Text>
                <View style={styles.planPhases}>
                  <Text style={styles.planPhaseTag}>Awakening → Hunter → Shadow Soldier → Elite → Monarch</Text>
                </View>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* STEP 5: RESULTS / SUMMARY */}
        {step === 5 && (
          <Animated.View entering={FadeInDown.duration(450)} style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardHeaderIcon}>📊</Text>
              <Text style={styles.cardHeader}>Calibration Summary</Text>
            </View>

            {/* Selected Goal Banner */}
            <View style={styles.selectedGoalBanner}>
              <Text style={styles.selectedGoalEmoji}>
                {GOAL_CONFIG[goalType].emoji}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedGoalTag}>FITNESS GOAL</Text>
                <Text style={styles.selectedGoalName}>
                  {GOAL_CONFIG[goalType].label}
                </Text>
              </View>
              <Text style={styles.selectedGoalOffset}>
                {GOAL_CONFIG[goalType].calorieOffset > 0 ? `+${GOAL_CONFIG[goalType].calorieOffset}` : GOAL_CONFIG[goalType].calorieOffset} kcal
              </Text>
            </View>

            {/* Selected Plan Banner */}
            <View style={styles.selectedPlanBanner}>
              <Text style={styles.selectedGoalEmoji}>
                {selectedPlan === '100day' ? '⚡' : '👑'}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedGoalTag}>TRAINING PROGRAM</Text>
                <Text style={styles.selectedGoalName}>
                  {selectedPlan === '100day' ? 'Shadow Awakening' : "Monarch's Ascension"}
                </Text>
              </View>
              <View style={styles.planDaysPill}>
                <Text style={styles.selectedPlanDays}>
                  {selectedPlan === '100day' ? '100' : '365'} DAYS
                </Text>
              </View>
            </View>

            <View style={styles.resultsGrid}>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>BMR (BASE BURN)</Text>
                <Text style={styles.resultValue}>{bmr} <Text style={styles.resultUnit}>kcal</Text></Text>
              </View>

              <View style={[styles.resultBox, styles.resultBoxHighlight]}>
                <Text style={[styles.resultLabel, { color: Colors.dark.accent }]}>DAILY TARGET</Text>
                <Text style={[styles.resultValue, { color: Colors.dark.accent }]}>
                  {macros.daily_calories} <Text style={[styles.resultUnit, { color: Colors.dark.accentBright }]}>kcal</Text>
                </Text>
              </View>
            </View>

            <View style={styles.macrosCard}>
              <Text style={styles.macroCardTitle}>RECOMMENDED DAILY MACROS</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: Colors.dark.danger }]}>{macros.protein_g}g</Text>
                  <Text style={styles.macroLbl}>Protein ({Math.round(GOAL_CONFIG[goalType].proteinPct * 100)}%)</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: Colors.dark.gold }]}>{macros.carbs_g}g</Text>
                  <Text style={styles.macroLbl}>Carbs ({Math.round(GOAL_CONFIG[goalType].carbsPct * 100)}%)</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: Colors.dark.success }]}>{macros.fat_g}g</Text>
                  <Text style={styles.macroLbl}>Fat ({Math.round(GOAL_CONFIG[goalType].fatPct * 100)}%)</Text>
                </View>
              </View>
            </View>

            <View style={styles.quoteBox}>
              <Text style={styles.awakenPrompt}>
                "You have been chosen by the System. Complete daily quests and workouts to level up."
              </Text>
            </View>
          </Animated.View>
        )}

        {/* NAVIGATION BUTTONS */}
        <Animated.View entering={FadeInUp.duration(450).delay(100)} style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep((s) => (s - 1) as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
          )}

          {step < 5 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.8}>
              <Text style={styles.nextBtnText}>NEXT STEP →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.awakenBtn, saving && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.awakenBtnText}>
                {saving ? 'SAVING PROFILE...' : '⚔️ AWAKEN & BEGIN JOURNEY →'}
              </Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.dark.background,
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  topHeader: {
    alignItems: 'center',
    gap: 8,
    marginVertical: Spacing.two,
  },
  systemTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.35)',
  },
  systemTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.dark.accent,
  },
  systemTagText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: Colors.dark.accentBright,
    letterSpacing: 1.5,
  },
  systemTitle: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 1,
  },
  systemSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
  },
  stepProgressBar: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginTop: 8,
  },
  stepSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.dark.backgroundElement,
  },
  stepSegmentActive: {
    backgroundColor: Colors.dark.accentDim,
  },
  stepSegmentCurrent: {
    backgroundColor: Colors.dark.accent,
    boxShadow: `0px 0px 8px 0px ${Colors.dark.accent}`,
  },
  card: {
    backgroundColor: Colors.dark.backgroundCard,
    borderRadius: ForgeCard.borderRadius,
    borderWidth: ForgeCard.borderWidth,
    borderColor: ForgeCard.borderColor,
    padding: Spacing.four,
    gap: Spacing.threeHalf,
    boxShadow: '0px 4px 16px 0px rgba(0, 0, 0, 0.4)',
    elevation: 8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    paddingBottom: 10,
  },
  cardHeaderIcon: {
    fontSize: 16,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.accentBright,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textInput: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.dark.textBright,
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.12)',
    boxShadow: `0px 0px 10px 0px ${Colors.dark.accentGlow}`,
  },
  toggleText: {
    fontFamily: Fonts.display,
    fontSize: 13,
    color: Colors.dark.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  toggleTextActive: {
    color: Colors.dark.accentBright,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  activityList: {
    gap: Spacing.two,
  },
  activityOption: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  activityOptionActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    boxShadow: `0px 0px 12px 0px ${Colors.dark.accentGlow}`,
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  activityTitleActive: {
    color: Colors.dark.accentBright,
  },
  multiplierBadge: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  multiplierBadgeActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  activityMultiplier: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  activityMultiplierActive: {
    color: Colors.dark.accentBright,
  },
  activityDesc: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    lineHeight: 16,
  },
  goalList: {
    gap: Spacing.two,
  },
  goalOption: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  goalOptionActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    boxShadow: `0px 0px 12px 0px ${Colors.dark.accentGlow}`,
  },
  goalTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  goalEmoji: {
    fontSize: 20,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  goalTitleActive: {
    color: Colors.dark.accentBright,
  },
  goalTagBadge: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  goalTagBadgeActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  goalTagText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  goalTagTextActive: {
    color: Colors.dark.accentBright,
  },
  goalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  selectedGoalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  selectedGoalEmoji: {
    fontSize: 24,
  },
  selectedGoalTag: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.accentBright,
    fontWeight: '700',
    letterSpacing: 1,
  },
  selectedGoalName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.5,
  },
  selectedGoalOffset: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: Colors.dark.success,
  },
  resultsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  resultBox: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  resultBoxHighlight: {
    borderColor: 'rgba(249, 115, 22, 0.4)',
    backgroundColor: 'rgba(249, 115, 22, 0.06)',
  },
  resultLabel: {
    fontSize: 10,
    fontFamily: Fonts.display,
    color: Colors.dark.textSecondary,
    letterSpacing: 1,
    textAlign: 'center',
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: Colors.dark.textBright,
  },
  resultUnit: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textMuted,
    fontWeight: '400',
  },
  macrosCard: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  macroCardTitle: {
    fontSize: 11,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.accentBright,
    textAlign: 'center',
    letterSpacing: 1,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  macroItem: {
    alignItems: 'center',
    gap: 2,
  },
  macroVal: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: Fonts.mono,
  },
  macroLbl: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
  },
  quoteBox: {
    backgroundColor: 'rgba(249, 115, 22, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: Colors.dark.accent,
    borderRadius: 8,
    padding: 12,
  },
  awakenPrompt: {
    fontSize: 12,
    fontStyle: 'italic',
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  backBtn: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: Fonts.display,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    boxShadow: `0px 4px 14px 0px ${Colors.dark.accentGlow}`,
    elevation: 6,
  },
  nextBtnText: {
    fontFamily: Fonts.display,
    color: '#080604',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
  awakenBtn: {
    flex: 2,
    backgroundColor: Colors.dark.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    boxShadow: `0px 4px 20px 0px ${Colors.dark.accentGlow}`,
    elevation: 8,
  },
  awakenBtnText: {
    fontFamily: Fonts.display,
    color: '#080604',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  planList: {
    gap: Spacing.two,
  },
  planOption: {
    backgroundColor: Colors.dark.backgroundElement,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  planOptionActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.1)',
    boxShadow: `0px 0px 12px 0px ${Colors.dark.accentGlow}`,
  },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  planEmoji: {
    fontSize: 20,
  },
  planTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.dark.textBright,
    fontFamily: Fonts.display,
    letterSpacing: 0.5,
  },
  planTitleActive: {
    color: Colors.dark.accentBright,
  },
  planDaysBadge: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planDaysBadgeActive: {
    borderColor: Colors.dark.accent,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
  },
  planDaysText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.textSecondary,
    fontWeight: '700',
  },
  planDaysTextActive: {
    color: Colors.dark.accentBright,
  },
  planSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    lineHeight: 17,
  },
  planPhases: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  planPhaseTag: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: Colors.dark.accentBright,
  },
  selectedPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(249, 115, 22, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  planDaysPill: {
    backgroundColor: Colors.dark.backgroundDeep,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  selectedPlanDays: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: Colors.dark.accentBright,
  },
});
