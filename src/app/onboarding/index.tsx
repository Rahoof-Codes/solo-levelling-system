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
    title: 'LOSE WEIGHT (DEFICIT)',
    emoji: '🔥',
    subtitle: 'Calorie deficit (-500 kcal) with high protein to burn fat and preserve lean muscle.',
    tag: '-500 KCAL / DAY',
  },
  {
    value: 'maintain',
    title: 'MAINTAIN WEIGHT (ENERGY BALANCE)',
    emoji: '⚖️',
    subtitle: 'Balanced caloric maintenance to sustain current weight and build steady physical baseline.',
    tag: 'TDEE MATCH',
  },
  {
    value: 'gain_weight',
    title: 'GAIN WEIGHT (BULK)',
    emoji: '⚔️',
    subtitle: 'Caloric surplus (+500 kcal) paired with combat stimulus to build massive strength & size.',
    tag: '+500 KCAL / DAY',
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
        Alert.alert('System Error', 'All physical calibration fields are required.');
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
      Alert.alert('Initialization Failed', err?.message ?? 'Could not initialize Hunter profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* TOP SYSTEM HEADER */}
        <View style={styles.header}>
          <Text style={styles.systemTitle}>[ SYSTEM CALIBRATION ]</Text>
          <Text style={styles.systemSubtitle}>
            {step === 1 && 'STEP 1/5: SCANNING HUNTER PHYSIQUE'}
            {step === 2 && 'STEP 2/5: ANALYZING COMBAT ACTIVITY'}
            {step === 3 && 'STEP 3/5: SELECT PRIMARY DIRECTIVE'}
            {step === 4 && 'STEP 4/5: SELECT TRAINING PROTOCOL'}
            {step === 5 && 'STEP 5/5: SYSTEM INITIALIZATION READY'}
          </Text>
        </View>

        {/* STEP 1: PHYSICAL CALIBRATION */}
        {step === 1 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>HUNTER PARAMETERS</Text>

            {/* Hunter Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>HUNTER CODENAME</Text>
              <TextInput
                style={styles.textInput}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter Hunter Name"
                placeholderTextColor="#3B5375"
              />
            </View>

            {/* Sex Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>BIOLOGICAL PROFILE</Text>
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[styles.toggleBtn, sex === 'male' && styles.toggleBtnActive]}
                  onPress={() => setSex('male')}
                >
                  <Text style={[styles.toggleText, sex === 'male' && styles.toggleTextActive]}>
                    MALE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, sex === 'female' && styles.toggleBtnActive]}
                  onPress={() => setSex('female')}
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
                  placeholderTextColor="#3B5375"
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
                  placeholderTextColor="#3B5375"
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
                  placeholderTextColor="#3B5375"
                />
              </View>
            </View>
          </View>
        )}

        {/* STEP 2: ACTIVITY LEVEL */}
        {step === 2 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>ACTIVITY MULTIPLIER</Text>

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

        {/* STEP 3: WEIGHT GOAL SECTION (3 OPTIONS: LOSE WEIGHT, MAINTAIN, GAIN WEIGHT) */}
        {step === 3 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>PHYSICAL DIRECTIVE (GOAL)</Text>

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
            <Text style={styles.cardHeader}>TRAINING PROTOCOL</Text>

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
                      SHADOW AWAKENING
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
                      MONARCH'S ASCENSION
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
          </View>
        )}

        {/* STEP 5: RESULTS / SYSTEM CONFIRMATION */}
        {step === 5 && (
          <View style={styles.card}>
            <Text style={styles.cardHeader}>CALIBRATION COMPLETE</Text>

            {/* Selected Goal Banner */}
            <View style={styles.selectedGoalBanner}>
              <Text style={styles.selectedGoalEmoji}>
                {GOAL_CONFIG[goalType].emoji}
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.selectedGoalTag}>ACTIVE DIRECTIVE</Text>
                <Text style={styles.selectedGoalName}>
                  {GOAL_CONFIG[goalType].label.toUpperCase()}
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
                <Text style={styles.selectedGoalTag}>TRAINING PROTOCOL</Text>
                <Text style={styles.selectedGoalName}>
                  {selectedPlan === '100day' ? 'SHADOW AWAKENING' : "MONARCH'S ASCENSION"}
                </Text>
              </View>
              <Text style={styles.selectedPlanDays}>
                {selectedPlan === '100day' ? '100' : '365'} DAYS
              </Text>
            </View>

            <View style={styles.resultsGrid}>
              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>BMR (BASE BURN)</Text>
                <Text style={styles.resultValue}>{bmr} kcal</Text>
              </View>

              <View style={styles.resultBox}>
                <Text style={styles.resultLabel}>DAILY CALORIE TARGET</Text>
                <Text style={[styles.resultValue, { color: '#00F0FF' }]}>{macros.daily_calories} kcal</Text>
              </View>
            </View>

            <View style={styles.macrosCard}>
              <Text style={styles.macroCardTitle}>RECOMMENDED DAILY MACROS</Text>
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#FF4444' }]}>{macros.protein_g}g</Text>
                  <Text style={styles.macroLbl}>PROTEIN ({Math.round(GOAL_CONFIG[goalType].proteinPct * 100)}%)</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#FFAA00' }]}>{macros.carbs_g}g</Text>
                  <Text style={styles.macroLbl}>CARBS ({Math.round(GOAL_CONFIG[goalType].carbsPct * 100)}%)</Text>
                </View>
                <View style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color: '#00FF88' }]}>{macros.fat_g}g</Text>
                  <Text style={styles.macroLbl}>FAT ({Math.round(GOAL_CONFIG[goalType].fatPct * 100)}%)</Text>
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
              <Text style={styles.backBtnText}>BACK</Text>
            </TouchableOpacity>
          )}

          {step < 5 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>NEXT STEP →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.awakenBtn, saving && { opacity: 0.6 }]}
              onPress={handleFinish}
              disabled={saving}
            >
              <Text style={styles.awakenBtnText}>
                {saving ? '⚡ INITIALIZING PROTOCOL...' : '⚔️ AWAKEN AS HUNTER'}
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
    backgroundColor: '#070B14',
  },
  container: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    alignItems: 'center',
    gap: 4,
    marginVertical: Spacing.two,
  },
  systemTitle: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    letterSpacing: 2,
  },
  systemSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#5B799E',
    letterSpacing: 1,
  },
  card: {
    backgroundColor: '#0D1424',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#19315A',
    padding: Spacing.three,
    gap: Spacing.three,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  cardHeader: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
    borderBottomWidth: 1,
    borderBottomColor: '#172744',
    paddingBottom: 6,
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
  textInput: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#E0E8FF',
    fontSize: 15,
    fontFamily: Fonts.mono,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  toggleBtnActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.12)',
  },
  toggleText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    color: '#556F91',
    fontWeight: '700',
  },
  toggleTextActive: {
    color: '#00F0FF',
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  activityList: {
    gap: Spacing.two,
  },
  activityOption: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#172B4C',
    borderRadius: 8,
    padding: 12,
    gap: 4,
  },
  activityOptionActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B0C8E8',
  },
  activityTitleActive: {
    color: '#00F0FF',
  },
  activityMultiplier: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    fontWeight: '700',
  },
  activityDesc: {
    fontSize: 11,
    color: '#5B7599',
  },
  goalList: {
    gap: Spacing.two,
  },
  goalOption: {
    backgroundColor: '#090E1A',
    borderWidth: 1.2,
    borderColor: '#172B4C',
    borderRadius: 10,
    padding: 12,
    gap: 6,
  },
  goalOptionActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 18,
  },
  goalTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#B0C8E8',
    fontFamily: Fonts.mono,
  },
  goalTitleActive: {
    color: '#00F0FF',
  },
  goalTagBadge: {
    backgroundColor: '#0E1729',
    borderWidth: 1,
    borderColor: '#1D355E',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  goalTagBadgeActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  goalTagText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#5E7D9E',
    fontWeight: '700',
  },
  goalTagTextActive: {
    color: '#00F0FF',
    fontWeight: '800',
  },
  goalSubtitle: {
    fontSize: 11,
    color: '#6582A6',
    lineHeight: 15,
  },
  selectedGoalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  selectedGoalEmoji: {
    fontSize: 22,
  },
  selectedGoalTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1,
  },
  selectedGoalName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E0E8FF',
  },
  selectedGoalOffset: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00FF88',
  },
  resultsGrid: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  resultBox: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#172B4C',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    gap: 4,
  },
  resultLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    textAlign: 'center',
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  macrosCard: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#172B4C',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  macroCardTitle: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
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
    fontWeight: '900',
    fontFamily: Fonts.mono,
  },
  macroLbl: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#5A7599',
  },
  awakenPrompt: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#7590B5',
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
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#1C335C',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: Fonts.mono,
    color: '#7A96BA',
    fontWeight: '700',
    fontSize: 14,
  },
  nextBtn: {
    flex: 2,
    backgroundColor: '#0055AA',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#00A8FF',
  },
  nextBtnText: {
    fontFamily: Fonts.mono,
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  awakenBtn: {
    flex: 2,
    backgroundColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  awakenBtnText: {
    fontFamily: Fonts.mono,
    color: '#070B14',
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  // Plan selection styles
  planList: {
    gap: Spacing.two,
  },
  planOption: {
    backgroundColor: '#090E1A',
    borderWidth: 1.5,
    borderColor: '#172B4C',
    borderRadius: 10,
    padding: 14,
    gap: 8,
  },
  planOptionActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.08)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
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
    fontSize: 14,
    fontWeight: '900',
    color: '#B0C8E8',
    fontFamily: Fonts.mono,
    letterSpacing: 0.5,
  },
  planTitleActive: {
    color: '#00F0FF',
  },
  planDaysBadge: {
    backgroundColor: '#0E1729',
    borderWidth: 1,
    borderColor: '#1D355E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  planDaysBadgeActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.15)',
  },
  planDaysText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#5E7D9E',
    fontWeight: '800',
  },
  planDaysTextActive: {
    color: '#00F0FF',
  },
  planSubtitle: {
    fontSize: 11,
    color: '#6582A6',
    lineHeight: 16,
  },
  planPhases: {
    backgroundColor: '#0A0F1C',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  planPhaseTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 0.5,
  },
  selectedPlanBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 240, 255, 0.06)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  selectedPlanDays: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00F0FF',
  },
});
