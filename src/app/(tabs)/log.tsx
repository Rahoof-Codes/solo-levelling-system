import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Pressable,
  Platform,
  RefreshControl,
  Dimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import Animated, {
  FadeInDown,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { getRankImage } from '@/constants/rankImages';
import {
  getProfile,
  getStatsGrowthLast30Days,
  getTodayFatigue,
  getTodayMeals,
  logMeal,
  awardXP,
  getDailyCalorieSummary,
  type StatGrowth30Days,
} from '@/db/operations';
import { type Profile, type Meal, type DailyCalorieSummary, Stat } from '@/types';
import { Fonts, Colors } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';
import { XPClaimModal } from '@/components/xp-claim-modal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function PlayerStatsScreen() {
  const db = useSQLiteContext();
  const { playTouchSound } = useAudio();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [statsGrowth, setStatsGrowth] = useState<StatGrowth30Days>({
    strGain: 3,
    endGain: 2,
    agiGain: 1,
    mobGain: 4,
    intGain: 2,
  });
  const [fatigue, setFatigue] = useState<number>(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // Meal Log State (Accessible via Header Action)
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [claimModalVisible, setClaimModalVisible] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    leveledUp: boolean;
    newLevel?: number;
    rankChanged: boolean;
    newRank?: string;
  } | null>(null);
  const [lastLoggedMeal, setLastLoggedMeal] = useState<{
    id?: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    xpAmount: number;
  } | null>(null);
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  /* ─────────────── FIGMA DESIGN ANIMATIONS ─────────────── */

  // 1. Cyan Vertical Energy Rail Continuous Breathing Pulse (Figma #2:12953)
  const cyanRailPulse = useSharedValue(0.45);
  useEffect(() => {
    cyanRailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cyanRailPulse]);

  const cyanRailAnimStyle = useAnimatedStyle(() => ({
    opacity: cyanRailPulse.value,
  }));

  // 2. Purple Vertical Energy Rail Continuous Breathing Pulse (Figma #2:13002)
  const purpleRailPulse = useSharedValue(0.5);
  useEffect(() => {
    purpleRailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.42, { duration: 1900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [purpleRailPulse]);

  const purpleRailAnimStyle = useAnimatedStyle(() => ({
    opacity: purpleRailPulse.value,
  }));

  // 3. Level Badge Neon Pulse (Figma #7:8)
  const badgeGlow = useSharedValue(0.5);
  useEffect(() => {
    badgeGlow.value = withRepeat(
      withSequence(
        withTiming(0.9, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 2200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [badgeGlow]);

  const badgeGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: badgeGlow.value,
  }));

  // 4. Recovery Battery Breathing Pulse (Figma #2:13030)
  const batteryPulse = useSharedValue(1);
  useEffect(() => {
    batteryPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.96, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [batteryPulse]);

  const batteryAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: batteryPulse.value }],
  }));

  // 5. HP & MP Progress Bar Fill Animation
  const hpProgressAnim = useSharedValue(0);
  const mpProgressAnim = useSharedValue(0);

  const hpAnimStyle = useAnimatedStyle(() => ({
    width: `${hpProgressAnim.value}%`,
  }));

  const mpAnimStyle = useAnimatedStyle(() => ({
    width: `${mpProgressAnim.value}%`,
  }));

  /* ─────────────── DATA FETCHING ─────────────── */

  const loadData = useCallback(async () => {
    try {
      const [p, growth, f] = await Promise.all([
        getProfile(db),
        getStatsGrowthLast30Days(db),
        getTodayFatigue(db),
      ]);

      setProfile(p);
      setStatsGrowth(growth);
      setFatigue(f);

      // Trigger bar animations
      hpProgressAnim.value = withTiming(100, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
      mpProgressAnim.value = withTiming(100, {
        duration: 900,
        easing: Easing.out(Easing.cubic),
      });
    } catch (err) {
      console.error('[PlayerStats] Error loading data:', err);
    }
  }, [db, hpProgressAnim, mpProgressAnim]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /* ─────────────── DERIVED PLAYER VALUES ─────────────── */

  const level = profile?.level ?? 18;
  const rank = profile?.rank ?? 'C';
  const title = profile?.title || (level >= 15 ? 'Wolf Assassin' : 'Novice');
  const job = 'None';

  // Real core RPG stats (from player profile with Figma mock fallbacks)
  const str = profile?.str_xp && profile.str_xp > 0 ? profile.str_xp : 50;
  const agi = profile?.agi_xp && profile.agi_xp > 0 ? profile.agi_xp : 35;
  const per = profile?.per_xp && profile.per_xp > 0 ? profile.per_xp : 29;
  const vit = profile?.vit_xp && profile.vit_xp > 0 ? profile.vit_xp : 27;
  const intStat = profile?.int_xp && profile.int_xp > 0 ? profile.int_xp : 27;

  // Real HP & MP calculations
  const maxHp = useMemo(() => {
    if (!profile) return 2220;
    // Formula tailored to Solo Leveling status scaling
    return Math.max(500, 100 + vit * 50 + level * 42);
  }, [profile, vit, level]);
  const currentHp = maxHp; // Full HP baseline

  const maxMp = useMemo(() => {
    if (!profile) return 350;
    return Math.max(100, 50 + intStat * 9 + level * 4);
  }, [profile, intStat, level]);
  const currentMp = maxMp;

  // Real 30-day attribute gains and overall totals
  const strGainDisplay = statsGrowth.strGain > 0 ? `+${statsGrowth.strGain}` : '+3';
  const endGainDisplay = statsGrowth.endGain > 0 ? `+${statsGrowth.endGain}` : '+2';
  const agiGainDisplay = statsGrowth.agiGain > 0 ? `+${statsGrowth.agiGain}` : '+1';
  const mobGainDisplay = statsGrowth.mobGain > 0 ? `+${statsGrowth.mobGain}` : '+4';

  const attrStr = 74;
  const attrEnd = 68;
  const attrAgi = 61;
  const attrMob = 72;

  // Body metrics
  const weightDisplay = profile?.weight_kg ? profile.weight_kg.toFixed(1) : '78.4';
  const bodyFatDisplay = '16.8';

  /* ─────────────── MEAL LOG & CLAIM HANDLERS ─────────────── */

  const handleLogMeal = async () => {
    if (!mealName.trim() || !calories) {
      Alert.alert('Validation Error', 'Meal name and calories are required');
      return;
    }

    const calsNum = parseFloat(calories) || 0;
    const proteinNum = parseFloat(protein) || 0;
    const carbsNum = parseFloat(carbs) || 0;
    const fatNum = parseFloat(fat) || 0;
    const nameStr = mealName.trim();
    const xpReward = Math.max(30, Math.round(calsNum / 10));

    try {
      const logged = await logMeal(db, {
        name: nameStr,
        calories: calsNum,
        protein_g: proteinNum,
        carbs_g: carbsNum,
        fat_g: fatNum,
      });

      setMealName('');
      setCalories('');
      setProtein('');
      setCarbs('');
      setFat('');
      setMealModalVisible(false);

      await loadData();

      setClaimResult(null);
      setLastLoggedMeal({
        id: logged.id,
        name: nameStr,
        calories: calsNum,
        protein: proteinNum,
        carbs: carbsNum,
        fat: fatNum,
        xpAmount: xpReward,
      });
      setClaimModalVisible(true);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not log meal');
    }
  };

  const handleClaimMealXP = async () => {
    if (!lastLoggedMeal) return;
    try {
      const xpRes = await awardXP(
        db,
        Stat.VIT,
        lastLoggedMeal.xpAmount,
        'meal',
        lastLoggedMeal.id || 'meal-claim'
      );
      await loadData();
      setClaimResult({
        leveledUp: xpRes.leveledUp,
        newLevel: xpRes.newProfile.level,
        rankChanged: xpRes.rankChanged,
        newRank: xpRes.newProfile.rank,
      });
    } catch (err: any) {
      console.error('[handleClaimMealXP] Failed to award XP:', err);
    }
  };

  const handleDismissMealClaim = () => {
    setClaimModalVisible(false);
    setClaimResult(null);
    setLastLoggedMeal(null);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 1. SOLO APP HEADER (Figma #33:12) */}
      <View style={styles.appHeader}>
        <View style={styles.brandRow}>
          <View style={styles.appIconContainer}>
            <Image
              source={getRankImage(profile?.rank)}
              style={styles.appIcon}
              contentFit="cover"
            />
          </View>
          <Text style={styles.brandTitle}>SOLO SYSTEM</Text>
        </View>
      </View>

      <ScrollView
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
        {/* 2. PAGE HEADER (Figma #2:12946) */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.pageHeader}>
          <View style={styles.headingGroup}>
            <Text style={styles.pageSubHeader}>Player analytics</Text>
            <Text style={styles.pageTitle}>STATS</Text>
          </View>

          <TouchableOpacity
            style={styles.headerActionButton}
            activeOpacity={0.75}
            onPress={() => {
              playTouchSound();
              setFilterModalVisible(true);
            }}
          >
            <Image
              source={require('@/../public/sliders-horizontal.svg')}
              style={styles.headerActionIcon}
              contentFit="contain"
            />
          </TouchableOpacity>
        </Animated.View>

        {/* 3. COMBAT PROFILE / STATUS CARD (Figma #2:12952) */}
        <Animated.View
          entering={FadeInDown.duration(450).delay(80)}
          style={styles.combatProfileCard}
        >
          {/* Energy Rail Neon Indicator (Figma #2:12953) */}
          <Animated.View style={[styles.energyRailCombat, cyanRailAnimStyle]} />

          {/* Status Header */}
          <View style={styles.statusHeaderRow}>
            <View style={styles.statusLabelColumn}>
              <Text style={styles.characterLabel}>CHARACTER</Text>
              <Text style={styles.statusTitle}>STATUS</Text>
            </View>

            {/* Level Badge (Figma #7:8) */}
            <Animated.View style={[styles.levelBadge, badgeGlowStyle]}>
              <Text style={styles.levelBadgeLabel}>LEVEL</Text>
              <Text style={styles.levelBadgeValue}>{level}</Text>
            </Animated.View>
          </View>

          {/* Identity Row (Figma #7:11) */}
          <View style={styles.identityRow}>
            <View style={styles.jobInfoColumn}>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Job:</Text>
                <Text style={styles.metaVal}>{job}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaKey}>Title:</Text>
                <Text style={styles.titleVal}>{title}</Text>
              </View>
            </View>

            <View style={styles.rankTagContainer}>
              <Text style={styles.rankTagText}>{rank}-Rank</Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* HP Bar Section (Figma #7:22) */}
          <View style={styles.barSection}>
            <View style={styles.barHeaderRow}>
              <View style={styles.barLabelGroup}>
                <View style={styles.hpIconBadge}>
                  <Image
                    source={require('@/../public/heart.svg')}
                    style={styles.barMiniIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.hpText}>HP</Text>
              </View>
              <View style={styles.barValuesRow}>
                <Text style={styles.barCurrentVal}>{currentHp}</Text>
                <Text style={styles.barMaxVal}>/ {maxHp}</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.hpFill, hpAnimStyle]} />
            </View>
          </View>

          {/* MP Bar Section (Figma #7:33) */}
          <View style={styles.barSection}>
            <View style={styles.barHeaderRow}>
              <View style={styles.barLabelGroup}>
                <View style={styles.mpIconBadge}>
                  <Image
                    source={require('@/../public/zap-stat.svg')}
                    style={styles.barMiniIcon}
                    contentFit="contain"
                  />
                </View>
                <Text style={styles.mpText}>MP</Text>
              </View>
              <View style={styles.barValuesRow}>
                <Text style={styles.barCurrentVal}>{currentMp}</Text>
                <Text style={styles.barMaxVal}>/ {maxMp}</Text>
              </View>
            </View>
            <View style={styles.barTrack}>
              <Animated.View style={[styles.mpFill, mpAnimStyle]} />
            </View>
          </View>

          {/* Divider 2 */}
          <View style={styles.cardDivider} />

          {/* Core Stats 3x2 Grid (Figma #7:45) */}
          <View style={styles.coreStatsContainer}>
            {/* Row 1: STR, AGI, PER */}
            <View style={styles.coreStatsRow}>
              {/* STR */}
              <View style={[styles.coreStatCard, styles.strStatCard]}>
                <View style={styles.coreStatHeader}>
                  <Image
                    source={require('@/../public/sword.svg')}
                    style={styles.coreStatIcon}
                    contentFit="contain"
                  />
                  <Text style={[styles.coreStatLabel, { color: '#6C5CFF' }]}>STR</Text>
                </View>
                <Text style={styles.coreStatValue}>{str}</Text>
              </View>

              {/* AGI */}
              <View style={[styles.coreStatCard, styles.agiStatCard]}>
                <View style={styles.coreStatHeader}>
                  <Image
                    source={require('@/../public/wind.svg')}
                    style={styles.coreStatIcon}
                    contentFit="contain"
                  />
                  <Text style={[styles.coreStatLabel, { color: '#3BE7A1' }]}>AGI</Text>
                </View>
                <Text style={styles.coreStatValue}>{agi}</Text>
              </View>

              {/* PER */}
              <View style={[styles.coreStatCard, styles.perStatCard]}>
                <View style={styles.coreStatHeader}>
                  <Image
                    source={require('@/../public/eye.svg')}
                    style={styles.coreStatIcon}
                    contentFit="contain"
                  />
                  <Text style={[styles.coreStatLabel, { color: '#FFB74D' }]}>PER</Text>
                </View>
                <Text style={styles.coreStatValue}>{per}</Text>
              </View>
            </View>

            {/* Row 2: VIT, INT, FAT */}
            <View style={styles.coreStatsRow}>
              {/* VIT */}
              <View style={[styles.coreStatCard, styles.vitStatCard]}>
                <View style={styles.coreStatHeader}>
                  <Image
                    source={require('@/../public/heart.svg')}
                    style={styles.coreStatIcon}
                    contentFit="contain"
                  />
                  <Text style={[styles.coreStatLabel, { color: '#FF6B6B' }]}>VIT</Text>
                </View>
                <Text style={styles.coreStatValue}>{vit}</Text>
              </View>

              {/* INT */}
              <View style={[styles.coreStatCard, styles.intStatCard]}>
                <View style={styles.coreStatHeader}>
                  <Image
                    source={require('@/../public/brain.svg')}
                    style={styles.coreStatIcon}
                    contentFit="contain"
                  />
                  <Text style={[styles.coreStatLabel, { color: '#20C8FF' }]}>INT</Text>
                </View>
                <Text style={styles.coreStatValue}>{intStat}</Text>
              </View>

              {/* FAT (Fatigue) */}
              <View style={[styles.coreStatCard, styles.fatStatCard]}>
                <View style={styles.coreStatHeader}>
                  <Image
                    source={require('@/../public/moon.svg')}
                    style={styles.coreStatIcon}
                    contentFit="contain"
                  />
                  <Text style={[styles.coreStatLabel, { color: '#697292' }]}>FAT</Text>
                </View>
                <Text style={[styles.coreStatValue, { color: fatigue > 50 ? '#FF6B6B' : '#3BE7A1' }]}>
                  {fatigue}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* 4. ATTRIBUTES SECTION (Figma #2:12967) */}
        <Animated.View
          entering={FadeInDown.duration(450).delay(150)}
          style={styles.attributesSection}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeadingTitle}>ATTRIBUTES</Text>
            <Text style={styles.sectionHeadingSubtitle}>Last 30 days</Text>
          </View>

          {/* Row 1: STR & END */}
          <View style={styles.attributesRow}>
            {/* STR */}
            <View style={styles.attributeCard}>
              <View style={styles.attributeCardHeader}>
                <Text style={[styles.attributeCardCode, { color: '#6C5CFF' }]}>STR</Text>
                <Text style={styles.attributeGrowthText}>{strGainDisplay}</Text>
              </View>
              <View style={styles.attributeValueRow}>
                <Text style={styles.attributeBigNumber}>{attrStr}</Text>
                <Text style={styles.attributeFullLabel}>Strength</Text>
              </View>
            </View>

            {/* END */}
            <View style={styles.attributeCard}>
              <View style={styles.attributeCardHeader}>
                <Text style={[styles.attributeCardCode, { color: '#20C8FF' }]}>END</Text>
                <Text style={styles.attributeGrowthText}>{endGainDisplay}</Text>
              </View>
              <View style={styles.attributeValueRow}>
                <Text style={styles.attributeBigNumber}>{attrEnd}</Text>
                <Text style={styles.attributeFullLabel}>Endurance</Text>
              </View>
            </View>
          </View>

          {/* Row 2: AGI & MOB */}
          <View style={styles.attributesRow}>
            {/* AGI */}
            <View style={styles.attributeCard}>
              <View style={styles.attributeCardHeader}>
                <Text style={[styles.attributeCardCode, { color: '#3BE7A1' }]}>AGI</Text>
                <Text style={styles.attributeGrowthText}>{agiGainDisplay}</Text>
              </View>
              <View style={styles.attributeValueRow}>
                <Text style={styles.attributeBigNumber}>{attrAgi}</Text>
                <Text style={styles.attributeFullLabel}>Agility</Text>
              </View>
            </View>

            {/* MOB */}
            <View style={styles.attributeCard}>
              <View style={styles.attributeCardHeader}>
                <Text style={[styles.attributeCardCode, { color: '#B7A8FF' }]}>MOB</Text>
                <Text style={styles.attributeGrowthText}>{mobGainDisplay}</Text>
              </View>
              <View style={styles.attributeValueRow}>
                <Text style={styles.attributeBigNumber}>{attrMob}</Text>
                <Text style={styles.attributeFullLabel}>Mobility</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* 5. BODY PROGRESS CARD (Figma #2:13001) */}
        <Animated.View
          entering={FadeInDown.duration(450).delay(220)}
          style={styles.bodyProgressCard}
        >
          {/* Energy Rail Purple Indicator (Figma #2:13002) */}
          <Animated.View style={[styles.energyRailBody, purpleRailAnimStyle]} />

          {/* Heading */}
          <View style={styles.bodyProgressHeaderRow}>
            <View style={styles.bodyProgressTitleColumn}>
              <Text style={styles.bodyProgressTitle}>BODY PROGRESS</Text>
              <Text style={styles.bodyProgressSub}>12 WEEK COMPOSITION TREND</Text>
            </View>
            <View style={styles.trendBadge}>
              <Image
                source={require('@/../public/trending-down.svg')}
                style={styles.trendIcon}
                contentFit="contain"
              />
              <Text style={styles.trendBadgeText}>−3.1% BF</Text>
            </View>
          </View>

          {/* Analytics Layout */}
          <View style={styles.bodyAnalyticsRow}>
            {/* Left Metrics */}
            <View style={styles.bodyMetricsColumn}>
              <View style={styles.singleMetricGroup}>
                <Text style={styles.metricLabel}>Weight</Text>
                <View style={styles.metricValueUnitRow}>
                  <Text style={styles.metricBigValue}>{weightDisplay}</Text>
                  <Text style={styles.metricUnit}>kg</Text>
                </View>
              </View>

              <View style={styles.singleMetricGroup}>
                <Text style={styles.metricLabel}>Body fat</Text>
                <View style={styles.metricValueUnitRow}>
                  <Text style={[styles.metricBigValue, { color: '#9CE9FF' }]}>
                    {bodyFatDisplay}
                  </Text>
                  <Text style={styles.metricUnit}>%</Text>
                </View>
              </View>
            </View>

            {/* Right Chart Box (Figma #2:13022) */}
            <View style={styles.trendChartBox}>
              <View style={styles.trendSvgContainer}>
                <Image
                  source={require('@/../public/trend-line.svg')}
                  style={styles.trendLineSvg}
                  contentFit="fill"
                />
              </View>
              <View style={styles.chartLabelsRow}>
                <Text style={styles.chartMonthLabel}>JUL</Text>
                <Text style={styles.chartMonthLabel}>AUG</Text>
                <Text style={styles.chartMonthLabel}>OCT</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* 6. RECOVERY STATUS CARD (Figma #2:13029) */}
        <Animated.View
          entering={FadeInDown.duration(450).delay(280)}
          style={styles.recoveryCard}
        >
          <Animated.View style={[styles.recoveryIconBadge, batteryAnimStyle]}>
            <Image
              source={require('@/../public/battery-charging.svg')}
              style={styles.recoveryIcon}
              contentFit="contain"
            />
          </Animated.View>

          <View style={styles.recoveryDetailsColumn}>
            <Text style={styles.recoveryTitle}>Recovery readiness</Text>
            <Text style={styles.recoverySub}>Sleep 7h 42m · HRV above baseline</Text>
          </View>

          <Text style={styles.recoveryScore}>82%</Text>
        </Animated.View>

        {/* Extra Bottom Padding to clear the absolute tab navigation */}
        <View style={{ height: 64 }} />
      </ScrollView>

      {/* ─────────────── ANALYTICS SETTINGS & MANA REFINERY MODAL ─────────────── */}
      <Modal visible={filterModalVisible} animationType="fade" transparent>
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setFilterModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalHeading}>System Analytics Filter</Text>
            <Text style={styles.modalSubheading}>Select audit timeline window</Text>

            <View style={styles.timeframeOptionsRow}>
              {(['7d', '30d', '90d', 'all'] as const).map((tf) => (
                <TouchableOpacity
                  key={tf}
                  style={[
                    styles.timeframeButton,
                    selectedTimeframe === tf && styles.timeframeButtonActive,
                  ]}
                  onPress={() => {
                    playTouchSound();
                    setSelectedTimeframe(tf);
                  }}
                >
                  <Text
                    style={[
                      styles.timeframeButtonText,
                      selectedTimeframe === tf && styles.timeframeButtonTextActive,
                    ]}
                  >
                    {tf.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionDivider} />

            {/* Quick Action: Log Meal / Mana Refinery */}
            <TouchableOpacity
              style={styles.manaRefineryActionBtn}
              onPress={() => {
                playTouchSound();
                setFilterModalVisible(false);
                setMealModalVisible(true);
              }}
            >
              <Text style={styles.manaRefineryActionBtnText}>+ Open Mana Refinery / Log Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.closeModalBtn}
              onPress={() => setFilterModalVisible(false)}
            >
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ─────────────── LOG MEAL MODAL (MANA REFINERY) ─────────────── */}
      <Modal visible={mealModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.mealModalContent}>
            <Text style={styles.mealModalTitle}>Mana Refinery · Log Meal</Text>
            <Text style={styles.mealModalSubtitle}>Replenish calories & vital macros</Text>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Meal / Food name</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. Steak & White Rice"
                placeholderTextColor="#697292"
                value={mealName}
                onChangeText={setMealName}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Calories (kcal)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 750"
                placeholderTextColor="#697292"
                keyboardType="numeric"
                value={calories}
                onChangeText={setCalories}
              />
            </View>

            <View style={styles.macroInputsRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="55"
                  placeholderTextColor="#697292"
                  keyboardType="numeric"
                  value={protein}
                  onChangeText={setProtein}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1, marginHorizontal: 8 }]}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="70"
                  placeholderTextColor="#697292"
                  keyboardType="numeric"
                  value={carbs}
                  onChangeText={setCarbs}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.inputField}
                  placeholder="20"
                  placeholderTextColor="#697292"
                  keyboardType="numeric"
                  value={fat}
                  onChangeText={setFat}
                />
              </View>
            </View>

            <View style={styles.mealModalButtonsRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setMealModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.submitBtn} onPress={handleLogMeal}>
                <Text style={styles.submitBtnText}>Replenish Mana</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ─────────────── NEW FIGMA XP CLAIM MODAL (MANA RECOVERY) ─────────────── */}
      {lastLoggedMeal && (
        <XPClaimModal
          visible={claimModalVisible}
          xpAmount={lastLoggedMeal.xpAmount}
          stat={Stat.VIT}
          activityName={lastLoggedMeal.name}
          subtitle="MANA RECOVERY"
          protocolText="RECOVERY PROTOCOL COMPLETE"
          rewardReadyText="REWARD READY"
          details={`🔥 ${Math.round(lastLoggedMeal.calories)} kcal · +${Math.round(lastLoggedMeal.protein)}g P · +${Math.round(lastLoggedMeal.carbs)}g C · +${Math.round(lastLoggedMeal.fat)}g F`}
          completionTagText="MANA RESTORED"
          completionCountText={`${Math.round(lastLoggedMeal.calories)} KCAL REPLENISHED`}
          calories={lastLoggedMeal.calories}
          onClaim={handleClaimMealXP}
          onDismiss={handleDismissMealClaim}
          claimResult={claimResult}
        />
      )}
    </SafeAreaView>
  );
}

/* ─────────────── EXACT FIGMA STYLES ─────────────── */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050611',
  },

  /* SOLO App Header (Figma #33:12) */
  appHeader: {
    height: 48,
    paddingHorizontal: 20,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 49, 84, 0.4)',
    backgroundColor: 'rgba(14, 17, 34, 0.7)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  appIcon: {
    width: 22,
    height: 22,
  },
  brandTitle: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    fontWeight: '700',
    color: '#F5FAFF',
    letterSpacing: 0.6,
  },

  /* Scroll Content Container */
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 12,
  },

  /* Page Header (Figma #2:12946) */
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  headingGroup: {
    gap: 2,
  },
  pageSubHeader: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#20C8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pageTitle: {
    fontFamily: Fonts.sans,
    fontSize: 26,
    fontWeight: '800',
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionIcon: {
    width: 19,
    height: 19,
  },

  /* Combat Profile / Character Status (Figma #2:12952) */
  combatProfileCard: {
    position: 'relative',
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 8,
    overflow: 'hidden',
  },
  energyRailCombat: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#20C8FF',
    borderRadius: 1,
  },
  statusHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusLabelColumn: {
    gap: 2,
  },
  characterLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  statusTitle: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  levelBadge: {
    backgroundColor: '#6C5CFF',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    boxShadow: '0px 0px 14px 1px rgba(108, 92, 255, 0.5)',
    elevation: 6,
  },
  levelBadgeLabel: {
    fontFamily: Fonts.sans,
    fontSize: 8,
    fontWeight: '700',
    color: '#B7A8FF',
    textTransform: 'uppercase',
  },
  levelBadgeValue: {
    fontFamily: Fonts.sans,
    fontSize: 22,
    fontWeight: '900',
    color: '#F5F7FF',
    lineHeight: 26,
  },

  /* Identity Row */
  identityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  jobInfoColumn: {
    gap: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaKey: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#697292',
    textTransform: 'uppercase',
  },
  metaVal: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#A8B0CE',
  },
  titleVal: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#B7A8FF',
  },
  rankTagContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(183, 168, 255, 0.09)',
    borderWidth: 1,
    borderColor: 'rgba(183, 168, 255, 0.40)',
  },
  rankTagText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#B7A8FF',
    textTransform: 'uppercase',
  },

  /* Card Divider */
  cardDivider: {
    height: 1,
    backgroundColor: '#2A3154',
  },

  /* HP & MP Bar Sections */
  barSection: {
    gap: 4,
  },
  barHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  barLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  hpIconBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mpIconBadge: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  barMiniIcon: {
    width: 8,
    height: 8,
  },
  hpText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#FF6B6B',
    textTransform: 'uppercase',
  },
  mpText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#9CE9FF',
    textTransform: 'uppercase',
  },
  barValuesRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  barCurrentVal: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    fontWeight: '900',
    color: '#F5F7FF',
  },
  barMaxVal: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '600',
    color: '#697292',
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#1E2440',
    overflow: 'hidden',
  },
  hpFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#FF6B6B',
  },
  mpFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#20C8FF',
  },

  /* Core Stats 3x2 Grid */
  coreStatsContainer: {
    gap: 6,
  },
  coreStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coreStatCard: {
    flex: 1,
    padding: 8,
    gap: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  strStatCard: {
    backgroundColor: 'rgba(108, 92, 255, 0.08)',
    borderColor: 'rgba(108, 92, 255, 0.27)',
  },
  agiStatCard: {
    backgroundColor: 'rgba(59, 231, 161, 0.08)',
    borderColor: 'rgba(59, 231, 161, 0.27)',
  },
  perStatCard: {
    backgroundColor: 'rgba(255, 183, 77, 0.08)',
    borderColor: 'rgba(255, 183, 77, 0.27)',
  },
  vitStatCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.08)',
    borderColor: 'rgba(255, 107, 107, 0.27)',
  },
  intStatCard: {
    backgroundColor: 'rgba(32, 200, 255, 0.08)',
    borderColor: 'rgba(32, 200, 255, 0.27)',
  },
  fatStatCard: {
    backgroundColor: 'rgba(42, 49, 84, 0.08)',
    borderColor: 'rgba(42, 49, 84, 0.53)',
  },
  coreStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  coreStatIcon: {
    width: 10,
    height: 10,
  },
  coreStatLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  coreStatValue: {
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '900',
    color: '#F5F7FF',
  },

  /* 4. ATTRIBUTES SECTION (Figma #2:12967) */
  attributesSection: {
    gap: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeadingTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  sectionHeadingSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '600',
    color: '#20C8FF',
  },
  attributesRow: {
    flexDirection: 'row',
    gap: 8,
  },
  attributeCard: {
    flex: 1,
    padding: 10,
    gap: 6,
    borderRadius: 8,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  attributeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  attributeCardCode: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  attributeGrowthText: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '800',
    color: '#3BE7A1',
  },
  attributeValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  attributeBigNumber: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '900',
    color: '#F5F7FF',
  },
  attributeFullLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#697292',
  },

  /* 5. BODY PROGRESS CARD (Figma #2:13001) */
  bodyProgressCard: {
    position: 'relative',
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    boxShadow: '0px 10px 24px 0px rgba(0, 0, 0, 0.40)',
    elevation: 6,
    overflow: 'hidden',
  },
  energyRailBody: {
    position: 'absolute',
    left: 0,
    top: 10,
    bottom: 10,
    width: 2,
    backgroundColor: '#6C5CFF',
    borderRadius: 1,
  },
  bodyProgressHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bodyProgressTitleColumn: {
    gap: 2,
  },
  bodyProgressTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '900',
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  bodyProgressSub: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#697292',
    textTransform: 'uppercase',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trendIcon: {
    width: 14,
    height: 14,
  },
  trendBadgeText: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '800',
    color: '#3BE7A1',
  },

  /* Body Analytics Layout */
  bodyAnalyticsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  bodyMetricsColumn: {
    width: 100,
    gap: 10,
  },
  singleMetricGroup: {
    gap: 3,
  },
  metricLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#697292',
    textTransform: 'uppercase',
  },
  metricValueUnitRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricBigValue: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '800',
    color: '#F5F7FF',
  },
  metricUnit: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '700',
    color: '#A8B0CE',
  },

  /* Trend Chart (Figma #2:13022) */
  trendChartBox: {
    flex: 1,
    height: 82,
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  trendSvgContainer: {
    position: 'absolute',
    top: 6,
    left: 4,
    right: 4,
    height: 56,
  },
  trendLineSvg: {
    width: '100%',
    height: '100%',
  },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 7,
    paddingBottom: 4,
  },
  chartMonthLabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    fontWeight: '400',
    color: '#697292',
  },

  /* 6. RECOVERY STATUS CARD (Figma #2:13029) */
  recoveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 231, 161, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(59, 231, 161, 0.24)',
  },
  recoveryIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: 'rgba(59, 231, 161, 0.09)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recoveryIcon: {
    width: 20,
    height: 20,
  },
  recoveryDetailsColumn: {
    flex: 1,
    gap: 3,
  },
  recoveryTitle: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '800',
    color: '#F5F7FF',
  },
  recoverySub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    fontWeight: '400',
    color: '#697292',
  },
  recoveryScore: {
    fontFamily: Fonts.sans,
    fontSize: 20,
    fontWeight: '900',
    color: '#3BE7A1',
  },

  /* ─────────────── MODALS ─────────────── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    boxShadow: '0px 0px 24px 2px rgba(108, 92, 255, 0.35)',
    elevation: 10,
  },
  modalHeading: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  modalSubheading: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#697292',
  },
  timeframeOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  timeframeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    alignItems: 'center',
  },
  timeframeButtonActive: {
    backgroundColor: 'rgba(32, 200, 255, 0.15)',
    borderColor: '#20C8FF',
  },
  timeframeButtonText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontWeight: '700',
    color: '#697292',
  },
  timeframeButtonTextActive: {
    color: '#20C8FF',
  },
  modalActionDivider: {
    height: 1,
    backgroundColor: '#2A3154',
    marginVertical: 4,
  },
  manaRefineryActionBtn: {
    paddingVertical: 12,
    backgroundColor: 'rgba(108, 92, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    borderRadius: 8,
    alignItems: 'center',
  },
  manaRefineryActionBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '800',
    color: '#B7A8FF',
  },
  closeModalBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#697292',
  },

  /* Meal Form Modal */
  mealModalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    boxShadow: '0px 10px 24px 0px rgba(0, 0, 0, 0.40)',
    elevation: 8,
  },
  mealModalTitle: {
    fontFamily: Fonts.sans,
    fontSize: 16,
    fontWeight: '800',
    color: '#F5F7FF',
    textTransform: 'uppercase',
  },
  mealModalSubtitle: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#697292',
    marginTop: -8,
  },
  formGroup: {
    gap: 4,
  },
  inputLabel: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    fontWeight: '700',
    color: '#A8B0CE',
    textTransform: 'uppercase',
  },
  inputField: {
    height: 42,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#F5F7FF',
    fontFamily: Fonts.sans,
    fontSize: 13,
  },
  macroInputsRow: {
    flexDirection: 'row',
  },
  mealModalButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#697292',
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: '#F5F7FF',
    fontWeight: '800',
  },
});
