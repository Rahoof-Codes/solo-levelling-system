import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import {
  getProfile,
  getDailyCalorieSummary,
  getQuestsForDate,
  getStreaks,
  updateProfileGoal,
  checkAndUpdateDailyLoginStreak,
  getPastWeekActivity,
  type DayActivityStatus,
} from '@/db/operations';
import { type Profile, type DailyCalorieSummary, type Quest, type Streak, type GoalType } from '@/types';
import { StatusWindow } from '@/components/status/status-window';
import { HunterInfo } from '@/components/status/hunter-info';
import { StatBars } from '@/components/status/stat-bars';
import { DailySummary } from '@/components/status/daily-summary';
import { DailyStreakCard } from '@/components/status/daily-streak-card';
import { GOAL_CONFIG } from '@/lib/calculations/bmr';
import { Fonts, Spacing } from '@/constants/theme';

const GOAL_SECTIONS: { type: GoalType; title: string; emoji: string; offsetLabel: string; macroRatio: string }[] = [
  {
    type: 'lose_weight',
    title: 'LOSS WEIGHT',
    emoji: '🔥',
    offsetLabel: '-500 kcal (Deficit)',
    macroRatio: '35% P / 35% C / 30% F',
  },
  {
    type: 'maintain',
    title: 'WEIGHT MAINTAIN',
    emoji: '⚖️',
    offsetLabel: '0 kcal (Balance)',
    macroRatio: '30% P / 40% C / 30% F',
  },
  {
    type: 'gain_weight',
    title: 'WEIGHT GAIN',
    emoji: '💪',
    offsetLabel: '+500 kcal (Surplus)',
    macroRatio: '30% P / 45% C / 25% F',
  },
];

export default function StatusScreen() {
  const router = useRouter();
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
  const [changingGoal, setChangingGoal] = useState(false);

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

  const handleSelectGoal = async (newGoal: GoalType) => {
    if (profile?.goal_type === newGoal || changingGoal) return;
    try {
      setChangingGoal(true);
      await updateProfileGoal(db, newGoal);
      await loadData();
    } catch (err) {
      console.error('Error updating goal directive:', err);
    } finally {
      setChangingGoal(false);
    }
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

        {/* 3 WEIGHT GOAL DIRECTIVE SECTIONS */}
        <View style={styles.goalSectionContainer}>
          <View style={styles.goalHeaderRow}>
            <Text style={styles.goalSectionTitle}>PHYSICAL DIRECTIVE</Text>
            <Text style={styles.goalActiveIndicator}>
              ACTIVE: {profile?.goal_type ? GOAL_CONFIG[profile.goal_type]?.label?.toUpperCase() : 'MAINTAIN'}
            </Text>
          </View>

          <View style={styles.goalGrid}>
            {GOAL_SECTIONS.map((sec) => {
              const isActive = (profile?.goal_type || 'maintain') === sec.type;
              return (
                <TouchableOpacity
                  key={sec.type}
                  style={[styles.goalCard, isActive && styles.goalCardActive]}
                  onPress={() => handleSelectGoal(sec.type)}
                  activeOpacity={0.7}
                >
                  <View style={styles.goalCardTop}>
                    <Text style={styles.goalCardEmoji}>{sec.emoji}</Text>
                    {isActive && (
                      <View style={styles.activeDot} />
                    )}
                  </View>
                  <Text style={[styles.goalCardTitle, isActive && styles.goalCardTitleActive]}>
                    {sec.title}
                  </Text>
                  <Text style={[styles.goalCardOffset, isActive && styles.goalCardOffsetActive]}>
                    {sec.offsetLabel}
                  </Text>
                  <Text style={styles.goalCardMacros}>{sec.macroRatio}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

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
  goalSectionContainer: {
    backgroundColor: 'rgba(13, 20, 36, 0.75)',
    borderWidth: 1,
    borderColor: '#1A2E50',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 10,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalSectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 1.5,
  },
  goalActiveIndicator: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00FF88',
    fontWeight: '700',
  },
  goalGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  goalCard: {
    flex: 1,
    backgroundColor: '#080E1A',
    borderWidth: 1,
    borderColor: '#172744',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  goalCardActive: {
    borderColor: '#00F0FF',
    backgroundColor: 'rgba(0, 240, 255, 0.09)',
    shadowColor: '#00F0FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  goalCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalCardEmoji: {
    fontSize: 18,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00FF88',
    shadowColor: '#00FF88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  goalCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#8AABCE',
    marginTop: 2,
  },
  goalCardTitleActive: {
    color: '#00F0FF',
  },
  goalCardOffset: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  goalCardOffsetActive: {
    color: '#FFAA00',
  },
  goalCardMacros: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#4B6588',
    marginTop: 2,
  },
});
