import React, { useState, useCallback } from 'react';
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
import { useRouter, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { getProfile, getLastSyncedAt } from '@/db/operations';
import { syncPendingRecords } from '@/services/syncService';
import { type Profile } from '@/types';
import { RankBadge } from '@/components/status/rank-badge';
import { isFirebaseConfigured } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Fonts, Spacing, RankColors } from '@/constants/theme';
import { getRankImage } from '@/constants/rankImages';

export default function ProfileScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { user, signOut, isGuest } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(db);
      setProfile(p);
      const ls = await getLastSyncedAt(db);
      setLastSynced(ls);
    } catch (err) {
      console.error('Error loading profile:', err);
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
      'SIGN OUT',
      'Your local data will be preserved. You can sign back in anytime to resume cloud sync.',
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00A8FF" />}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.systemTag}>HUNTER REGISTRY</Text>
          <Text style={styles.title}>HUNTER PROFILE</Text>
        </View>

        {/* GOOGLE ACCOUNT CARD */}
        {user && (
          <View style={styles.accountCard}>
            <View style={styles.accountRow}>
              {user.photoURL ? (
                <Image
                  source={{ uri: user.photoURL }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitial}>
                    {(user.displayName?.[0] || user.email?.[0] || '?').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.accountName}>
                  {user.displayName || 'Hunter'}
                </Text>
                <Text style={styles.accountEmail}>
                  {user.email}
                </Text>
              </View>
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓</Text>
              </View>
            </View>
          </View>
        )}

        {isGuest && (
          <View style={styles.guestBanner}>
            <Text style={styles.guestIcon}>👤</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.guestTitle}>GUEST MODE</Text>
              <Text style={styles.guestSub}>Data saved locally only — sign in to enable cloud sync</Text>
            </View>
          </View>
        )}

        {/* PROFILE CARD WITH RANK PORTRAIT */}
        {profile && (
          <View style={[styles.profileCard, { borderColor: rankColor, shadowColor: rankColor }]}>
            <View style={styles.profileTop}>
              <View style={[styles.hunterPortraitBox, { borderColor: rankColor }]}>
                {rankImage && (
                  <Image source={rankImage} style={styles.hunterPortraitImg} contentFit="cover" />
                )}
                <View style={[styles.rankBadgeCorner, { backgroundColor: rankColor }]}>
                  <Text style={styles.rankBadgeCornerText}>{profile.rank}</Text>
                </View>
              </View>

              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.hunterName}>{profile.username}</Text>
                <Text style={[styles.hunterTitle, { color: rankColor }]}>
                  {profile.title || `${profile.rank}-Rank Hunter`}
                </Text>
                <Text style={styles.totalXP}>TOTAL EXP: {profile.total_xp.toLocaleString()} PTS</Text>
                <Text style={styles.hunterLevelText}>LEVEL {profile.level}</Text>
              </View>

              <RankBadge rank={profile.rank} size="medium" />
            </View>
          </View>
        )}

        {/* PHYSIOLOGICAL CALIBRATION */}
        {profile && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>BODY MATRIX & TDEE</Text>
              <TouchableOpacity onPress={() => router.push('/onboarding')}>
                <Text style={styles.editLink}>RECALIBRATE →</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>HEIGHT</Text>
                <Text style={styles.statBoxValue}>{profile.height_cm ?? '--'} cm</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>WEIGHT</Text>
                <Text style={styles.statBoxValue}>{profile.weight_kg ?? '--'} kg</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>AGE</Text>
                <Text style={styles.statBoxValue}>{profile.age ?? '--'} yrs</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statBoxLabel}>BMR</Text>
                <Text style={styles.statBoxValue}>{profile.bmr ?? '--'} kcal</Text>
              </View>
            </View>

            <View style={styles.tdeeHighlight}>
              <Text style={styles.tdeeLabel}>DAILY TARGET (TDEE)</Text>
              <Text style={styles.tdeeValue}>{profile.daily_calories ?? 2000} kcal/day</Text>
            </View>
          </View>
        )}

        {/* SYNC & CLOUD STORAGE STATUS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>SYSTEM SYNC & CLOUD BACKUP</Text>

          <View style={styles.syncStatusRow}>
            <View style={[
              styles.syncStatusDot,
              { backgroundColor: user && isFirebaseConfigured() ? '#00FF88' : '#FFAA00' },
            ]} />
            <Text style={styles.syncStatusText}>
              {user && isFirebaseConfigured()
                ? 'ONLINE — FIREBASE FIRESTORE CONNECTED'
                : isGuest
                ? 'GUEST MODE — LOCAL SQLITE ONLY'
                : 'OFFLINE-FIRST — LOCAL SQLITE ACTIVE'}
            </Text>
          </View>

          <Text style={styles.syncMeta}>
            Last Synced:{' '}
            {lastSynced
              ? new Date(lastSynced).toLocaleString()
              : 'Local data only (Ready to sync)'}
          </Text>

          <TouchableOpacity
            style={[styles.syncButton, syncing && styles.syncButtonDisabled]}
            disabled={syncing}
            onPress={handleManualSync}
          >
            <Text style={styles.syncButtonText}>
              {syncing ? 'SYNCING QUEUE...' : '⚡ SYNC NOW (OFFLINE/CLOUD)'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* SIGN OUT BUTTON */}
        {(user || isGuest) && (
          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Text style={styles.signOutText}>
              {user ? '🚪 SIGN OUT' : '🚪 EXIT GUEST MODE'}
            </Text>
          </TouchableOpacity>
        )}

        {/* SYSTEM ATTRIBUTION */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>THE SYSTEM</Text>
          <Text style={styles.aboutText}>
            Solo Leveling Gamified Fitness & Habit Engine.{'\n'}
            Offline-First Architecture powered by Expo-SQLite.
          </Text>
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
    marginTop: Spacing.two,
  },
  systemTag: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00A8FF',
    letterSpacing: 1.5,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E0E8FF',
    letterSpacing: 1,
  },
  accountCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderColor: '#00FF88',
    borderRadius: 12,
    padding: Spacing.three,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#00A8FF',
  },
  avatarPlaceholder: {
    backgroundColor: '#19315A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00A8FF',
  },
  accountName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E0E8FF',
  },
  accountEmail: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    marginTop: 1,
  },
  verifiedBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00FF88',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#070B14',
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 170, 0, 0.08)',
    borderWidth: 1,
    borderColor: '#FFAA00',
    borderRadius: 10,
    padding: Spacing.three,
    gap: 10,
  },
  guestIcon: {
    fontSize: 22,
  },
  guestTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#FFAA00',
    letterSpacing: 1,
  },
  guestSub: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#D4C09B',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1.5,
    borderRadius: 14,
    padding: Spacing.three,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  profileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  hunterPortraitBox: {
    width: 68,
    height: 68,
    borderRadius: 12,
    borderWidth: 2,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#070C16',
  },
  hunterPortraitImg: {
    width: '100%',
    height: '100%',
  },
  rankBadgeCorner: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderTopLeftRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  rankBadgeCornerText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#070B14',
  },
  hunterName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E0E8FF',
  },
  hunterTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    letterSpacing: 1,
    marginTop: 1,
    fontWeight: '700',
  },
  totalXP: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
    marginTop: 2,
  },
  hunterLevelText: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#E0E8FF',
  },
  sectionCard: {
    backgroundColor: '#0D1424',
    borderWidth: 1,
    borderColor: '#19315A',
    borderRadius: 10,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '800',
    color: '#00A8FF',
    letterSpacing: 1,
  },
  editLink: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#00F0FF',
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statBox: {
    width: '48%',
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#162846',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    gap: 2,
  },
  statBoxLabel: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#5B7599',
  },
  statBoxValue: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Fonts.mono,
    color: '#E0E8FF',
  },
  tdeeHighlight: {
    backgroundColor: '#090E1A',
    borderWidth: 1,
    borderColor: '#0055AA',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tdeeLabel: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#6582A6',
  },
  tdeeValue: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: Fonts.mono,
    color: '#00F0FF',
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FF88',
  },
  syncStatusText: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#A0BBE0',
    fontWeight: '700',
  },
  syncMeta: {
    fontSize: 10,
    fontFamily: Fonts.mono,
    color: '#556F91',
  },
  syncButton: {
    backgroundColor: '#0055AA',
    borderWidth: 1,
    borderColor: '#00A8FF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  syncButtonText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  signOutButton: {
    borderWidth: 1.5,
    borderColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 68, 68, 0.06)',
  },
  signOutText: {
    fontFamily: Fonts.mono,
    fontSize: 12,
    fontWeight: '800',
    color: '#FF4444',
    letterSpacing: 1.5,
  },
  aboutCard: {
    padding: Spacing.two,
    alignItems: 'center',
    gap: 4,
  },
  aboutTitle: {
    fontSize: 11,
    fontFamily: Fonts.mono,
    fontWeight: '900',
    color: '#3B577D',
    letterSpacing: 2,
  },
  aboutText: {
    fontSize: 9,
    fontFamily: Fonts.mono,
    color: '#3B577D',
    textAlign: 'center',
    lineHeight: 14,
  },
});
