import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { type ActivityLevel, type GoalType, type Sex } from '@/types';
import {
  ACTIVITY_LEVEL_OPTIONS,
  GOAL_CONFIG,
  calculateBMR,
  calculateTDEE,
  calculateMacros,
} from '@/lib/calculations/bmr';
import { updateProfileOnboarding } from '@/db/operations';
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
    title: 'MAINTAIN WEIGHT (BALANCE)',
    emoji: '⚖️',
    subtitle: 'Equal energy balance (0 offset) to maintain current weight and optimize performance.',
    tag: 'TDEE MATCH',
  },
  {
    value: 'gain_weight',
    title: 'GAIN WEIGHT (SURPLUS)',
    emoji: '💪',
    subtitle: 'Calorie surplus (+500 kcal) with high carbohydrates to build mass and power.',
    tag: '+500 KCAL / DAY',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const db = useSQLiteContext();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [username, setUsername] = useState('Sung Jin-Woo');
  const [sex, setSex] = useState<Sex>('male');
  const [age, setAge] = useState('24');
  const [heightCm, setHeightCm] = useState('180');
  const [weightKg, setWeightKg] = useState('75');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [goalType, setGoalType] = useState<GoalType>('maintain');

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
    }
  };

  const handleFinish = async () => {
    try {
      await updateProfileOnboarding(db, {
        username: username.trim() || 'Hunter',
        age: parsedAge,
        height_cm: parsedHeight,
        weight_kg: parsedWeight,
        sex,
        activity_level: activityLevel,
        goal_type: goalType,
      });

      router.replace('/(tabs)');
    } catch (err: any) {
      Alert.alert('Initialization Failed', err?.message ?? 'Could not initialize Hunter profile');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* TOP SYSTEM HEADER */}
        <View style={styles.header}>
          <Text style={styles.systemTitle}>[ SYSTEM CALIBRATION ]</Text>
          <Text style={styles.systemSubtitle}>
            {step === 1 && 'STEP 1/4: SCANNING HUNTER PHYSIQUE'}
            {step === 2 && 'STEP 2/4: ANALYZING COMBAT ACTIVITY'}
            {step === 3 && 'STEP 3/4: SELECT PRIMARY DIRECTIVE'}
            {step === 4 && 'STEP 4/4: SYSTEM INITIALIZATION READY'}
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

        {/* STEP 4: RESULTS / SYSTEM CONFIRMATION */}
        {step === 4 && (
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

          {step < 4 ? (
            <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
              <Text style={styles.nextBtnText}>NEXT STEP →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.awakenBtn} onPress={handleFinish}>
              <Text style={styles.awakenBtnText}>⚔️ AWAKEN AS HUNTER</Text>
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
});
