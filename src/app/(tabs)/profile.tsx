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
          'SYNC SUCCESS',
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
      'DISCONNECT SYSTEM',
      'Your local Hunter data will be preserved. You can sign back in anytime to resume cloud synchronization.',
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
        {/* TOP SYSTEM HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.systemTag}>KOREAN HUNTER ASSOCIATION</Text>
            <Text style={styles.title}>HUNTER DOSSIER</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: rankColor }]}>
            <View style={[styles.statusDot, { backgroundColor: rankColor }]} />
            <Text style={[styles.statusPillText, { color: rankColor }]}>
              {profile ? `${profile.rank}-RANK` : 'IDENTIFYING'}
            </Text>
          </View>
        </View>

        {/* 1. HUNTER IDENTIFICATION LICENSE CARD */}
        {profile && (
          <View style={[styles.licenseCard, { borderColor: rankColor }]}>
            {/* Card Watermark Header */}
            <View style={styles.licenseHeaderBar}>
              <Text style={styles.licenseHeaderTag}>[ OFFICIAL HUNTER IDENTIFICATION ]</Text>
              <Text style={styles.licenseSerial}>
                ID: KR-HNTR-{(profile.id || '00000000').slice(0, 8).toUpperCase()}
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
                    {profile.total_xp.toLocaleString()} TOTAL XP
                  </Text>
                </View>
              </View>
            </View>

            {/* Level Progress Gauge */}
            {xpProgress && (
              <View style={styles.levelProgressContainer}>
                <View style={styles.levelProgressHeader}>
                  <Text style={styles.progressLabel}>NEXT LEVEL PROGRESS</Text>
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

        {/* 2. 5 CORE RPG ATTRIBUTES MATRIX */}
        {profile && (
          <View style={styles.matrixCard}>
            <View style={styles.matrixHeader}>
              <Text style={styles.matrixTitle}>HUNTER ATTRIBUTES MATRIX</Text>
              <Text style={styles.matrixSubtitle}>GROWTH RECORD</Text>
            </View>

            <View style={styles.statsRow}>
              {/* STR */}
              <View style={styles.statChip}>
                <View style={styles.statChipTop}>
                  <Text style={[styles.statKey, { color: StatColors.STR }]}>STR</Text>
                  <Text style={styles.statAmount}>{profile.str_xp}</Text>
                </View>
                <Text style={styles.statName}>STRENGTH</Text>
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
                <Text style={styles.statName}>VITALITY</Text>
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
                <Text style={styles.statName}>AGILITY</Text>
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
                <Text style={styles.statName}>INTELLECT</Text>
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
                <Text style={styles.statName}>PERCEPTION</Text>
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

        {/* 3. ACTIVE TRAINING PROTOCOL & DIRECTIVE */}
        <View style={styles.protocolCard}>
          <View style={styles.protocolHeader}>
            <Text style={styles.protocolHeaderTag}>[ SYSTEM DIRECTIVES & PROTOCOLS ]</Text>
            <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
              <Text style={styles.recalibrateAction}>RECALIBRATE ⚙️</Text>
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
              <Text style={styles.directiveLabel}>TRAINING PROGRAM</Text>
              <Text style={styles.directiveMainText}>
                {planProgress?.planName ? planProgress.planName.toUpperCase() : 'SHADOW AWAKENING'}
              </Text>
              <Text style={styles.directiveSubText}>
                {planProgress
                  ? `Day ${planProgress.currentDay} of ${planProgress.totalDays} • Phase: ${planProgress.phase}`
                  : '100-Day Progressive Home Training Protocol'}
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
              <Text style={styles.directiveLabel}>PHYSICAL DIRECTIVE</Text>
              <Text style={styles.directiveMainText}>{activeGoal.label.toUpperCase()}</Text>
              <Text style={styles.directiveSubText}>
                {activeGoal.calorieOffset === 0
                  ? 'Energy Balance (TDEE Match)'
                  : `${activeGoal.calorieOffset > 0 ? '+' : ''}${activeGoal.calorieOffset} kcal/day target`}
                {' • '}
                {profile ? `${Math.round(profile.daily_calories ?? 2000)} kcal/day` : '2000 kcal'}
              </Text>
            </View>
          </View>
        </View>

        {/* 4. PHYSIOLOGICAL BIO-MATRIX HUD */}
        {profile && (
          <View style={styles.bioCard}>
            <View style={styles.bioHeader}>
              <Text style={styles.bioTitle}>BODY BIO-CALIBRATION MATRIX</Text>
              <TouchableOpacity onPress={() => router.push('/onboarding')} activeOpacity={0.7}>
                <Text style={styles.editLink}>EDIT PARAMETERS →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.bioGrid}>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>HEIGHT</Text>
                <Text style={styles.bioCellValue}>{profile.height_cm ?? '--'} <Text style={styles.bioCellUnit}>cm</Text></Text>
              </View>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>WEIGHT</Text>
                <Text style={styles.bioCellValue}>{profile.weight_kg ?? '--'} <Text style={styles.bioCellUnit}>kg</Text></Text>
              </View>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>AGE</Text>
                <Text style={styles.bioCellValue}>{profile.age ?? '--'} <Text style={styles.bioCellUnit}>yrs</Text></Text>
              </View>
              <View style={styles.bioCell}>
                <Text style={styles.bioCellLabel}>BMR BURN</Text>
                <Text style={styles.bioCellValue}>{profile.bmr ? Math.round(profile.bmr) : '--'} <Text style={styles.bioCellUnit}>kcal</Text></Text>
              </View>
            </View>

            {/* Daily Macro Fuel Targets */}
            <View style={styles.macroPillRow}>
              <View style={[styles.macroPill, { borderColor: '#FF4444' }]}>
                <Text style={[styles.macroPillVal, { color: '#FF4444' }]}>
                  {profile.protein_g ? Math.round(profile.protein_g) : '--'}g
                </Text>
                <Text style={styles.macroPillLabel}>PROTEIN</Text>
              </View>

              <View style={[styles.macroPill, { borderColor: '#FFAA00' }]}>
                <Text style={[styles.macroPillVal, { color: '#FFAA00' }]}>
                  {profile.carbs_g ? Math.round(profile.carbs_g) : '--'}g
                </Text>
                <Text style={styles.macroPillLabel}>CARBS</Text>
              </View>

              <View style={[styles.macroPill, { borderColor: '#00FF88' }]}>
                <Text style={[styles.macroPillVal, { color: '#00FF88' }]}>
                  {profile.fat_g ? Math.round(profile.fat_g) : '--'}g
                </Text>
                <Text style={styles.macroPillLabel}>FAT</Text>
              </View>

              <View style={[styles.macroPill, { borderColor: '#00F0FF' }]}>
                <Text style={[styles.macroPillVal, { color: '#00F0FF' }]}>
                  {profile.daily_calories ? Math.round(profile.daily_calories) : '--'}
                </Text>
                <Text style={styles.macroPillLabel}>TOTAL KCAL</Text>
              </View>
            </View>

            {/* Recalibrate Callout Button */}
            <TouchableOpacity
              style={styles.recalibrateFullBtn}
              onPress={() => router.push('/onboarding')}
              activeOpacity={0.8}
            >
              <Text style={styles.recalibrateFullBtnText}>RECALIBRATE PHYSIQUE & DIRECTIVE ⚙️</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 5. GUILD NETWORK & CLOUD SYNC TERMINAL */}
        <View style={styles.syncCard}>
          <View style={styles.syncHeader}>
            <Text style={styles.syncTitle}>HUNTER GUILD NETWORK SYNC</Text>
            <View style={styles.liveIndicatorRow}>
              <View
                style={[
                  styles.syncDot,
                  { backgroundColor: user && isFirebaseConfigured() ? '#00FF88' : '#FFAA00' },
                ]}
              />
              <Text style={styles.liveStatusText}>
                {user && isFirebaseConfigured() ? 'ONLINE' : isGuest ? 'GUEST' : 'OFFLINE'}
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
                <Text style={styles.cloudVerifiedText}>✓ SYNCED</Text>
              </View>
            </View>
          )}

          <Text style={styles.syncTimeText}>
            Last Terminal Synchronized:{' '}
            {lastSynced ? new Date(lastSynced).toLocaleString() : 'Local Database Active (Offline Mode)'}
          </Text>

          <TouchableOpacity
            style={[styles.syncActionButton, syncing && styles.syncActionDisabled]}
            disabled={syncing}
            onPress={handleManualSync}
            activeOpacity={0.8}
          >
            <Text style={styles.syncActionText}>
              {syncing ? 'TRANSMITTING PACKETS...' : '⚡ SYNCHRONIZE DATA WITH CLOUD'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 6. SIGN OUT BUTTON */}
        {(user || isGuest) && (
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={styles.signOutBtnText}>
              {user ? '🚪 DISCONNECT & SIGN OUT' : '🚪 EXIT GUEST MODE'}
            </Text>
          </TouchableOpacity>
        )}

        {/* SYSTEM FOOTER WATERMARK */}
        <View style={styles.footerNote}>
          <Text style={styles.footerText}>THE SYSTEM • SOLO LEVELING ARCHITECTURE</Text>
          <Text style={styles.footerSubText}>LOCAL SQLITE PROTOCOL // FULL IMMERSIVE HUD</Text>
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
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
    fontWeight: '800',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 1,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#090E1A',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // --- License Card ---
  licenseCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: Spacing.three,
    gap: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  licenseHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#172744',
    paddingBottom: 8,
  },
  licenseHeaderTag: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1,
    fontWeight: '800',
  },
  licenseSerial: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  licenseBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  portraitWrapper: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#070C16',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
  rankOverlayBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 1,
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
    fontWeight: '900',
    color: '#E0E8FF',
    flex: 1,
  },
  hunterTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    letterSpacing: 1,
    fontWeight: '700',
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
    backgroundColor: 'rgba(0, 240, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00F0FF',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    gap: 4,
  },
  levelChipLabel: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    fontWeight: '800',
  },
  levelChipVal: {
    fontSize: 13,
    fontFamily: Fonts.mono,
    color: '#FFFFFF',
    fontWeight: '900',
  },
  totalXpText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    fontWeight: '700',
  },
  levelProgressContainer: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#162846',
    borderRadius: 8,
    padding: 10,
    gap: 6,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  progressVal: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#070B14',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  // --- Matrix Card ---
  matrixCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 10,
  },
  matrixHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  matrixTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  matrixSubtitle: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  statChip: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#162846',
    borderRadius: 8,
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
    fontWeight: '900',
  },
  statAmount: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
    fontWeight: '800',
  },
  statName: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#556F91',
  },
  statBarBg: {
    height: 3,
    backgroundColor: '#070B14',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginTop: 2,
  },
  statBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },

  // --- Protocol Card ---
  protocolCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 10,
  },
  protocolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  protocolHeaderTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  recalibrateAction: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00F0FF',
  },
  directiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  directiveIconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#1C335C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  directiveIcon: {
    fontSize: 18,
  },
  directiveLabel: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '800',
    letterSpacing: 1,
  },
  directiveMainText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 0.5,
  },
  directiveSubText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#162846',
  },

  // --- Bio Card ---
  bioCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 12,
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bioTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  editLink: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    fontWeight: '800',
  },
  bioGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  bioCell: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#162846',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 2,
  },
  bioCellLabel: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  bioCellValue: {
    fontSize: 14,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#E0E8FF',
  },
  bioCellUnit: {
    fontSize: 9,
    color: '#556F91',
    fontWeight: '400',
  },
  macroPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  macroPill: {
    flex: 1,
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    gap: 2,
  },
  macroPillVal: {
    fontSize: 12,
    fontFamily: Fonts.mono,
    fontWeight: '900',
  },
  macroPillLabel: {
    fontSize: 7,
    fontFamily: Fonts.mono,
    color: '#556F91',
    fontWeight: '700',
  },
  recalibrateFullBtn: {
    backgroundColor: 'rgba(0, 168, 255, 0.1)',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  recalibrateFullBtnText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00F0FF',
    letterSpacing: 0.5,
  },

  // --- Sync Card ---
  syncCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 12,
    padding: Spacing.three,
    gap: 10,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  syncTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00A8FF',
    letterSpacing: 1,
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
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#A0BBE0',
  },
  userBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#162846',
    borderRadius: 8,
    padding: 10,
    gap: 10,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#00A8FF',
  },
  userAvatarPlaceholder: {
    backgroundColor: '#162846',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userAvatarText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#00A8FF',
  },
  userName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#E0E8FF',
  },
  userEmail: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
  },
  cloudVerifiedBadge: {
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    borderWidth: 1,
    borderColor: '#00FF88',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  cloudVerifiedText: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#00FF88',
  },
  syncTimeText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#556F91',
  },
  syncActionButton: {
    backgroundColor: '#0055AA',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  syncActionDisabled: {
    opacity: 0.5,
  },
  syncActionText: {
    fontFamily: Fonts.mono,
    fontSize: 11,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },

  // --- Sign Out ---
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.05)',
  },
  signOutBtnText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#FF4444',
    letterSpacing: 1,
  },

  // --- Footer ---
  footerNote: {
    alignItems: 'center',
    gap: 3,
    marginTop: Spacing.one,
  },
  footerText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#273852',
    letterSpacing: 1.5,
  },
  footerSubText: {
    fontSize: 8,
    fontFamily: Fonts.mono,
    color: '#1E2C40',
    letterSpacing: 1,
  },
});
