import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withRepeat,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  getProfile,
  getMealsForDate,
  getDailyCalorieSummary,
  deleteMeal,
  getLocalDateString,
} from '@/db/operations';
import { type Profile, type Meal, type DailyCalorieSummary, type MealCategory } from '@/types';
import { calculateMacros } from '@/lib/calculations/bmr';
import { Fonts } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ─────────────── ASSETS ─────────────── */
const ICONS = {
  soloAppIcon: require('@/../public/solo-app-icon.png'),
  calendar: require('@/../public/calendar-days.svg'),
  trendingDown: require('@/../public/trending-down-meal.svg'),
  trendingUp: require('@/../public/trending-up.svg'),
  sunrise: require('@/../public/sunrise.svg'),
  sun: require('@/../public/sun.svg'),
  utensils: require('@/../public/utensils.svg'),
  apple: require('@/../public/apple.svg'),
  plus: require('@/../public/plus.svg'),
  info: require('@/../public/info.svg'),
};

/* ─────────────── 10-SEGMENT ANIMATED TRACK ─────────────── */
function CalorieSegmentedTrack({
  totalSegments = 10,
  activeCount = 6,
  activeColor = '#20C8FF',
  inactiveColor = '#191D35',
}: {
  totalSegments?: number;
  activeCount?: number;
  activeColor?: string;
  inactiveColor?: string;
}) {
  const segments = useMemo(() => Array.from({ length: totalSegments }), [totalSegments]);
  const clampedActive = Math.max(0, Math.min(totalSegments, activeCount));

  return (
    <View style={styles.calorieTrackContainer}>
      {segments.map((_, i) => {
        const isActive = i < clampedActive;
        const isLeading = i === clampedActive - 1;
        return (
          <View
            key={i}
            style={[
              styles.calorieTrackSegment,
              {
                backgroundColor: isActive ? activeColor : inactiveColor,
              },
              isActive && isLeading
                ? {
                    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.65)',
                    shadowColor: activeColor,
                    shadowOpacity: 0.8,
                    shadowRadius: 6,
                    elevation: 4,
                  }
                : null,
            ]}
          />
        );
      })}
    </View>
  );
}

/* ─────────────── ANIMATED MACRO BAR ─────────────── */
function AnimatedMacroBar({
  current,
  target,
  color,
}: {
  current: number;
  target: number;
  color: string;
}) {
  const percentage = Math.min(100, Math.max(0, target > 0 ? (current / target) * 100 : 0));
  const widthAnim = useSharedValue(0);

  useEffect(() => {
    widthAnim.value = withSpring(percentage, { damping: 15, stiffness: 120 });
  }, [percentage]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthAnim.value}%`,
  }));

  return (
    <View style={styles.macroTrackBg}>
      <Animated.View style={[styles.macroTrackFill, { backgroundColor: color }, animatedStyle]} />
    </View>
  );
}

export default function MealsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const { playTouchSound, playClaimSound } = useAudio();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [summary, setSummary] = useState<DailyCalorieSummary>({
    consumed: 0,
    burned: 0,
    target: 2000,
    net: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fat_consumed: 0,
  });

  // Selected date (defaults to today)
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Nutrition Goal Mode: 'lose_weight' vs 'gain_weight'
  const [activeGoal, setActiveGoal] = useState<'lose_weight' | 'gain_weight'>('lose_weight');
  const [refreshing, setRefreshing] = useState(false);

  // Add button breathing animation
  const buttonPulse = useSharedValue(1);

  useEffect(() => {
    buttonPulse.value = withRepeat(
      withSequence(
        withTiming(1.02, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonPulse.value }],
  }));

  // Fetch real database data
  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(db);
      setProfile(p);

      // If user profile has goal_type, align with it initially
      if (p?.goal_type === 'gain_weight') {
        setActiveGoal('gain_weight');
      } else {
        setActiveGoal('lose_weight');
      }

      const mealList = await getMealsForDate(db, selectedDate);
      setMeals(mealList);

      const sum = await getDailyCalorieSummary(db, selectedDate);
      setSummary(sum);
    } catch (err) {
      console.warn('[MealsScreen] loadData error:', err);
    }
  }, [db, selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Compute player's target macros based on profile TDEE and active goal
  const playerTargets = useMemo(() => {
    const tdee = profile?.tdee ?? 2200;
    const computed = calculateMacros(tdee, activeGoal);

    // If profile has daily_calories and goal matches profile.goal_type, prioritize profile's saved values
    if (profile?.daily_calories && profile.goal_type === activeGoal) {
      return {
        daily_calories: Math.round(profile.daily_calories),
        protein_g: Math.round(profile.protein_g ?? computed.protein_g),
        carbs_g: Math.round(profile.carbs_g ?? computed.carbs_g),
        fat_g: Math.round(profile.fat_g ?? computed.fat_g),
      };
    }

    return {
      daily_calories: computed.daily_calories,
      protein_g: computed.protein_g,
      carbs_g: computed.carbs_g,
      fat_g: computed.fat_g,
    };
  }, [profile, activeGoal]);

  // Compute reference examples for hint text
  const targetExamples = useMemo(() => {
    const tdee = profile?.tdee ?? 2200;
    const loss = calculateMacros(tdee, 'lose_weight');
    const gain = calculateMacros(tdee, 'gain_weight');
    return {
      loss: `${loss.daily_calories.toLocaleString()} kcal · P ${loss.protein_g} g · C ${loss.carbs_g} g · F ${loss.fat_g} g`,
      gain: `${gain.daily_calories.toLocaleString()} kcal · P ${gain.protein_g} g · C ${gain.carbs_g} g · F ${gain.fat_g} g`,
    };
  }, [profile]);

  // Daily target calculations
  const targetCalories = playerTargets.daily_calories;
  const consumedCalories = summary.consumed;
  const remainingCalories = Math.max(0, targetCalories - consumedCalories);
  const percentOfTarget = targetCalories > 0 ? Math.round((consumedCalories / targetCalories) * 100) : 0;
  const activeSegments = Math.min(10, Math.round((consumedCalories / targetCalories) * 10));

  // Macros progress
  const targetP = playerTargets.protein_g;
  const consumedP = summary.protein_consumed;
  const leftP = Math.max(0, targetP - consumedP);

  const targetC = playerTargets.carbs_g;
  const consumedC = summary.carbs_consumed;
  const leftC = Math.max(0, targetC - consumedC);

  const targetF = playerTargets.fat_g;
  const consumedF = summary.fat_consumed;
  const leftF = Math.max(0, targetF - consumedF);

  // Date label formatting
  const dateLabel = useMemo(() => {
    const d = new Date(selectedDate + 'T00:00:00');
    const isToday = selectedDate === todayStr;
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    return isToday ? `Today, ${month} ${day}` : `${month} ${day}`;
  }, [selectedDate, todayStr]);

  // Date toggle (Yesterday <-> Today)
  const handleDatePress = () => {
    playTouchSound();
    // Toggle between today and yesterday for quick inspection
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yStr = getLocalDateString(yesterday);
    if (selectedDate === todayStr) {
      setSelectedDate(yStr);
    } else {
      setSelectedDate(todayStr);
    }
  };

  // Switch Goal option
  const handleGoalSelect = (goal: 'lose_weight' | 'gain_weight') => {
    playTouchSound();
    setActiveGoal(goal);
  };

  // Open Add Meal screen
  const handleAddMealPress = () => {
    playTouchSound();
    router.push('/add-meal' as any);
  };

  // Delete meal with confirmation
  const handleDeleteMeal = (meal: Meal) => {
    playTouchSound();
    Alert.alert(
      'Delete Meal Entry',
      `Remove "${meal.name}" (${meal.calories} kcal) from your protocol log?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteMeal(db, meal.id);
            playClaimSound();
            loadData();
          },
        },
      ]
    );
  };

  // Helper for category icon
  const getCategoryIcon = (category?: MealCategory | string) => {
    switch (category) {
      case 'breakfast':
        return ICONS.sunrise;
      case 'lunch':
        return ICONS.sun;
      case 'dinner':
        return ICONS.utensils;
      case 'snack':
      default:
        return ICONS.apple;
    }
  };

  // Format meal time e.g. "08:00"
  const formatMealTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '12:00';
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#20C8FF"
            colors={['#20C8FF']}
          />
        }
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

          {/* ─────────────── MEALS CONTENT CONTAINER ─────────────── */}
          <View style={styles.mealsContent}>
            {/* ───────── PAGE HEADER ───────── */}
            <View style={styles.pageHeader}>
              <View style={styles.headingColumn}>
                <Text style={styles.subHeading}>NUTRITION PROTOCOL</Text>
                <Text style={styles.pageTitle}>MEALS</Text>
              </View>

              <TouchableOpacity
                style={styles.dateSelector}
                onPress={handleDatePress}
                activeOpacity={0.7}
              >
                <Image source={ICONS.calendar} style={styles.dateIcon} contentFit="contain" />
                <Text style={styles.dateText}>{dateLabel}</Text>
              </TouchableOpacity>
            </View>

            {/* ───────── GOAL SELECTOR ───────── */}
            <View style={styles.goalSelector}>
              <TouchableOpacity
                style={[
                  styles.goalOption,
                  activeGoal === 'lose_weight' && styles.goalOptionActive,
                ]}
                onPress={() => handleGoalSelect('lose_weight')}
                activeOpacity={0.8}
              >
                <Image
                  source={ICONS.trendingDown}
                  style={[
                    styles.goalIcon,
                    { tintColor: activeGoal === 'lose_weight' ? '#20C8FF' : '#818AA9' },
                  ]}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.goalOptionText,
                    activeGoal === 'lose_weight' && styles.goalOptionTextActive,
                  ]}
                >
                  Weight loss
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.goalOption,
                  activeGoal === 'gain_weight' && styles.goalOptionActive,
                ]}
                onPress={() => handleGoalSelect('gain_weight')}
                activeOpacity={0.8}
              >
                <Image
                  source={ICONS.trendingUp}
                  style={[
                    styles.goalIcon,
                    { tintColor: activeGoal === 'gain_weight' ? '#20C8FF' : '#818AA9' },
                  ]}
                  contentFit="contain"
                />
                <Text
                  style={[
                    styles.goalOptionText,
                    activeGoal === 'gain_weight' && styles.goalOptionTextActive,
                  ]}
                >
                  Weight gain
                </Text>
              </TouchableOpacity>
            </View>

            {/* ───────── GOAL EXAMPLE HINT ───────── */}
            <Text style={styles.goalHintText}>
              {activeGoal === 'gain_weight'
                ? `Gain example: ${targetExamples.gain}`
                : `Gain example: ${targetExamples.gain}`}
            </Text>

            {/* ───────── DAILY INTAKE CARD ───────── */}
            <View style={styles.dailyIntakeCard}>
              {/* Cyan Energy Rail on Left */}
              <View style={styles.energyRail} />

              {/* Intake Heading */}
              <View style={styles.intakeHeadingRow}>
                <Text style={styles.intakeTitle}>DAILY INTAKE</Text>
                <Text style={styles.intakePercentText}>{percentOfTarget}% OF TARGET</Text>
              </View>

              {/* Calories Summary */}
              <View style={styles.caloriesSummaryRow}>
                <Text style={styles.caloriesText}>
                  {consumedCalories.toLocaleString()}
                  <Text style={styles.caloriesTargetText}> / {targetCalories.toLocaleString()} kcal</Text>
                </Text>
              </View>

              {/* 10-Segment Calorie Progress Bar */}
              <CalorieSegmentedTrack
                totalSegments={10}
                activeCount={activeSegments}
                activeColor="#20C8FF"
                inactiveColor="#191D35"
              />

              {/* Remaining Calories Subtitle */}
              <Text style={styles.caloriesRemainingText}>
                {remainingCalories.toLocaleString()} kcal remaining today
              </Text>

              {/* Card Divider */}
              <View style={styles.cardDivider} />

              {/* Macronutrient Targets Grid */}
              <View style={styles.macroGridRow}>
                {/* Protein */}
                <View style={styles.macroCol}>
                  <Text style={[styles.macroLabel, { color: '#20C8FF' }]}>PROTEIN</Text>
                  <Text style={styles.macroValText}>
                    {consumedP}
                    <Text style={styles.macroTargetText}> / {targetP} g</Text>
                  </Text>
                  <AnimatedMacroBar current={consumedP} target={targetP} color="#20C8FF" />
                  <Text style={styles.macroLeftText}>{leftP} g left</Text>
                </View>

                {/* Carbs */}
                <View style={styles.macroCol}>
                  <Text style={[styles.macroLabel, { color: '#B7A8FF' }]}>CARBS</Text>
                  <Text style={styles.macroValText}>
                    {consumedC}
                    <Text style={styles.macroTargetText}> / {targetC} g</Text>
                  </Text>
                  <AnimatedMacroBar current={consumedC} target={targetC} color="#B7A8FF" />
                  <Text style={styles.macroLeftText}>{leftC} g left</Text>
                </View>

                {/* Fats */}
                <View style={styles.macroCol}>
                  <Text style={[styles.macroLabel, { color: '#FFB84D' }]}>FATS</Text>
                  <Text style={styles.macroValText}>
                    {consumedF}
                    <Text style={styles.macroTargetText}> / {targetF} g</Text>
                  </Text>
                  <AnimatedMacroBar current={consumedF} target={targetF} color="#FFB84D" />
                  <Text style={styles.macroLeftText}>{leftF} g left</Text>
                </View>
              </View>
            </View>

            {/* ───────── MEAL LOG SECTION ───────── */}
            <View style={styles.mealLogSection}>
              <View style={styles.mealLogHeaderRow}>
                <Text style={styles.mealLogTitle}>MEAL LOG</Text>
                <Text style={styles.mealLogCountText}>
                  {meals.length} {meals.length === 1 ? 'meal logged' : 'meals logged'}
                </Text>
              </View>

              {meals.length === 0 ? (
                <View style={styles.emptyMealBox}>
                  <Text style={styles.emptyMealTitle}>NO PROTOCOL ENTRIES TODAY</Text>
                  <Text style={styles.emptyMealDesc}>
                    Tap "+ ADD MEAL" below to record your nutritional fuel.
                  </Text>
                </View>
              ) : (
                meals.map((meal, idx) => {
                  const cat = meal.category || 'lunch';
                  const catIcon = getCategoryIcon(cat);
                  const timeStr = formatMealTime(meal.logged_at);

                  return (
                    <Animated.View
                      key={meal.id}
                      entering={FadeInDown.delay(idx * 70).springify()}
                    >
                      <Pressable
                        style={({ pressed }) => [
                          styles.mealCard,
                          pressed && styles.mealCardPressed,
                        ]}
                        onLongPress={() => handleDeleteMeal(meal)}
                      >
                        <View style={styles.categoryIconBox}>
                          <Image
                            source={catIcon}
                            style={styles.categoryIcon}
                            contentFit="contain"
                          />
                        </View>

                        <View style={styles.mealDetailsCol}>
                          <Text style={styles.mealCategoryTime}>
                            {cat.toUpperCase()} · {timeStr}
                          </Text>
                          <Text style={styles.mealNameText} numberOfLines={1}>
                            {meal.name}
                          </Text>
                          <Text style={styles.mealMacrosText}>
                            P {Math.round(meal.protein_g)} g  ·  C {Math.round(meal.carbs_g)} g  ·  F {Math.round(meal.fat_g)} g
                          </Text>
                        </View>

                        <View style={styles.mealEnergyCol}>
                          <Text style={styles.mealEnergyVal}>{Math.round(meal.calories)}</Text>
                          <Text style={styles.mealEnergyUnit}>kcal</Text>
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })
              )}
            </View>

            {/* ───────── PRIMARY ACTION: ADD MEAL ───────── */}
            <Animated.View style={buttonAnimatedStyle}>
              <TouchableOpacity
                style={styles.addMealButton}
                onPress={handleAddMealPress}
                activeOpacity={0.85}
              >
                <Image source={ICONS.plus} style={styles.addMealIcon} contentFit="contain" />
                <Text style={styles.addMealText}>ADD MEAL</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* ───────── NUTRITION DISCLAIMER ───────── */}
            <View style={styles.disclaimerRow}>
              <Image source={ICONS.info} style={styles.infoIcon} contentFit="contain" />
              <Text style={styles.disclaimerText}>
                Illustrative nutrition estimates. Not a personalized plan.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ─────────────── EXACT FIGMA STYLES ─────────────── */
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
    paddingBottom: Platform.OS === 'android' ? 90 : 100,
  },
  responsiveWrapper: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },

  /* Solo App Header (#56:399) */
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

  /* Meals Content Container (#56:403) */
  mealsContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },

  /* Page Header (#56:404) */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 7,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
  },
  dateIcon: {
    width: 14,
    height: 14,
  },
  dateText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#9CE9FF',
  },

  /* Goal Selector (#56:411) */
  goalSelector: {
    flexDirection: 'row',
    padding: 4,
    gap: 4,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
  },
  goalOption: {
    flex: 1,
    height: 34,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  goalOptionActive: {
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderColor: '#6C5CFF',
  },
  goalIcon: {
    width: 14,
    height: 14,
  },
  goalOptionText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '700',
    color: '#818AA9',
  },
  goalOptionTextActive: {
    color: '#F5F7FF',
  },
  goalHintText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#A8B0CE',
    lineHeight: 13,
  },

  /* Daily Intake Card (#56:419) */
  dailyIntakeCard: {
    position: 'relative',
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    overflow: 'hidden',
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.27)',
    shadowColor: '#6C5CFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 2 },
    elevation: 8,
  },
  energyRail: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#20C8FF',
  },
  intakeHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  intakeTitle: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#20C8FF',
    letterSpacing: 0.8,
  },
  intakePercentText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '800',
    color: '#B7A8FF',
  },
  caloriesSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  caloriesText: {
    fontFamily: Fonts.sans,
    fontSize: 30,
    fontWeight: '800',
    color: '#F5F7FF',
    letterSpacing: -0.5,
  },
  caloriesTargetText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '600',
    color: '#A8B0CE',
  },

  /* 10-Segment Calorie Track */
  calorieTrackContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    height: 6,
    width: '100%',
  },
  calorieTrackSegment: {
    flex: 1,
    height: 6,
    borderRadius: 2,
  },
  caloriesRemainingText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: '#9CE9FF',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#2A3154',
    marginVertical: 2,
  },

  /* Macronutrients 3-Col Grid (#56:439) */
  macroGridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  macroCol: {
    flex: 1,
    gap: 5,
  },
  macroLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  macroValText: {
    fontFamily: Fonts.sans,
    fontSize: 17,
    fontWeight: '800',
    color: '#F5F7FF',
  },
  macroTargetText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '500',
    color: '#A8B0CE',
  },
  macroTrackBg: {
    height: 4,
    backgroundColor: '#191D35',
    borderRadius: 4,
    overflow: 'hidden',
  },
  macroTrackFill: {
    height: 4,
    borderRadius: 4,
  },
  macroLeftText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#A8B0CE',
  },

  /* Meal Log (#56:458) */
  mealLogSection: {
    gap: 8,
    marginTop: 4,
  },
  mealLogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealLogTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F7FF',
    letterSpacing: -0.2,
  },
  mealLogCountText: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '600',
    color: '#20C8FF',
  },
  emptyMealBox: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  emptyMealTitle: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#20C8FF',
    letterSpacing: 0.6,
  },
  emptyMealDesc: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#818AA9',
    textAlign: 'center',
  },
  mealCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mealCardPressed: {
    borderColor: '#6C5CFF',
    backgroundColor: '#14182D',
  },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 16,
    height: 16,
  },
  mealDetailsCol: {
    flex: 1,
    gap: 3,
  },
  mealCategoryTime: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: '#818AA9',
    letterSpacing: 0.4,
  },
  mealNameText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: '#F5F7FF',
  },
  mealMacrosText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#A8B0CE',
  },
  mealEnergyCol: {
    alignItems: 'flex-end',
    gap: 1,
  },
  mealEnergyVal: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F7FF',
  },
  mealEnergyUnit: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    fontWeight: '400',
    color: '#818AA9',
  },

  /* Primary Action: Add Meal Button (#56:492) */
  addMealButton: {
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
    marginTop: 4,
  },
  addMealIcon: {
    width: 18,
    height: 18,
    tintColor: '#050611',
  },
  addMealText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#050611',
    letterSpacing: 0.5,
  },

  /* Nutrition Disclaimer (#56:495) */
  disclaimerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 7,
    marginTop: 2,
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
});
