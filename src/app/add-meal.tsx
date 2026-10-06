import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useRouter } from 'expo-router';
import {
  getProfile,
  getDailyCalorieSummary,
  logMeal,
} from '@/db/operations';
import { type Profile, type DailyCalorieSummary, type MealCategory } from '@/types';
import { calculateMacros } from '@/lib/calculations/bmr';
import { Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ─────────────── ASSETS ─────────────── */
const ICONS = {
  soloAppIcon: require('@/../public/solo-app-icon.png'),
  arrowLeft: require('@/../public/arrow-left.svg'),
  chevronDown: require('@/../public/chevron-down.svg'),
  cornerDownRight: require('@/../public/corner-down-right.svg'),
  info: require('@/../public/info.svg'),
  check: require('@/../public/check.svg'),
};

const CATEGORIES: { key: MealCategory; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snack' },
];

const SERVING_OPTIONS = [
  'Bowl (350 g)',
  'Plate (450 g)',
  'Serving (250 g)',
  'Portion (150 g)',
  'Cup (200 g)',
  'Custom (g)',
];

export default function AddMealScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { playTouchSound, playClaimSound } = useAudio();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<DailyCalorieSummary>({
    consumed: 0,
    burned: 0,
    target: 2000,
    net: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fat_consumed: 0,
  });

  // Form State
  const [mealName, setMealName] = useState('');
  const [category, setCategory] = useState<MealCategory>('dinner');
  const [amount, setAmount] = useState('1');
  const [servingUnit, setServingUnit] = useState('Bowl (350 g)');
  const [servingDropdownOpen, setServingDropdownOpen] = useState(false);

  // Nutrition Inputs
  const [calories, setCalories] = useState('520');
  const [protein, setProtein] = useState('40');
  const [carbs, setCarbs] = useState('54');
  const [fats, setFats] = useState('16');

  // Load profile and current daily summary
  useEffect(() => {
    async function init() {
      try {
        const p = await getProfile(db);
        setProfile(p);
        const s = await getDailyCalorieSummary(db);
        setSummary(s);
      } catch (e) {
        console.warn('[AddMealScreen] Init error:', e);
      }
    }
    init();
  }, [db]);

  // Player Target Macros
  const targets = useMemo(() => {
    const goal = profile?.goal_type || 'lose_weight';
    const tdee = profile?.tdee ?? 2200;
    const computed = calculateMacros(tdee, goal === 'maintain' ? 'lose_weight' : goal);

    return {
      goalName: goal === 'gain_weight' ? 'WEIGHT GAIN' : 'WEIGHT LOSS',
      daily_calories: profile?.daily_calories ? Math.round(profile.daily_calories) : computed.daily_calories,
      protein_g: profile?.protein_g ? Math.round(profile.protein_g) : computed.protein_g,
      carbs_g: profile?.carbs_g ? Math.round(profile.carbs_g) : computed.carbs_g,
      fat_g: profile?.fat_g ? Math.round(profile.fat_g) : computed.fat_g,
    };
  }, [profile]);

  // Projected Calculations
  const enteredCal = parseFloat(calories) || 0;
  const enteredP = parseFloat(protein) || 0;
  const enteredC = parseFloat(carbs) || 0;
  const enteredF = parseFloat(fats) || 0;
  const amtMultiplier = Math.max(0.1, parseFloat(amount) || 1);

  const totalMealCal = Math.round(enteredCal * amtMultiplier);
  const totalMealP = Math.round(enteredP * amtMultiplier);
  const totalMealC = Math.round(enteredC * amtMultiplier);
  const totalMealF = Math.round(enteredF * amtMultiplier);

  const projectedCalories = summary.consumed + totalMealCal;
  const projectedRemaining = Math.max(0, targets.daily_calories - projectedCalories);
  const projectedPercent = Math.min(100, Math.max(0, (projectedCalories / targets.daily_calories) * 100));

  const projectedP = summary.protein_consumed + totalMealP;
  const projectedC = summary.carbs_consumed + totalMealC;
  const projectedF = summary.fat_consumed + totalMealF;

  // Handle Save
  const handleSave = async () => {
    if (!mealName.trim()) {
      Alert.alert('Required Field', 'Please enter a name for the meal.');
      return;
    }

    try {
      playClaimSound();
      await logMeal(db, {
        name: mealName.trim(),
        category,
        calories: totalMealCal,
        protein_g: totalMealP,
        carbs_g: totalMealC,
        fat_g: totalMealF,
      });

      router.back();
    } catch (err) {
      console.warn('[AddMeal] Save error:', err);
      Alert.alert('Error', 'Failed to save meal. Please try again.');
    }
  };

  const handleBack = () => {
    playTouchSound();
    router.back();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.responsiveWrapper}>
            {/* ─────────────── SOLO APP HEADER ─────────────── */}
            <View style={styles.appHeader}>
              <View style={styles.brandRow}>
                <View style={styles.brandIconContainer}>
                  <Image source={ICONS.soloAppIcon} style={styles.brandIcon} contentFit="cover" />
                </View>
                <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
              </View>
            </View>

            {/* ─────────────── FORM CONTENT ─────────────── */}
            <View style={styles.formContent}>
              {/* Page Header with Back Button */}
              <View style={styles.pageHeader}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  activeOpacity={0.7}
                >
                  <Image source={ICONS.arrowLeft} style={styles.backIcon} contentFit="contain" />
                </TouchableOpacity>

                <View style={styles.headingColumn}>
                  <Text style={styles.subHeading}>NUTRITION PROTOCOL</Text>
                  <Text style={styles.pageTitle}>ADD MEAL</Text>
                </View>
              </View>

              {/* Entry Context Subtitle */}
              <View style={styles.entryContextRow}>
                <Text style={styles.entryContextText}>
                  Record your fuel. Keep your log complete.
                </Text>
                <Text style={styles.todayBadge}>TODAY</Text>
              </View>

              {/* Meal Name Input */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>MEAL NAME</Text>
                <View style={styles.inputBox}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Salmon & quinoa bowl"
                    placeholderTextColor="#697292"
                    value={mealName}
                    onChangeText={setMealName}
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Meal Category Choices */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>MEAL CATEGORY</Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map((c) => {
                    const isSelected = category === c.key;
                    return (
                      <TouchableOpacity
                        key={c.key}
                        style={[
                          styles.categoryPill,
                          isSelected && styles.categoryPillActive,
                        ]}
                        onPress={() => {
                          playTouchSound();
                          setCategory(c.key);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.categoryPillText,
                            isSelected && styles.categoryPillTextActive,
                          ]}
                        >
                          {c.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Amount & Serving Selector */}
              <View style={styles.amountServingRow}>
                {/* Quantity */}
                <View style={styles.amountCol}>
                  <Text style={styles.fieldLabel}>AMOUNT</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={amount}
                      onChangeText={setAmount}
                      keyboardType="decimal-pad"
                      textAlign="center"
                    />
                  </View>
                </View>

                {/* Serving Unit */}
                <View style={styles.servingCol}>
                  <Text style={styles.fieldLabel}>SERVING</Text>
                  <TouchableOpacity
                    style={styles.servingSelectorBox}
                    onPress={() => {
                      playTouchSound();
                      setServingDropdownOpen(!servingDropdownOpen);
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.servingSelectorText}>{servingUnit}</Text>
                    <Image source={ICONS.chevronDown} style={styles.chevronIcon} contentFit="contain" />
                  </TouchableOpacity>

                  {/* Serving Dropdown Options */}
                  {servingDropdownOpen && (
                    <View style={styles.dropdownMenu}>
                      {SERVING_OPTIONS.map((opt) => (
                        <TouchableOpacity
                          key={opt}
                          style={styles.dropdownItem}
                          onPress={() => {
                            playTouchSound();
                            setServingUnit(opt);
                            setServingDropdownOpen(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.dropdownItemText,
                              servingUnit === opt && styles.dropdownItemTextSelected,
                            ]}
                          >
                            {opt}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              {/* Nutrition Values Section */}
              <View style={styles.nutritionSection}>
                <View style={styles.nutritionHeaderRow}>
                  <Text style={styles.nutritionTitle}>NUTRITION</Text>
                  <Text style={styles.nutritionSub}>For amount entered</Text>
                </View>

                {/* Calories Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>CALORIES</Text>
                  <View style={styles.nutritionInputBox}>
                    <TextInput
                      style={[styles.nutritionInput, { color: '#9CE9FF' }]}
                      value={calories}
                      onChangeText={setCalories}
                      keyboardType="numeric"
                    />
                    <Text style={styles.nutritionUnit}>kcal</Text>
                  </View>
                </View>

                {/* Macronutrients 3-Col Input */}
                <View style={styles.macroInputsRow}>
                  {/* Protein */}
                  <View style={styles.macroInputCol}>
                    <Text style={styles.fieldLabel}>PROTEIN</Text>
                    <View style={styles.nutritionInputBox}>
                      <TextInput
                        style={[styles.nutritionInput, { color: '#20C8FF' }]}
                        value={protein}
                        onChangeText={setProtein}
                        keyboardType="numeric"
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Carbs */}
                  <View style={styles.macroInputCol}>
                    <Text style={styles.fieldLabel}>CARBS</Text>
                    <View style={styles.nutritionInputBox}>
                      <TextInput
                        style={[styles.nutritionInput, { color: '#B7A8FF' }]}
                        value={carbs}
                        onChangeText={setCarbs}
                        keyboardType="numeric"
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>

                  {/* Fats */}
                  <View style={styles.macroInputCol}>
                    <Text style={styles.fieldLabel}>FATS</Text>
                    <View style={styles.nutritionInputBox}>
                      <TextInput
                        style={[styles.nutritionInput, { color: '#FFB84D' }]}
                        value={fats}
                        onChangeText={setFats}
                        keyboardType="numeric"
                      />
                      <Text style={styles.nutritionUnit}>g</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* ───────── DAILY TOTAL PREVIEW CARD (#56:586) ───────── */}
              <View style={styles.previewCard}>
                <View style={styles.previewHeaderRow}>
                  <Text style={styles.previewTitle}>AFTER SAVING · {targets.goalName}</Text>
                  <Image source={ICONS.cornerDownRight} style={styles.cornerIcon} contentFit="contain" />
                </View>

                <View style={styles.projectedCalRow}>
                  <Text style={styles.projectedCalVal}>
                    {projectedCalories.toLocaleString()} / {targets.daily_calories.toLocaleString()} kcal
                  </Text>
                  <Text style={styles.projectedRemainingVal}>{projectedRemaining.toLocaleString()} left</Text>
                </View>

                {/* Progress Track */}
                <View style={styles.projectedTrackBg}>
                  <View style={[styles.projectedTrackFill, { width: `${projectedPercent}%` }]} />
                </View>

                {/* Projected Macros */}
                <Text style={styles.projectedMacrosText}>
                  Protein {projectedP} / {targets.protein_g} g · Carbs {projectedC} / {targets.carbs_g} g · Fats {projectedF} / {targets.fat_g} g
                </Text>
              </View>

              {/* Disclaimer */}
              <View style={styles.disclaimerRow}>
                <Image source={ICONS.info} style={styles.infoIcon} contentFit="contain" />
                <Text style={styles.disclaimerText}>
                  Illustrative nutrition estimates. Not a personalized plan.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* ───────── STICKY BOTTOM SAVE BUTTON AREA (#56:599) ───────── */}
        <View style={styles.saveAreaContainer}>
          <View style={styles.saveAreaWrapper}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Image source={ICONS.check} style={styles.checkIcon} contentFit="contain" />
              <Text style={styles.saveButtonText}>SAVE MEAL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ─────────────── STYLES ─────────────── */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050611',
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#050611',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },

  /* Solo App Header */
  appHeader: {
    height: 48,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
    overflow: 'hidden',
  },
  brandIcon: {
    width: 22,
    height: 22,
  },
  brandTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
    color: '#F5F7FF',
  },

  /* Form Content (#56:525) */
  formContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 18,
  },

  /* Page Header */
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 18,
    height: 18,
    tintColor: '#20C8FF',
  },
  headingColumn: {
    gap: 2,
  },
  subHeading: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#20C8FF',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontFamily: Fonts.sans,
    fontSize: 26,
    fontWeight: '800',
    color: '#F5F7FF',
    letterSpacing: -0.5,
  },

  /* Entry Context */
  entryContextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryContextText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '400',
    color: '#A8B0CE',
  },
  todayBadge: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#20C8FF',
    letterSpacing: 0.5,
  },

  /* Field Groups */
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#A8B0CE',
    letterSpacing: 0.4,
  },
  inputBox: {
    height: 48,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  textInput: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    color: '#F5F7FF',
    padding: 0,
  },

  /* Category Row */
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryPill: {
    flex: 1,
    height: 38,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryPillActive: {
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderColor: '#6C5CFF',
  },
  categoryPillText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#818AA9',
  },
  categoryPillTextActive: {
    color: '#9CE9FF',
  },

  /* Amount & Serving Row */
  amountServingRow: {
    flexDirection: 'row',
    gap: 10,
  },
  amountCol: {
    width: 90,
    gap: 6,
  },
  servingCol: {
    flex: 1,
    gap: 6,
    position: 'relative',
    zIndex: 10,
  },
  servingSelectorBox: {
    height: 48,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingSelectorText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#F5F7FF',
  },
  chevronIcon: {
    width: 14,
    height: 14,
    tintColor: '#A8B0CE',
  },
  dropdownMenu: {
    position: 'absolute',
    top: 70,
    left: 0,
    right: 0,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    zIndex: 100,
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A3154',
  },
  dropdownItemText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#A8B0CE',
  },
  dropdownItemTextSelected: {
    color: '#20C8FF',
    fontWeight: '700',
  },

  /* Nutrition Values Section */
  nutritionSection: {
    gap: 10,
  },
  nutritionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionTitle: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    color: '#F5F7FF',
    letterSpacing: 0.5,
  },
  nutritionSub: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '400',
    color: '#20C8FF',
  },
  nutritionInputBox: {
    height: 48,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nutritionInput: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    padding: 0,
  },
  nutritionUnit: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '400',
    color: '#818AA9',
  },
  macroInputsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  macroInputCol: {
    flex: 1,
    gap: 6,
  },

  /* Daily Total Preview Card (#56:586) */
  previewCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  previewHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewTitle: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#20C8FF',
    letterSpacing: 0.6,
  },
  cornerIcon: {
    width: 14,
    height: 14,
    tintColor: '#20C8FF',
  },
  projectedCalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  projectedCalVal: {
    fontFamily: Fonts.sans,
    fontSize: 19,
    fontWeight: '800',
    color: '#F5F7FF',
    letterSpacing: -0.3,
  },
  projectedRemainingVal: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#9CE9FF',
  },
  projectedTrackBg: {
    height: 4,
    backgroundColor: '#191D35',
    borderRadius: 4,
    overflow: 'hidden',
  },
  projectedTrackFill: {
    height: 4,
    backgroundColor: '#20C8FF',
    borderRadius: 4,
  },
  projectedMacrosText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#A8B0CE',
  },

  /* Disclaimer */
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
  },
  infoIcon: {
    width: 13,
    height: 13,
    marginTop: 1,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '400',
    lineHeight: 14,
    color: '#818AA9',
  },

  /* Sticky Bottom Save Area (#56:599) */
  saveAreaContainer: {
    backgroundColor: 'rgba(9, 11, 24, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#2A3154',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  saveAreaWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  saveButton: {
    height: 48,
    backgroundColor: '#20C8FF',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    boxShadow: '0px 0px 14px 1px rgba(32, 200, 255, 0.4)',
    shadowColor: '#20C8FF',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  checkIcon: {
    width: 18,
    height: 18,
    tintColor: '#050611',
  },
  saveButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#050611',
    letterSpacing: 0.5,
  },
});
