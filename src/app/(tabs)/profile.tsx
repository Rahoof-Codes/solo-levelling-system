import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect, usePathname } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getProfile, getLastSyncedAt, getCurrentPlanProgress } from '@/db/operations';
import { syncPendingRecords } from '@/services/syncService';
import { type Profile, Stat } from '@/types';
import { RankBadge } from '@/components/status/rank-badge';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Fonts, Spacing, RankColors, StatColors } from '@/constants/theme';
import { getRankImage } from '@/constants/rankImages';
import { getXPProgress } from '@/lib/calculations/leveling';
import { GOAL_CONFIG } from '@/lib/calculations/bmr';

export default function ProfileScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const db = useSQLiteContext();
  const { user, signOut, isGuest } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planProgress, setPlanProgress] = useState<any | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(db);
      setProfile(p);

      const pp = await getCurrentPlanProgress(db);
      setPlanProgress(pp);

      const ls = await getLastSyncedAt(db);
      setLastSynced(ls);
    } catch (err) {
      console.error('Error loading profile:', err);
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

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      const result = await syncPendingRecords(db, user?.uid ?? null);
      await loadData();

      if (result.success) {
        Alert.alert(
          'Sync Complete',
          user && isFirebaseConfigured()
            ? `Pushed ${result.pushedCount} records, pulled ${result.pulledCount} remote updates.`
            : 'Running in Local/Guest mode. All progress is safely stored in local SQLite storage.'
        );
      } else {
        Alert.alert('Sync Notice', result.error || 'Sync encountered an issue');
      }
    } catch (err: any) {
      Alert.alert('Sync Error', err?.message ?? 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Your local data will be preserved. You can sign back in anytime to resume cloud synchronization.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: signOut,
        },
      ]
    );
  };

  const rankColor = profile ? (RankColors[profile.rank] || RankColors.E) : '#00A8FF';
  const rankImage = profile ? getRankImage(profile.rank) : null;

  const xpProgress = useMemo(() => {
    if (!profile) return null;
    return getXPProgress(profile.total_xp);
  }, [profile]);

  const activeGoal = profile ? GOAL_CONFIG[profile.goal_type] : GOAL_CONFIG.maintain;

  const maxStatXP = useMemo(() => {
    if (!profile) return 100;
    return Math.max(
      profile.str_xp,
      profile.vit_xp,
      profile.agi_xp,
      profile.int_xp,
      profile.per_xp,
      50
    );
  }, [profile]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />}
      >
        {/* TOP HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.systemTag}>Hunter Profile</Text>
            <Text style={styles.title}>Your Dossier</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: rankColor }]}>
            <View style={[styles.statusDot, { backgroundColor: rankColor }]} />
            <Text style={[styles.statusPillText, { color: rankColor }]}>
              {profile ? `${profile.rank}-Rank` : 'Identifying'}
            </Text>
          </View>
        </View>

        {/* 1. HUNTER IDENTIFICATION LICENSE CARD */}
        {profile && (
          <View style={[styles.licenseCard, { borderColor: rankColor }]}>
            {/* Card Watermark Header */}
            <View style={styles.licenseHeaderBar}>
              <Text style={styles.licenseHeaderTag}>Hunter License</Text>
              <Text style={styles.licenseSerial}>
                ID: KR-{(profile.id || '00000000').slice(0, 8).toUpperCase()}
              </Text>
            </View>

            {/* Hunter Portrait & Credentials */}
            <View style={styles.licenseBody}>
              <View style={[styles.portraitWrapper, { borderColor: rankColor }]}>
                {rankImage && (
                  <Image source={rankImage} style={styles.portraitImage} contentFit="cover" />
                )}
                <View style={[styles.rankOverlayBadge, { backgroundColor: rankColor }]}>
                  <Text style={styles.rankOverlayText}>{profile.rank}</Text>
                </View>
              </View>

              <View style={styles.credentialsColumn}>
                <View style={styles.nameRow}>
                  <Text style={styles.hunterName} numberOfLines={1}>
                    {profile.username}
                  </Text>
                  <RankBadge rank={profile.rank} size="small" />
                </View>

                <Text style={[styles.hunterTitle, { color: rankColor }]}>
                  {profile.title || `${profile.rank}-Rank Hunter`}
                </Text>

                <View style={styles.levelRow}>
                  <View style={styles.levelChip}>
                    <Text style={styles.levelChipLabel}>LVL</Text>
                    <Text style={styles.levelChipVal}>{profile.level}</Text>
                  </View>
                  <Text style={styles.totalXpText}>
                    {profile.total_xp.toLocaleString()} total XP
                  </Text>
                </View>
              </View>
            </View>

            {/* Level Progress Gauge */}
            {xpProgress && (
              <View style={styles.levelProgressContainer}>
                <View style={styles.levelProgressHeader}>
                  <Text style={styles.progressLabel}>Level Progress</Text>
                  <Text style={[styles.progressVal, { color: rankColor }]}>
                    {xpProgress.xpInCurrentLevel} / {xpProgress.xpNeededForNextLevel} XP ({Math.round(xpProgress.percentage)}%)
                  </Text>
                </View>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, xpProgress.percentage)}%`, backgroundColor: rankColor },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
        )}

        {/* 2. 5 CORE RPG ATTRIBUTES */}
        {profile && (
          <View style={styles.matrixCard}>
            <View style={styles.matrixHeader}>
              <Text style={styles.matrixTitle}>Core Attributes</Text>
              <Text style={styles.matrixSubtitle}>Growth Record</Text>
            </View>

            <View style={styles.statsRow}>
              {/* STR */}
              <View style={styles.statChip}>
                <View style={styles.statChipTop}>
                  <Text style={[styles.statKey, { color: StatColors.STR }]}>STR</Text>
                  <Text style={styles.statAmount}>{profile.str_xp}</Text>
                </View>
                <Text style={styles.statName}>Strength</Text>
                <View style={styles.statBarBg}>
                  <View
                    style={[
                      styles.statBarFill,
                      {
                        width: `${Math.min(100, Math.round((profile.str_xp / maxStatXP) * 100))}%`,
                        backgroundColor: StatColors.STR,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* VIT */}
              <View style={styles.statChip}>
                <View style={styles.statChipTop}>
                  <Text style={[styles.statKey, { color: StatColors.VIT }]}>VIT</Text>
                  <Text style={styles.statAmount}>{profile.vit_xp}</Text>
                </View>
                <Text style={styles.statName}>Vitality</Text>
                <View style={styles.statBarBg}>
                  <View
                    style={[
                      styles.statBarFill,
                      {
                        width: `${Math.min(100, Math.round((profile.vit_xp / maxStatXP) * 100))}%`,
                        backgroundColor: StatColors.VIT,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* AGI */}
              <View style={styles.statChip}>
                <View style={styles.statChipTop}>
                  <Text style={[styles.statKey, { color: StatColors.AGI }]}>AGI</Text>
                  <Text style={styles.statAmount}>{profile.agi_xp}</Text>
                </View>
                <Text style={styles.statName}>Agility</Text>
                <View style={styles.statBarBg}>
                  <View
                    style={[
                      styles.statBarFill,
                      {
                        width: `${Math.min(100, Math.round((profile.agi_xp / maxStatXP) * 100))}%`,
                        backgroundColor: StatColors.AGI,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* INT */}
              <View style={styles.statChip}>
                <View style={styles.statChipTop}>
                  <Text style={[styles.statKey, { color: StatColors.INT }]}>INT</Text>
                  <Text style={styles.statAmount}>{profile.int_xp}</Text>
                </View>
                <Text style={styles.statName}>Intellect</Text>
                <View style={styles.statBarBg}>
                  <View
                    style={[
                      styles.statBarFill,
                      {
                        width: `${Math.min(100, Math.round((profile.int_xp / maxStatXP) * 100))}%`,
                        backgroundColor: StatColors.INT,
                      },
                    ]}
                  />
                </View>
              </View>

              {/* PER */}
              <View style={styles.statChip}>
                <View style={styles.statChipTop}>
                  <Text style={[styles.statKey, { color: StatColors.PER }]}>PER</Text>
                  <Text style={styles.statAmount}>{profile.per_xp}</Text>
                </View>
                <Text style={styles.statName}>Perception</Text>
                <View style={styles.statBarBg}>
                  <View
                    style={[
                      styles.statBarFill,
                      {
                        width: `${Math.min(100, Math.round((profile.per_xp / maxStatXP) * 100))}%`,
                        backgroundColor: StatColors.PER,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 3. ACTIVE TRAINING PROGRAM & GOALS */}
        <View style={styles.protocolCard}>
          <View style={styles.protocolHeader}>
            <Text style={styles.protocolHeaderTag}>Programs & Goals</Text>
            <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
              <Text style={styles.recalibrateAction}>Edit ⚙️</Text>
            </TouchableOpacity>
          </View>

          {/* Training Plan Row */}
          <View style={styles.directiveRow}>
            <View style={styles.directiveIconBox}>
              <Text style={styles.directiveIcon}>
                {planProgress?.planType === '365day' ? '👑' : '⚡'}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.directiveLabel}>Training Program</Text>
              <Text style={styles.directiveMainText}>
                {planProgress?.planName ? planProgress.planName : 'Shadow Awakening'}
              </Text>
              <Text style={styles.directiveSubText}>
                {planProgress
                  ? `Day ${planProgress.currentDay} of ${planProgress.totalDays} • Phase: ${planProgress.phase}`
                  : '100-Day Progressive Home Training'}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Physical Weight Goal Row */}
          <View style={styles.directiveRow}>
            <View style={styles.directiveIconBox}>
              <Text style={styles.directiveIcon}>{activeGoal.emoji}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.directiveLabel}>Fitness Goal</Text>
              <Text style={styles.directiveMainText}>{activeGoal.label}</Text>
              <Text style={styles.directiveSubText}>
                {activeGoal.calorieOffset === 0
                  ? 'Energy Balance (TDEE Match)'
                  : `${activeGoal.calorieOffset > 0 ? '+' : ''}${activeGoal.calorieOffset} kcal/day`}
                {' • '}
                {profile ? `${Math.round(profile.daily_calories ?? 2000)} kcal/day` : '2,000 kcal'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. PHYSIOLOGICAL BIO STATS */}
        {profile && (
          <View style={styles.bioCard}>
            <View style={styles.bioHeader}>
              <Text style={styles.bioTitle}>Body Stats & Targets</Text>
              <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
                <Text style={styles.editLink}>Edit Stats →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bioGrid}>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>Height</Text>
                <Text style={styles.bioCellValue}>{profile.height_cm ?? '--'} <Text style={styles.bioCellUnit}>cm</Text></Text>
              </View>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>Weight</Text>
                <Text style={styles.bioCellValue}>{profile.weight_kg ?? '--'} <Text style={styles.bioCellUnit}>kg</Text></Text>
              </View>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>Age</Text>
                <Text style={styles.bioCellValue}>{profile.age ?? '--'} <Text style={styles.bioCellUnit}>yrs</Text></Text>
              </View>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>BMR Burn</Text>
                <Text style={styles.bioCellValue}>{profile.bmr ? Math.round(profile.bmr) : '--'} <Text style={styles.bioCellUnit}>kcal</Text></Text>
              </View>
            </View>

            {/* Daily Macro Fuel Targets */}
            <View style={styles.macroPillRow}>
              <View style={[styles.macroPill, { borderColor: 'rgba(255, 68, 68, 0.4)' }]}>
                <Text style={[styles.macroPillVal, { color: '#FF4444' }]}>
                  {profile.protein_g ? Math.round(profile.protein_g) : '--'}g
                </Text>
                <Text style={styles.macroPillLabel}>Protein</Text>
              </View>

              <View style={[styles.macroPill, { borderColor: 'rgba(255, 170, 0, 0.4)' }]}>
                <Text style={[styles.macroPillVal, { color: '#FFAA00' }]}>
                  {profile.carbs_g ? Math.round(profile.carbs_g) : '--'}g
                </Text>
                <Text style={styles.macroPillLabel}>Carbs</Text>
              </View>

              <View style={[styles.macroPill, { borderColor: 'rgba(0, 255, 136, 0.4)' }]}>
                <Text style={[styles.macroPillVal, { color: '#00FF88' }]}>
                  {profile.fat_g ? Math.round(profile.fat_g) : '--'}g
                </Text>
                <Text style={styles.macroPillLabel}>Fat</Text>
              </View>

              <View style={[styles.macroPill, { borderColor: 'rgba(0, 168, 255, 0.4)' }]}>
                <Text style={[styles.macroPillVal, { color: '#00A8FF' }]}>
                  {profile.daily_calories ? Math.round(profile.daily_calories) : '--'}
                </Text>
                <Text style={styles.macroPillLabel}>Daily Target</Text>
              </View>
            </View>

            {/* Recalibrate Callout Button */}
            <TouchableOpacity
              style={styles.recalibrateFullBtn}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.8}
            >
              <Text style={styles.recalibrateFullBtnText}>Update Body Stats & Goals ⚙️</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. CLOUD SYNC & ACCOUNT */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncTitle}>Cloud Sync</Text>
            <View style={styles.liveIndicatorRow}>
              <View
                style={[
                  styles.syncDot,
                  { backgroundColor: user && isFirebaseConfigured() ? '#00FF88' : '#FFAA00' },
                ]}
              />
              <Text style={styles.liveStatusText}>
                {user && isFirebaseConfigured() ? 'Online' : isGuest ? 'Guest' : 'Offline'}
              </Text>
            </View>
          </View>

          {user && (
            <View style={styles.userBanner}>
              {user.photoURL ? (
                <Image source={{ uri: user.photoURL }} style={styles.userAvatar} contentFit="cover" />
              ) : (
                <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                  <Text style={styles.userAvatarText}>
                    {(user.displayName?.[0] || user.email?.[0] || 'H').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName}>{user.displayName || 'Hunter'}</Text>
                <Text style={styles.userEmail}>{user.email}</Text>
              </View>
              <View style={styles.cloudVerifiedBadge}>
                <Text style={styles.cloudVerifiedText}>✓ Synced</Text>
              </View>
            </View>
          )}

          <Text style={styles.syncTimeText}>
            Last synchronized:{' '}
            {lastSynced ? new Date(lastSynced).toLocaleString() : 'Local Database Active (Offline Mode)'}
          </Text>

          <TouchableOpacity
            style={[styles.syncActionButton, syncing && styles.syncActionDisabled]}
            disabled={syncing}
            onPress={handleManualSync}
            activeOpacity={0.8}
          >
            <Text style={styles.syncActionText}>
              {syncing ? 'Syncing...' : '⚡ Sync Data with Cloud'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. SIGN OUT BUTTON */}
        {(user || isGuest) && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={styles.signOutBtnText}>
              {user ? 'Sign Out' : 'Exit Guest Mode'}
            </Text>
          </TouchableOpacity>
        )}

        {/* FOOTER */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>Solo Leveling Fitness</Text>
          <Text style={styles.footerSubText}>Offline-first • Progress saved locally</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: Spacing.two,
  },
  headerLeft: {
    gap: 2,
  },
  systemTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#0E1726',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '700',
  },

  // --- License Card ---
  licenseCard: {
    backgroundColor: '#111827',
    borderWidth: 1.5,
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  licenseHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 8,
  },
  licenseHeaderTag: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  licenseSerial: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6B7B8F',
    fontWeight: '600',
  },
  licenseBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  portraitWrapper: {
    width: 76,
    height: 76,
    borderRadius: 14,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#0E1726',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  rankOverlayBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  rankOverlayText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#070B14',
  },
  credentialsColumn: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  hunterName: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
    flex: 1,
  },
  hunterTitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 2,
  },
  levelChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    gap: 4,
  },
  levelChipLabel: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '700',
  },
  levelChipVal: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    color: '#FFFFFF',
    fontWeight: '800',
  },
  totalXpText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
  levelProgressContainer: {
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
    fontWeight: '600',
  },
  progressVal: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#0B1120',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // --- Matrix Card ---
  matrixCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 12,
  },
  matrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixTitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
  },
  matrixSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 8,
    gap: 4,
  },
  statChipTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statKey: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  statAmount: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    color: '#E8ECF4',
    fontWeight: '700',
  },
  statName: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  statBarBg: {
    height: 4,
    backgroundColor: '#0B1120',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  statBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // --- Protocol Card ---
  protocolCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 12,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolHeaderTag: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
  },
  recalibrateAction: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00A8FF',
  },
  directiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directiveIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directiveIcon: {
    fontSize: 20,
  },
  directiveLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '600',
  },
  directiveMainText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  directiveSubText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#8896AB',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#1E293B',
  },

  // --- Bio Card ---
  bioCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 12,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioTitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
  },
  editLink: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#00A8FF',
    fontWeight: '600',
  },
  bioGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bioCell: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 3,
  },
  bioCellLabel: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '500',
  },
  bioCellValue: {
    fontSize: 14,
    fontFamily: Fonts.mono,
    fontWeight: '700',
    color: '#E8ECF4',
  },
  bioCellUnit: {
    fontSize: 9,
    color: '#6B7B8F',
    fontWeight: '400',
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 2,
  },
  macroPillVal: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  macroPillLabel: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
    fontWeight: '600',
  },
  recalibrateFullBtn: {
    backgroundColor: 'rgba(0, 168, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 168, 255, 0.25)',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  recalibrateFullBtnText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00A8FF',
  },

  // --- Sync Card ---
  syncCard: {
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 16,
    padding: Spacing.threeHalf,
    gap: 12,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    fontWeight: '700',
    color: '#00A8FF',
  },
  liveIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  liveStatusText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#8896AB',
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E1726',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  userAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    borderColor: '#00A8FF',
  },
  userAvatarPlaceholder: {
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#00A8FF',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Fonts.sans,
    color: '#E8ECF4',
  },
  userEmail: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  cloudVerifiedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cloudVerifiedText: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#00FF88',
  },
  syncTimeText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: '#6B7B8F',
  },
  syncActionButton: {
    backgroundColor: '#0066BB',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  syncActionDisabled: {
    opacity: 0.5,
  },
  syncActionText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // --- Sign Out ---
  signOutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.4)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  signOutBtnText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4444',
  },

  // --- Footer ---
  footerNote: {
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.one,
  },
  footerText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    fontWeight: '600',
    color: '#3B4D66',
  },
  footerSubText: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: '#2A3A50',
  },
});
