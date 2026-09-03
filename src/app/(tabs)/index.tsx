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
        {/* ONBOARDING BANNER IF NOT ONBOARDED */}
        {profile && profile.onboarding_complete === 0 && (
          <TouchableOpacity
            style={styles.onboardingBanner}
            onPress={() => router.push('/onboarding')}
          >
            <Text style={styles.bannerIcon}>⚠️</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Complete your profile</Text>
              <Text style={styles.bannerSub}>Set up your body stats to unlock custom nutrition targets</Text>
            </View>
            <Text style={styles.bannerArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* ACTIVE GOAL BANNER */}
        {profile && (
          <View style={styles.activeDirectiveBanner}>
            <View style={styles.directiveTop}>
              <Text style={styles.directiveSystemTag}>Your Goal</Text>
              <TouchableOpacity
                style={styles.recalibrateBtn}
                onPress={() => router.push('/onboarding')}
                activeOpacity={0.7}
              >
                <Text style={styles.recalibrateBtnText}>Edit ⚙️</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.directiveBody}>
              <Text style={styles.directiveEmoji}>
                {GOAL_CONFIG[profile.goal_type]?.emoji || '⚖️'}
              </Text>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.directiveTitle}>
                  {GOAL_CONFIG[profile.goal_type]?.label || 'Maintain Weight'}
                </Text>
                <Text style={styles.directiveSub}>
                  {GOAL_CONFIG[profile.goal_type]?.calorieOffset === 0
                    ? 'Energy balance (TDEE match)'
                    : `${GOAL_CONFIG[profile.goal_type]?.calorieOffset > 0 ? '+' : ''}${GOAL_CONFIG[profile.goal_type]?.calorieOffset} kcal/day`}
                  {' • '}Target: {Math.round(profile.daily_calories ?? 2000)} kcal
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* MAIN STATUS WINDOW */}
        {profile ? (
          <StatusWindow title="Your Status">
            {/* Hunter Identity & XP */}
            <HunterInfo profile={profile} />

            {/* Daily Streak & Resonance Buff */}
            <DailyStreakCard streaks={streaks} weekHistory={weekHistory} />

            {/* Daily Calorie & Energy Balance */}
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
            <Text style={styles.loadingText}>Loading your status...</Text>
          </View>
        )}

        {/* STEP TRACKER */}
        <StepTrackerCard onQuestClaimed={loadData} />

        {/* QUICK ACCESS ACTION ROW */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/quests')}
          >
            <Text style={styles.actionEmoji}>📜</Text>
            <Text style={styles.actionLabel}>Quests</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/log')}
          >
            <Text style={styles.actionEmoji}>🍽️</Text>
            <Text style={styles.actionLabel}>Log Meal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/activity')}
          >
            <Text style={styles.actionEmoji}>⚡</Text>
            <Text style={styles.actionLabel}>Train</Text>
          </TouchableOpacity>
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
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
    paddingBottom: Spacing.six,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.35)',
    borderRadius: 14,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  bannerIcon: {
    fontSize: 22,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#FFAA00',
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#C4A870',
    marginTop: 2,
  },
  bannerArrow: {
    fontSize: 18,
    color: '#FFAA00',
    fontWeight: '700',
  },
  loadingContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontSize: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  actionEmoji: {
    fontSize: 22,
  },
  actionLabel: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#8896AB',
  },
  activeDirectiveBanner: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 14,
    padding: Spacing.threeHalf,
    gap: 12,
  },
  directiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directiveSystemTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  recalibrateBtn: {
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recalibrateBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  directiveBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  directiveEmoji: {
    fontSize: 28,
  },
  directiveTitle: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  directiveSub: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
});
