import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect, usePathname } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getProfile,
  getDailyCalorieSummary,
  getQuestsForDate,
  getStreaks,
  checkAndUpdateDailyLoginStreak,
  getPastWeekActivity,
  type DayActivityStatus,
} from '@/db/operations';
import { type Profile, type DailyCalorieSummary, type Quest, type Streak } from '@/types';
import { StatusWindow } from '@/components/status/status-window';
import { HunterInfo } from '@/components/status/hunter-info';
import { StatBars } from '@/components/status/stat-bars';
import { DailySummary } from '@/components/status/daily-summary';
import { DailyStreakCard } from '@/components/status/daily-streak-card';
import { StepTrackerCard } from '@/components/status/step-tracker-card';
import { GOAL_CONFIG } from '@/lib/calculations/bmr';
import { Fonts, Spacing } from '@/constants/theme';

export default function StatusScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useSQLiteContext();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [calorieSummary, setCalorieSummary] = useState<DailyCalorieSummary>({
    consumed: 0,
    burned: 0,
    target: 2000,
    net: 0,
    protein_consumed: 0,
    carbs_consumed: 0,
    fat_consumed: 0,
  });
  const [quests, setQuests] = useState<Quest[]>([]);
  const [streaks, setStreaks] = useState<Streak[]>([]);
  const [weekHistory, setWeekHistory] = useState<DayActivityStatus[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      // Automatically maintain daily login streak
      await checkAndUpdateDailyLoginStreak(db);

      const p = await getProfile(db);
      setProfile(p);

      if (p) {
        const cal = await getDailyCalorieSummary(db);
        setCalorieSummary(cal);

        const q = await getQuestsForDate(db);
        setQuests(q);

        const s = await getStreaks(db);
        setStreaks(s);

        const wh = await getPastWeekActivity(db);
        setWeekHistory(wh);
      }
    } catch (err) {
      console.error('Error loading status data:', err);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [pathname, loadData]);

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

  const completedQuestsCount = quests.filter((q) => q.is_completed).length;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />
        }
      >
        {/* UNCALIBRATED BANNER IF NOT ONBOARDED */}
        {profile && profile.onboarding_complete === 0 && (
          <TouchableOpacity
            style={styles.onboardingBanner}
            onPress={() => router.push('/onboarding')}
          >
            <Text style={styles.bannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>SYSTEM CALIBRATION REQUIRED</Text>
              <Text style={styles.bannerSub}>Tap to scan body stats & unlock custom nutrition targets</Text>
            </View>
            <Text style={styles.bannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ACTIVE PHYSICAL DIRECTIVE (LOCKED — RECALIBRATION ONLY) */}
        {profile && (
          <View style={styles.activeDirectiveBanner}>
            <View style={styles.directiveTop}>
              <Text style={styles.directiveSystemTag}>[ PHYSICAL DIRECTIVE: LOCKED ]</Text>
              <TouchableOpacity
                style={styles.recalibrateBtn}
                onPress={() => router.push('/onboarding')}
                activeOpacity={0.7}
              >
                <Text style={styles.recalibrateBtnText}>RECALIBRATE ⚙️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.directiveBody}>
              <Text style={styles.directiveEmoji}>
                {GOAL_CONFIG[profile.goal_type]?.emoji || '⚖️'}
              </Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.directiveTitle}>
                  {GOAL_CONFIG[profile.goal_type]?.label?.toUpperCase() || 'MAINTAIN WEIGHT'}
                </Text>
                <Text style={styles.directiveSub}>
                  {GOAL_CONFIG[profile.goal_type]?.calorieOffset === 0
                    ? 'TDEE Match (Energy Balance)'
                    : `${GOAL_CONFIG[profile.goal_type]?.calorieOffset > 0 ? '+' : ''}${GOAL_CONFIG[profile.goal_type]?.calorieOffset} kcal/day`}
                  {' • '}Daily Target: {Math.round(profile.daily_calories ?? 2000)} kcal
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* MAIN SOLO LEVELING STATUS WINDOW */}
        {profile ? (
          <StatusWindow title="HUNTER STATUS WINDOW">
            {/* Hunter Identity & XP */}
            <HunterInfo profile={profile} />

            {/* Daily Streak & Resonance Buff */}
            <DailyStreakCard streaks={streaks} weekHistory={weekHistory} />

            {/* Daily Calorie & Mana Energy Balance */}
            <DailySummary
              calorieSummary={calorieSummary}
              completedQuestsCount={completedQuestsCount}
              totalQuestsCount={quests.length}
              streaks={streaks}
            />

            {/* 5 Core Stat Progress Bars */}
            <StatBars profile={profile} />
          </StatusWindow>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>INITIALIZING SYSTEM MATRIX...</Text>
          </View>
        )}

        {/* 10,000 STEPS DAILY DIRECTIVE & MOTION HUD */}
        <StepTrackerCard onQuestClaimed={loadData} />

        {/* QUICK ACCESS ACTION ROW */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/quests')}
          >
            <Text style={styles.actionEmoji}>📜</Text>
            <Text style={styles.actionLabel}>VIEW QUESTS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/log')}
          >
            <Text style={styles.actionEmoji}>🍽️</Text>
            <Text style={styles.actionLabel}>LOG MEAL</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/activity')}
          >
            <Text style={styles.actionEmoji}>⚡</Text>
            <Text style={styles.actionLabel}>TRAIN</Text>
          </TouchableOpacity>
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
    padding: Spacing.three,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.12)',
    borderWidth: 1.5,
    borderColor: '#FFAA00',
    borderRadius: 10,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerTitle: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#FFAA00',
    letterSpacing: 1,
  },
  bannerSub: {
    fontSize: 10,
    color: '#D4C09B',
    marginTop: 2,
  },
  bannerArrow: {
    fontSize: 18,
    color: '#FFAA00',
    fontWeight: '900',
  },
  loadingContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    fontSize: 12,
    letterSpacing: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#00A8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  actionEmoji: {
    fontSize: 20,
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#90B4E0',
    letterSpacing: 1,
  },
  activeDirectiveBanner: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 10,
  },
  directiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directiveSystemTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  recalibrateBtn: {
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  recalibrateBtnText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    fontWeight: '800',
  },
  directiveBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directiveEmoji: {
    fontSize: 26,
  },
  directiveTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 0.5,
  },
  directiveSub: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#6582A6',
  },
});
