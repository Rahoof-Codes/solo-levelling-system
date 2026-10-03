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
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';
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
import { Colors, Fonts, Spacing } from '@/constants/theme';
import { useAudio } from '@/contexts/AudioContext';

export default function StatusScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useSQLiteContext();
  const { bgmEnabled, toggleBGM, playTouchSound } = useAudio();

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
      }

      // Always load and validate streaks and week activity history
      const [s, wh] = await Promise.all([
        getStreaks(db),
        getPastWeekActivity(db),
      ]);
      setStreaks(s);
      setWeekHistory(wh);
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.dark.accent} />
        }
      >
        {/* TOP SYSTEM HEADER & QUICK BGM TOGGLE */}
        <Animated.View entering={FadeInDown.duration(350)} style={styles.topHeaderBar}>
          <View style={styles.systemTagContainer}>
            <View style={styles.onlineDot} />
            <Text style={styles.systemTagText}>⟨ SYSTEM // ONLINE ⟩</Text>
          </View>
          <TouchableOpacity
            style={[styles.audioPillBtn, bgmEnabled && styles.audioPillBtnActive]}
            onPress={() => {
              playTouchSound();
              toggleBGM();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.audioPillIcon}>{bgmEnabled ? '🎵' : '🔇'}</Text>
            <Text style={[styles.audioPillText, bgmEnabled && styles.audioPillTextActive]}>
              {bgmEnabled ? 'BGM ON' : 'BGM OFF'}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {/* ONBOARDING BANNER IF NOT ONBOARDED */}
        {profile && profile.onboarding_complete === 0 && (
          <Animated.View entering={SlideInDown.duration(450)}>
            <TouchableOpacity
              style={styles.onboardingBanner}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.8}
            >
              <Text style={styles.bannerIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerTitle}>Complete your profile</Text>
                <Text style={styles.bannerSub}>Set up your body stats to unlock custom nutrition targets</Text>
              </View>
              <Text style={styles.bannerArrow}>→</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {/* ACTIVE GOAL BANNER */}
        {profile && (
          <Animated.View entering={FadeInDown.duration(450).delay(80)}>
            <View style={styles.activeDirectiveBanner}>
              {/* Left accent stripe */}
              <View style={styles.directiveStripe} />

              <View style={styles.directiveInner}>
                <View style={styles.directiveTop}>
                  <Text style={styles.directiveSystemTag}>YOUR OBJECTIVE</Text>
                  <TouchableOpacity
                    style={styles.recalibrateBtn}
                    onPress={() => router.push('/onboarding')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.recalibrateBtnText}>Edit ⚙️</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.directiveBody}>
                  <View style={styles.directiveEmojiBox}>
                    <Text style={styles.directiveEmoji}>
                      {GOAL_CONFIG[profile.goal_type]?.emoji || '⚖️'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, gap: 4 }}>
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
            </View>
          </Animated.View>
        )}

        {/* MAIN STATUS WINDOW */}
        {profile ? (
          <Animated.View entering={FadeInDown.duration(500).delay(160)}>
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
          </Animated.View>
        ) : (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Initializing system...</Text>
          </View>
        )}

        {/* STEP TRACKER */}
        <Animated.View entering={FadeInDown.duration(450).delay(240)}>
          <StepTrackerCard onQuestClaimed={loadData} />
        </Animated.View>

        {/* QUICK ACCESS ACTION ROW */}
        <Animated.View entering={FadeInUp.duration(450).delay(320)} style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              playTouchSound();
              router.push('/(tabs)/quests');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconGlow, { shadowColor: Colors.dark.gold }]} />
            <Text style={styles.actionEmoji}>📜</Text>
            <Text style={styles.actionLabel}>QUESTS</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              playTouchSound();
              router.push('/(tabs)/log');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconGlow, { shadowColor: Colors.dark.mana }]} />
            <Text style={styles.actionEmoji}>🍽️</Text>
            <Text style={styles.actionLabel}>MANA</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              playTouchSound();
              router.push('/(tabs)/activity');
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconGlow, { shadowColor: Colors.dark.cyan }]} />
            <Text style={styles.actionEmoji}>⚡</Text>
            <Text style={styles.actionLabel}>TRAIN</Text>
          </TouchableOpacity>
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
    padding: Spacing.threeHalf,
    gap: Spacing.threeHalf,
    paddingBottom: Spacing.six + 20,
  },
  onboardingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
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
    fontFamily: Fonts.display,
    color: Colors.dark.gold,
    letterSpacing: 0.5,
  },
  bannerSub: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
    marginTop: 2,
  },
  bannerArrow: {
    fontSize: 18,
    color: Colors.dark.gold,
    fontWeight: '700',
  },
  loadingContainer: {
    padding: Spacing.six,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontFamily: Fonts.display,
    color: Colors.dark.textMuted,
    fontSize: 14,
    letterSpacing: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    flex: 1,
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
    position: 'relative',
    overflow: 'hidden',
  },
  actionIconGlow: {
    position: 'absolute',
    top: -10,
    width: 50,
    height: 50,
    borderRadius: 25,
    opacity: 0.1,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 2,
  },
  actionEmoji: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 10,
    fontFamily: Fonts.display,
    fontWeight: '700',
    color: Colors.dark.textSecondary,
    letterSpacing: 1.5,
  },
  activeDirectiveBanner: {
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.borderBright,
    borderRadius: 16,
    overflow: 'hidden',
    flexDirection: 'row',
    position: 'relative',
  },
  directiveStripe: {
    width: 4,
    backgroundColor: Colors.dark.accent,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  directiveInner: {
    flex: 1,
    padding: Spacing.threeHalf,
    gap: 12,
  },
  directiveTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  directiveSystemTag: {
    fontSize: 11,
    fontFamily: Fonts.display,
    color: Colors.dark.accent,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  recalibrateBtn: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recalibrateBtnText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.dark.accent,
    fontWeight: '600',
  },
  directiveBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  directiveEmojiBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directiveEmoji: {
    fontSize: 24,
  },
  directiveTitle: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Fonts.display,
    color: Colors.dark.textBright,
    letterSpacing: 0.3,
  },
  directiveSub: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.dark.textSecondary,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 4,
  },
  systemTagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.dark.success,
    shadowColor: Colors.dark.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  systemTagText: {
    fontFamily: Fonts.display,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: Colors.dark.textMuted,
  },
  audioPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.dark.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  audioPillBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
  },
  audioPillIcon: {
    fontSize: 12,
  },
  audioPillText: {
    fontFamily: Fonts.display,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    color: Colors.dark.textMuted,
  },
  audioPillTextActive: {
    color: Colors.dark.accent,
  },
});
