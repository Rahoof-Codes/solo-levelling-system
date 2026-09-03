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
import { Fonts, Spacing } from '@/constants/theme';

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
      <ScrollView contentContainerStyle={styles.container}>
        {/* TOP HEADER */}
        <View style={styles.header}>
          <Text style={styles.systemTitle}>Set Up Your Profile</Text>
          <Text style={styles.systemSubtitle}>
            {step === 1 && 'Step 1 of 5: Body Stats'}
            {step === 2 && 'Step 2 of 5: Daily Activity Level'}
            {step === 3 && 'Step 3 of 5: Fitness Goal'}
            {step === 4 && 'Step 4 of 5: Training Program'}
            {step === 5 && 'Step 5 of 5: Your Custom Plan'}
          </Text>
        </View>

        {/* STEP 1: PHYSICAL CALIBRATION */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Body Parameters</Text>

            {/* Hunter Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Hunter Name</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter Hunter Name"
                placeholderTextColor="#6B7B8F"
              />
            </View>

            {/* Sex Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Biological Sex</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, sex === 'male' && styles.toggleBtnActive]}
                  onPress={() => setSex('male')}
                >
                  <Text style={[styles.toggleText, sex === 'male' && styles.toggleTextActive]}>
                    Male
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, sex === 'female' && styles.toggleBtnActive]}
                  onPress={() => setSex('female')}
                >
                  <Text style={[styles.toggleText, sex === 'female' && styles.toggleTextActive]}>
                    Female
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Age, Height, Weight */}
            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Age (yrs)</Text>
                <TextInput
                  style={styles.textInput}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                  placeholder="24"
                  placeholderTextColor="#6B7B8F"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Height (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                  placeholder="180"
                  placeholderTextColor="#6B7B8F"
                />
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={weightKg}
                  onChangeText={setWeightKg}
                  keyboardType="numeric"
                  placeholder="75"
                  placeholderTextColor="#6B7B8F"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: ACTIVITY LEVEL */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Daily Activity Level</Text>

            <View style={styles.activityList}>
              {ACTIVITY_LEVEL_OPTIONS.map((opt) => {
                const isSelected = activityLevel === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.activityOption, isSelected && styles.activityOptionActive]}
                    onPress={() => setActivityLevel(opt.value)}
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
                      <Text style={styles.activityMultiplier}>×{opt.multiplier}</Text>
                    </View>
                    <Text style={styles.activityDesc}>{opt.description}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* STEP 3: WEIGHT GOAL SECTION */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Fitness Goal</Text>

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
          </View>
        )}

        {/* STEP 4: TRAINING PLAN SELECTION */}
        {step === 4 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Choose Your Program</Text>

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
                      100 Days
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
                      365 Days
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
          </View>
        )}

        {/* STEP 5: RESULTS / SUMMARY */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Profile Summary</Text>

            {/* Selected Goal Banner */}
            <View style={styles.selectedGoalBanner}>
              <Text style={styles.selectedGoalEmoji}>
                {GOAL_CONFIG[goalType].emoji}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedGoalTag}>Fitness Goal</Text>
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
                <Text style={styles.selectedGoalTag}>Training Program</Text>
                <Text style={styles.selectedGoalName}>
                  {selectedPlan === '100day' ? 'Shadow Awakening' : "Monarch's Ascension"}
                </Text>
              </View>
              <Text style={styles.selectedPlanDays}>
                {selectedPlan === '100day' ? '100' : '365'} Days
              </Text>
            </View>

            <View style={styles.resultsGrid}>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>BMR (Base Burn)</Text>
                <Text style={styles.resultValue}>{bmr} kcal</Text>
              </View>

              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>Daily Target</Text>
                <Text style={[styles.resultValue, { color: '#00A8FF' }]}>{macros.daily_calories} kcal</Text>
              </View>
            </View>

            <View style={styles.macrosCard}>
              <Text style={styles.macroCardTitle}>Recommended Daily Macros</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#FF4444' }]}>{macros.protein_g}g</Text>
                  <Text style={styles.macroLbl}>Protein ({Math.round(GOAL_CONFIG[goalType].proteinPct * 100)}%)</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#FFAA00' }]}>{macros.carbs_g}g</Text>
                  <Text style={styles.macroLbl}>Carbs ({Math.round(GOAL_CONFIG[goalType].carbsPct * 100)}%)</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#00FF88' }]}>{macros.fat_g}g</Text>
                  <Text style={styles.macroLbl}>Fat ({Math.round(GOAL_CONFIG[goalType].fatPct * 100)}%)</Text>
                </View>
              </View>
            </View>

            <Text style={styles.awakenPrompt}>
              "You have been chosen by the System. Complete daily quests and workouts to level up."
            </Text>
          </View>
        )}

        {/* NAVIGATION BUTTONS */}
        <View style={styles.buttonRow}>
          {step > 1 && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => setStep((s) => (s - 1) as any)}
            >
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {step < 5 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>Next Step →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.awakenBtn, saving && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={saving}
            >
              <Text style={styles.awakenBtnText}>
                {saving ? 'Saving Profile...' : 'Awaken & Begin Journey →'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1120',
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginVertical: Spacing.two,
  },
  systemTitle: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  systemSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    padding: Spacing.four,
    gap: Spacing.threeHalf,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '500',
  },
  textInput: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#E8ECF4',
    fontSize: 15,
    fontFamily: Fonts.sans,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
  },
  toggleText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: '#6B7B8F',
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#00A8FF',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  activityList: {
    gap: Spacing.two,
  },
  activityOption: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 12,
    gap: 4,
  },
  activityOptionActive: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  activityTitleActive: {
    color: '#00A8FF',
  },
  activityMultiplier: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    fontWeight: '700',
  },
  activityDesc: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
  goalList: {
    gap: Spacing.two,
  },
  goalOption: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    gap: 6,
  },
  goalOptionActive: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
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
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  goalTitleActive: {
    color: '#00A8FF',
  },
  goalTagBadge: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  goalTagBadgeActive: {
    borderColor: 'rgba(0, 168, 255, 0.4)',
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
  },
  goalTagText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
  },
  goalTagTextActive: {
    color: '#00A8FF',
  },
  goalSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    lineHeight: 16,
  },
  selectedGoalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  selectedGoalEmoji: {
    fontSize: 24,
  },
  selectedGoalTag: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  selectedGoalName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  selectedGoalOffset: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#00FF88',
  },
  resultsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  resultBox: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    textAlign: 'center',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#E8ECF4',
  },
  macrosCard: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  macroCardTitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00A8FF',
    textAlign: 'center',
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
    color: '#8896AB',
  },
  awakenPrompt: {
    fontSize: 13,
    fontStyle: 'italic',
    fontFamily: Fonts.sans,
    color: '#8896AB',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
    fontSize: 14,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: '#0066BB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00A8FF',
  },
  nextBtnText: {
    fontFamily: Fonts.sans,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  awakenBtn: {
    flex: 2,
    backgroundColor: '#00A8FF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  awakenBtnText: {
    fontFamily: Fonts.sans,
    color: '#0B1120',
    fontWeight: '700',
    fontSize: 15,
  },
  // Plan selection styles
  planList: {
    gap: Spacing.two,
  },
  planOption: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  planOptionActive: {
    borderColor: '#00A8FF',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
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
    color: '#E8ECF4',
    fontFamily: Fonts.sans,
  },
  planTitleActive: {
    color: '#00A8FF',
  },
  planDaysBadge: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planDaysBadgeActive: {
    borderColor: 'rgba(0, 168, 255, 0.4)',
    backgroundColor: 'rgba(0, 168, 255, 0.12)',
  },
  planDaysText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
  },
  planDaysTextActive: {
    color: '#00A8FF',
  },
  planSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    lineHeight: 17,
  },
  planPhases: {
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  planPhaseTag: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
  },
  selectedPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  selectedPlanDays: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
  },
});
