import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Platform,
  Alert,
  Modal,
  PanResponder,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
  FadeInDown,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import { useAuth } from '@/contexts/AuthContext';
import { useAudio } from '@/contexts/AudioContext';
import {
  getProfile,
  getCurrentPlanProgress,
  getLastSyncedAt,
} from '@/db/operations';
import { syncPendingRecords } from '@/services/syncService';
import type { Profile } from '@/types';
import { isFirebaseConfigured } from '@/lib/firebase';
import { Fonts } from '@/constants/theme';
import {
  getVoiceGuidanceEnabled,
  setVoiceGuidanceEnabled,
  speakVoiceGuidance,
} from '@/services/voiceGuidance';

const HAPTIC_STORAGE_KEY = '@solo_system_haptics_enabled';
const QUEST_REMINDER_KEY = '@solo_system_quest_reminder_time';
const TRAINING_PREF_KEY = '@solo_system_training_pref';

const ICONS = {
  soloAppIcon: require('@/../public/solo-app-icon.png'),
  arrowLeft: require('@/../public/arrow-left.svg'),
  volume2: require('@/../public/volume-2.svg'),
  messageSquareMore: require('@/../public/message-square-more.svg'),
  vibrate: require('@/../public/vibrate.svg'),
  target: require('@/../public/target.svg'),
  bell: require('@/../public/bell.svg'),
  shieldCheck: require('@/../public/shield-check.svg'),
  database: require('@/../public/database.svg'),
  logOut: require('@/../public/log-out.svg'),
  chevronRight: require('@/../public/chevron-right.svg'),
  layoutDashboard: require('@/../public/layout-dashboard.svg'),
  scrollText: require('@/../public/scroll-text.svg'),
  zap: require('@/../public/zap.svg'),
  barChart3: require('@/../public/bar-chart-3.svg'),
  userRound: require('@/../public/user-round.svg'),
};

/**
 * Custom animated toggle switch matching Figma #19:547 / #19:556
 */
function SystemSwitch({
  active,
  onToggle,
}: {
  active: boolean;
  onToggle: () => void;
}) {
  const offset = useSharedValue(active ? 18 : 0);

  useEffect(() => {
    offset.value = withSpring(active ? 18 : 0, {
      damping: 15,
      stiffness: 220,
    });
  }, [active, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <Pressable
      onPress={onToggle}
      style={[
        styles.switchContainer,
        active ? styles.switchContainerActive : styles.switchContainerInactive,
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: active }}
    >
      <Animated.View
        style={[
          styles.switchThumb,
          active ? styles.switchThumbActive : styles.switchThumbInactive,
          thumbStyle,
        ]}
      />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const db = useSQLiteContext();
  const { user, signOut, isGuest } = useAuth();
  const {
    bgmVolume,
    sfxVolume,
    setBGMVolume,
    setSFXVolume,
    sfxEnabled,
    setSFXEnabled,
    playTouchSound,
  } = useAudio();

  const { width: windowWidth } = useWindowDimensions();

  // Real player data states
  const [profile, setProfile] = useState<Profile | null>(null);
  const [planProgress, setPlanProgress] = useState<any | null>(null);
  const [lastSynced, setLastSynced] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Settings interactive states
  const [volume, setVolume] = useState<number>(0.72);
  const [voiceGuidance, setVoiceGuidance] = useState<boolean>(true);
  const [hapticFeedback, setHapticFeedback] = useState<boolean>(true);
  const [questReminderTime, setQuestReminderTime] = useState<string>('07:00');
  const [trainingPref, setTrainingPref] = useState<string>('Adaptive');

  // Modals
  const [prefModalVisible, setPrefModalVisible] = useState(false);
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [syncNoticeVisible, setSyncNoticeVisible] = useState(false);

  /* ─────────────── FIGMA DESIGN ANIMATIONS ─────────────── */

  // 1. Cyan Vertical Energy Rail Continuous Breathing Pulse (Figma #19:516)
  const energyRailPulse = useSharedValue(0.45);
  useEffect(() => {
    energyRailPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1600, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [energyRailPulse]);

  const energyRailAnimStyle = useAnimatedStyle(() => ({
    opacity: energyRailPulse.value,
  }));

  // 2. Player Context Card Purple Neon Breathing Glow (Figma #19:515)
  const cardGlowPulse = useSharedValue(0.35);
  useEffect(() => {
    cardGlowPulse.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.35, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [cardGlowPulse]);

  const cardGlowAnimStyle = useAnimatedStyle(() => ({
    shadowOpacity: cardGlowPulse.value,
  }));

  // 3. Online Status Dot Breathing Animation (Figma #19:524)
  const statusScale = useSharedValue(1);
  useEffect(() => {
    statusScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.9, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [statusScale]);

  const statusAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statusScale.value }],
  }));

  // 4. Active Navigation Marker Pulse (Figma #19:616)
  const navMarkerPulse = useSharedValue(0.7);
  useEffect(() => {
    navMarkerPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [navMarkerPulse]);

  const navMarkerAnimStyle = useAnimatedStyle(() => ({
    opacity: navMarkerPulse.value,
  }));

  /* ─────────────── DATA LOADING & PERSISTENCE ─────────────── */

  const loadData = useCallback(async () => {
    try {
      const p = await getProfile(db);
      setProfile(p);

      const pp = await getCurrentPlanProgress(db);
      setPlanProgress(pp);

      const ls = await getLastSyncedAt(db);
      setLastSynced(ls);

      // Load saved preferences
      const [savedHaptic, savedReminder, savedPref, voiceEnabled] = await Promise.all([
        AsyncStorage.getItem(HAPTIC_STORAGE_KEY),
        AsyncStorage.getItem(QUEST_REMINDER_KEY),
        AsyncStorage.getItem(TRAINING_PREF_KEY),
        getVoiceGuidanceEnabled(),
      ]);

      if (savedHaptic !== null) setHapticFeedback(savedHaptic === 'true');
      if (savedReminder !== null) setQuestReminderTime(savedReminder);
      if (savedPref !== null) setTrainingPref(savedPref);
      setVoiceGuidance(voiceEnabled);
    } catch (err) {
      console.warn('[Settings] Failed to load profile & settings data:', err);
    }
  }, [db]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Synchronize initial volume with audio context
  useEffect(() => {
    const currentVol = Math.max(bgmVolume, sfxVolume);
    if (currentVol > 0) {
      setVolume(currentVol);
    }
  }, [bgmVolume, sfxVolume]);

  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback) return;
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(25);
    }
  }, [hapticFeedback]);

  // Handle volume change
  const handleVolumeChange = useCallback(
    (newVolume: number) => {
      const clamped = Math.max(0, Math.min(1, Math.round(newVolume * 100) / 100));
      setVolume(clamped);
      setBGMVolume(clamped);
      setSFXVolume(clamped);
    },
    [setBGMVolume, setSFXVolume]
  );

  // Volume slider layout measurement and gesture handling
  const sliderWidthRef = useRef<number>(240);
  const sliderContainerRef = useRef<View>(null);

  const updateVolumeFromPageX = useCallback(
    (pageX: number, locationX?: number) => {
      if (sliderContainerRef.current) {
        sliderContainerRef.current.measure((_x, _y, width, _height, pageXOffset) => {
          sliderWidthRef.current = width;
          const relativeX = locationX !== undefined ? locationX : pageX - pageXOffset;
          const ratio = Math.max(0, Math.min(1, relativeX / width));
          handleVolumeChange(ratio);
        });
      }
    },
    [handleVolumeChange]
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          playTouchSound();
          triggerHaptic();
          updateVolumeFromPageX(evt.nativeEvent.pageX, evt.nativeEvent.locationX);
        },
        onPanResponderMove: (evt) => {
          updateVolumeFromPageX(evt.nativeEvent.pageX);
        },
      }),
    [playTouchSound, triggerHaptic, updateVolumeFromPageX]
  );

  // Toggle Voice Guidance
  const handleToggleVoice = useCallback(async () => {
    playTouchSound();
    triggerHaptic();
    const next = !voiceGuidance;
    setVoiceGuidance(next);
    await setVoiceGuidanceEnabled(next);
    if (next) {
      speakVoiceGuidance('Voice guidance activated.');
    }
  }, [playTouchSound, triggerHaptic, voiceGuidance]);

  // Toggle Haptics
  const handleToggleHaptic = useCallback(async () => {
    playTouchSound();
    const next = !hapticFeedback;
    setHapticFeedback(next);
    if (next && Platform.OS === 'web' && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }
    await AsyncStorage.setItem(HAPTIC_STORAGE_KEY, String(next)).catch(() => {});
  }, [playTouchSound, hapticFeedback]);

  // Save Training Pref
  const handleSelectPref = useCallback(
    async (pref: string) => {
      playTouchSound();
      triggerHaptic();
      setTrainingPref(pref);
      setPrefModalVisible(false);
      await AsyncStorage.setItem(TRAINING_PREF_KEY, pref).catch(() => {});
    },
    [playTouchSound, triggerHaptic]
  );

  // Save Quest Reminder
  const handleSelectReminder = useCallback(
    async (time: string) => {
      playTouchSound();
      triggerHaptic();
      setQuestReminderTime(time);
      setReminderModalVisible(false);
      await AsyncStorage.setItem(QUEST_REMINDER_KEY, time).catch(() => {});
    },
    [playTouchSound, triggerHaptic]
  );

  // Manual Cloud Sync
  const handleManualSync = useCallback(async () => {
    if (syncing) return;
    playTouchSound();
    triggerHaptic();
    setSyncing(true);
    try {
      await syncPendingRecords(db, user?.uid ?? null);
      const ls = await getLastSyncedAt(db);
      setLastSynced(ls || new Date().toISOString());
      setSyncNoticeVisible(true);
      speakVoiceGuidance('System data synchronized.');
    } catch (err) {
      console.warn('[Settings] Manual sync failed:', err);
    } finally {
      setSyncing(false);
    }
  }, [syncing, playTouchSound, triggerHaptic, user, db]);

  // Sign out confirmation
  const handleSignOut = useCallback(() => {
    playTouchSound();
    triggerHaptic();
    Alert.alert(
      user ? 'Sign Out' : 'Exit Guest Mode',
      'End session on this device? Your local quest data and stats will be preserved safely.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: user ? 'Sign Out' : 'Exit',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/login');
          },
        },
      ]
    );
  }, [playTouchSound, triggerHaptic, user, signOut, router]);

  // Real player data computed values from database & auth
  const playerName = useMemo(() => {
    return (profile?.username || user?.displayName || 'HUNTER').toUpperCase();
  }, [profile, user]);

  const playerLevel = useMemo(() => {
    return profile?.level ?? 1;
  }, [profile]);

  const playerRankTitle = useMemo(() => {
    const rank = profile?.rank || 'E';
    const title = (profile?.title || 'E-RANK HUNTER').toUpperCase();
    return `${rank}-RANK · ${title}`;
  }, [profile]);

  const syncStatusText = useMemo(() => {
    if (syncing) return 'SYNCING...';
    if (user && isFirebaseConfigured()) return 'SYNCED';
    if (isGuest) return 'SYNCED';
    return 'SYNCED';
  }, [syncing, user, isGuest]);

  const volumePercent = useMemo(() => {
    return Math.round(volume * 100);
  }, [volume]);

  // Responsive constraint for larger displays
  const isLargeScreen = windowWidth > 500;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={[styles.rootContainer, isLargeScreen && styles.responsiveFrame]}>
        {/* ──────────────── 1. SOLO APP HEADER (Figma #33:32) ──────────────── */}
        <View style={styles.appHeader}>
          <View style={styles.brandRow}>
            <View style={styles.brandIconBox}>
              <Image
                source={ICONS.soloAppIcon}
                style={styles.brandIconImage}
                contentFit="cover"
              />
            </View>
            <Text style={styles.brandTitleText}>SOLO SYSTEM</Text>
          </View>
        </View>

        {/* ──────────────── 2. SETTINGS SCROLL CONTENT (Figma #19:508) ──────────────── */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Header (Figma #19:509) */}
          <Animated.View entering={FadeInDown.duration(350)} style={styles.pageHeader}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() => {
                playTouchSound();
                triggerHaptic();
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(tabs)/profile');
                }
              }}
              accessibilityLabel="Go back"
              accessibilityRole="button"
            >
              <Image
                source={ICONS.arrowLeft}
                style={styles.backIcon}
                contentFit="contain"
              />
            </TouchableOpacity>

            <View style={styles.headingGroup}>
              <Text style={styles.headingSubtitle}>SYSTEM CONFIGURATION</Text>
              <Text style={styles.headingTitle}>SETTINGS</Text>
            </View>
          </Animated.View>

          {/* Player Context Card (Figma #19:515) */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(80)}
            style={[styles.playerContextCard, cardGlowAnimStyle]}
          >
            {/* Cyan Vertical Energy Rail with Breathing Pulse */}
            <Animated.View style={[styles.energyRail, energyRailAnimStyle]} />

            {/* Level Marker Box */}
            <View style={styles.levelMarkerBox}>
              <Text style={styles.levelMarkerPrefix}>LV.</Text>
              <Text style={styles.levelMarkerNumber}>{playerLevel}</Text>
            </View>

            {/* Player Details */}
            <View style={styles.playerDetailsGroup}>
              <Text style={styles.playerNameText} numberOfLines={1}>
                {playerName}
              </Text>
              <Text style={styles.playerRankText} numberOfLines={1}>
                {playerRankTitle}
              </Text>
            </View>

            {/* Sync Status Badge */}
            <View style={styles.syncStatusGroup}>
              <Animated.View style={[styles.syncStatusDot, statusAnimStyle]} />
              <Text style={styles.syncStatusText}>{syncStatusText}</Text>
            </View>
          </Animated.View>

          {/* ──────────────── SECTION 1: AUDIO & FEEDBACK (Figma #19:526) ──────────────── */}
          <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.sectionWrapper}>
            <Text style={styles.sectionHeaderTitle}>AUDIO & FEEDBACK</Text>

            <View style={styles.settingsCard}>
              {/* Item 1: System volume control with interactive slider */}
              <View style={styles.volumeControlContainer}>
                <View style={styles.settingRow}>
                  <View style={styles.volumeIconBox}>
                    <Image
                      source={ICONS.volume2}
                      style={styles.settingIconCyan}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.settingCopyGroup}>
                    <Text style={styles.settingTitleText}>System volume</Text>
                    <Text style={styles.settingSubtitleText}>
                      Voice prompts, rewards and workout cues
                    </Text>
                  </View>
                  <Text style={styles.volumePercentText}>{volumePercent}%</Text>
                </View>

                {/* Volume Slider Track */}
                <View
                  ref={sliderContainerRef as any}
                  style={styles.sliderInteractiveArea}
                  {...panResponder.panHandlers}
                >
                  <View style={styles.sliderTrackBackground}>
                    <View
                      style={[
                        styles.sliderTrackActive,
                        { width: `${Math.max(4, Math.min(100, volume * 100))}%` },
                      ]}
                    />
                    <View
                      style={[
                        styles.sliderThumb,
                        { left: `${Math.max(0, Math.min(96, volume * 100))}%` },
                      ]}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Item 2: Voice guidance toggle */}
              <View style={styles.settingRowWithPadding}>
                <View style={styles.settingIconBoxNavy}>
                  <Image
                    source={ICONS.messageSquareMore}
                    style={styles.settingIconMuted}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleText}>Voice guidance</Text>
                  <Text style={styles.settingSubtitleText}>
                    Rep counts and interval alerts
                  </Text>
                </View>
                <SystemSwitch active={voiceGuidance} onToggle={handleToggleVoice} />
              </View>

              <View style={styles.divider} />

              {/* Item 3: Haptic feedback toggle */}
              <View style={styles.settingRowWithPadding}>
                <View style={styles.settingIconBoxNavy}>
                  <Image
                    source={ICONS.vibrate}
                    style={styles.settingIconMuted}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleText}>Haptic feedback</Text>
                  <Text style={styles.settingSubtitleText}>
                    System confirmations and milestones
                  </Text>
                </View>
                <SystemSwitch active={hapticFeedback} onToggle={handleToggleHaptic} />
              </View>
            </View>
          </Animated.View>

          {/* ──────────────── SECTION 2: TRAINING SYSTEM (Figma #19:558) ──────────────── */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.sectionWrapper}>
            <Text style={styles.sectionHeaderTitle}>TRAINING SYSTEM</Text>

            <View style={styles.settingsCard}>
              {/* Training preferences */}
              <TouchableOpacity
                style={styles.settingRowWithPadding}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  triggerHaptic();
                  setPrefModalVisible(true);
                }}
              >
                <View style={styles.settingIconBoxNavy}>
                  <Image
                    source={ICONS.target}
                    style={styles.settingIconMuted}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleText}>Training preferences</Text>
                </View>
                <Text style={styles.settingValueText}>{trainingPref}</Text>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Quest reminders */}
              <TouchableOpacity
                style={styles.settingRowWithPadding}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  triggerHaptic();
                  setReminderModalVisible(true);
                }}
              >
                <View style={styles.settingIconBoxNavy}>
                  <Image
                    source={ICONS.bell}
                    style={styles.settingIconMuted}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleText}>Quest reminders</Text>
                </View>
                <Text style={styles.settingValueText}>{questReminderTime}</Text>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ──────────────── SECTION 3: ACCOUNT & DATA (Figma #19:575) ──────────────── */}
          <Animated.View entering={FadeInDown.duration(400).delay(260)} style={styles.sectionWrapper}>
            <Text style={styles.sectionHeaderTitle}>ACCOUNT & DATA</Text>

            <View style={styles.settingsCard}>
              {/* Privacy & connected apps */}
              <TouchableOpacity
                style={styles.settingRowWithPadding}
                activeOpacity={0.7}
                onPress={() => {
                  playTouchSound();
                  triggerHaptic();
                  setPrivacyModalVisible(true);
                }}
              >
                <View style={styles.settingIconBoxNavy}>
                  <Image
                    source={ICONS.shieldCheck}
                    style={styles.settingIconMuted}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleText}>Privacy & connected apps</Text>
                </View>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* System data */}
              <TouchableOpacity
                style={styles.settingRowWithPadding}
                activeOpacity={0.7}
                onPress={handleManualSync}
              >
                <View style={styles.settingIconBoxNavy}>
                  <Image
                    source={ICONS.database}
                    style={styles.settingIconMuted}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleText}>System data</Text>
                </View>
                <Text style={styles.settingValueText}>
                  {syncing ? 'Syncing...' : 'Synced'}
                </Text>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIcon}
                  contentFit="contain"
                />
              </TouchableOpacity>

              <View style={styles.divider} />

              {/* Sign out */}
              <TouchableOpacity
                style={styles.settingRowWithPadding}
                activeOpacity={0.7}
                onPress={handleSignOut}
              >
                <View style={styles.settingIconBoxRed}>
                  <Image
                    source={ICONS.logOut}
                    style={styles.settingIconRed}
                    contentFit="contain"
                  />
                </View>
                <View style={styles.settingCopyGroup}>
                  <Text style={styles.settingTitleTextRed}>Sign out</Text>
                  <Text style={styles.settingSubtitleText}>
                    End session on this device
                  </Text>
                </View>
                <Image
                  source={ICONS.chevronRight}
                  style={styles.chevronIconRed}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Footer System Verification (Figma #19:599) */}
          <Text style={styles.footerSecurityText}>
            SYSTEM v2.7.19 · PLAYER DATA SECURED
          </Text>
        </ScrollView>

        {/* ──────────────── 3. BOTTOM NAVIGATION (Figma #19:600) ──────────────── */}
        <View style={styles.bottomNavContainer}>
          {/* System Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => {
              playTouchSound();
              triggerHaptic();
              router.push('/(tabs)');
            }}
          >
            <Image
              source={ICONS.layoutDashboard}
              style={styles.navIconInactive}
              contentFit="contain"
            />
            <Text style={styles.navLabelInactive}>System</Text>
          </TouchableOpacity>

          {/* Quests Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => {
              playTouchSound();
              triggerHaptic();
              router.push('/(tabs)/quests');
            }}
          >
            <Image
              source={ICONS.scrollText}
              style={styles.navIconInactive}
              contentFit="contain"
            />
            <Text style={styles.navLabelInactive}>Quests</Text>
          </TouchableOpacity>

          {/* Train Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => {
              playTouchSound();
              triggerHaptic();
              router.push('/(tabs)/activity');
            }}
          >
            <Image
              source={ICONS.zap}
              style={styles.navIconInactive}
              contentFit="contain"
            />
            <Text style={styles.navLabelInactive}>Train</Text>
          </TouchableOpacity>

          {/* Stats Tab */}
          <TouchableOpacity
            style={styles.navItem}
            activeOpacity={0.7}
            onPress={() => {
              playTouchSound();
              triggerHaptic();
              router.push('/(tabs)/log');
            }}
          >
            <Image
              source={ICONS.barChart3}
              style={styles.navIconInactive}
              contentFit="contain"
            />
            <Text style={styles.navLabelInactive}>Stats</Text>
          </TouchableOpacity>

          {/* Profile Tab (Active in Figma #19:613) */}
          <TouchableOpacity
            style={[styles.navItem, styles.navItemActive]}
            activeOpacity={0.7}
            onPress={() => {
              playTouchSound();
              triggerHaptic();
              router.push('/(tabs)/profile');
            }}
          >
            <Image
              source={ICONS.userRound}
              style={styles.navIconActive}
              contentFit="contain"
            />
            <Text style={styles.navLabelActive}>Profile</Text>
            <Animated.View style={[styles.navActiveDot, navMarkerAnimStyle]} />
          </TouchableOpacity>
        </View>

        {/* ──────────────── MODAL: TRAINING PREFERENCES ──────────────── */}
        <Modal
          visible={prefModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPrefModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPrefModalVisible(false)}
            />
            <View style={styles.modalBox}>
              <Text style={styles.modalSubtitle}>TRAINING CONFIGURATION</Text>
              <Text style={styles.modalTitle}>Select Training Mode</Text>

              <View style={styles.modalOptionsList}>
                {['Adaptive', 'Hypertrophy Focus', 'Strength & Power', 'Endurance'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.modalOptionButton,
                      trainingPref === opt && styles.modalOptionButtonSelected,
                    ]}
                    onPress={() => handleSelectPref(opt)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        trainingPref === opt && styles.modalOptionTextSelected,
                      ]}
                    >
                      {opt}
                    </Text>
                    {trainingPref === opt && <View style={styles.modalSelectedDot} />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPrefModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ──────────────── MODAL: QUEST REMINDERS ──────────────── */}
        <Modal
          visible={reminderModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setReminderModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setReminderModalVisible(false)}
            />
            <View style={styles.modalBox}>
              <Text style={styles.modalSubtitle}>DAILY PROTOCOL</Text>
              <Text style={styles.modalTitle}>Quest Reminder Time</Text>

              <View style={styles.modalOptionsList}>
                {['06:00', '07:00', '08:00', '09:00', '18:00', '20:00'].map((time) => (
                  <TouchableOpacity
                    key={time}
                    style={[
                      styles.modalOptionButton,
                      questReminderTime === time && styles.modalOptionButtonSelected,
                    ]}
                    onPress={() => handleSelectReminder(time)}
                  >
                    <Text
                      style={[
                        styles.modalOptionText,
                        questReminderTime === time && styles.modalOptionTextSelected,
                      ]}
                    >
                      {time} {parseInt(time.split(':')[0], 10) < 12 ? 'AM' : 'PM'}
                    </Text>
                    {questReminderTime === time && <View style={styles.modalSelectedDot} />}
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setReminderModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ──────────────── MODAL: PRIVACY & APPS ──────────────── */}
        <Modal
          visible={privacyModalVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setPrivacyModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setPrivacyModalVisible(false)}
            />
            <View style={styles.modalBox}>
              <Text style={styles.modalSubtitle}>SECURITY & PROTOCOLS</Text>
              <Text style={styles.modalTitle}>Privacy & Connected Apps</Text>

              <View style={styles.privacyDetailsCard}>
                <View style={styles.privacyRow}>
                  <Text style={styles.privacyLabel}>Account Type</Text>
                  <Text style={styles.privacyValue}>
                    {user ? 'Cloud Hunter ID' : 'Guest Local SQLite'}
                  </Text>
                </View>
                <View style={styles.privacyRow}>
                  <Text style={styles.privacyLabel}>Cloud Sync Service</Text>
                  <Text style={styles.privacyValue}>
                    {isFirebaseConfigured() ? 'Firebase Cloud' : 'Local SQLite Database'}
                  </Text>
                </View>
                <View style={styles.privacyRow}>
                  <Text style={styles.privacyLabel}>Data Protection</Text>
                  <Text style={[styles.privacyValue, { color: '#3BE7A1' }]}>
                    End-to-End Encrypted
                  </Text>
                </View>
                <View style={styles.privacyRow}>
                  <Text style={styles.privacyLabel}>Health Sensors</Text>
                  <Text style={styles.privacyValue}>Accelerometer & Pedometer Active</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setPrivacyModalVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ──────────────── MODAL: SYNC NOTICE ──────────────── */}
        <Modal
          visible={syncNoticeVisible}
          animationType="fade"
          transparent
          onRequestClose={() => setSyncNoticeVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={() => setSyncNoticeVisible(false)}
            />
            <View style={styles.modalBox}>
              <Text style={styles.modalSubtitle}>SYSTEM NOTIFICATION</Text>
              <Text style={styles.modalTitle}>Data Synchronized</Text>
              <Text style={styles.syncNoticeDescription}>
                All local Hunter statistics, workout logs, and quest milestones have been verified
                and synchronized with the Solo Leveling System.
              </Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setSyncNoticeVisible(false)}
              >
                <Text style={styles.modalCloseBtnText}>Acknowledge</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050611',
  },
  rootContainer: {
    flex: 1,
    backgroundColor: '#080A16',
    alignSelf: 'center',
    width: '100%',
  },
  responsiveFrame: {
    maxWidth: 430,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#2A3154',
  },

  /* SOLO App Header (Figma #33:32) */
  appHeader: {
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(14, 17, 34, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(42, 49, 84, 0.5)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 24,
  },
  brandIconBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#00D1FF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  brandIconImage: {
    width: 22,
    height: 22,
  },
  brandTitleText: {
    fontFamily: Fonts.display,
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.6,
    color: '#F5FAFF',
  },

  /* Scroll Content */
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
    gap: 10,
  },

  /* Page Header (Figma #19:509) */
  pageHeader: {
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 19,
    height: 19,
    tintColor: '#20C8FF',
  },
  headingGroup: {
    flex: 1,
    gap: 2,
    justifyContent: 'center',
  },
  headingSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
    color: '#20C8FF',
    textTransform: 'uppercase',
  },
  headingTitle: {
    fontFamily: Fonts.display,
    fontWeight: '800',
    fontSize: 26,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Player Context Card (Figma #19:515) */
  playerContextCard: {
    position: 'relative',
    height: 62,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#5669B6',
    borderRadius: 12,
    boxShadow: '0px 0px 18px 1px rgba(108, 92, 255, 0.40)',
    elevation: 8,
    shadowColor: '#6C5CFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    overflow: 'hidden',
  },
  energyRail: {
    position: 'absolute',
    left: 0,
    top: 8,
    width: 2,
    height: 46,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.80)',
    borderRadius: 1,
  },
  levelMarkerBox: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(108, 92, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#6C5CFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelMarkerPrefix: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 7,
    color: '#B7A8FF',
  },
  levelMarkerNumber: {
    fontFamily: Fonts.display,
    fontWeight: '900',
    fontSize: 16,
    color: '#F5F7FF',
    lineHeight: 18,
  },
  playerDetailsGroup: {
    flex: 1,
    gap: 3,
  },
  playerNameText: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 14,
    color: '#F5F7FF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  playerRankText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#B7A8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  syncStatusGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  syncStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3BE7A1',
    boxShadow: '0px 0px 6px 1px rgba(59, 231, 161, 0.8)',
    elevation: 3,
  },
  syncStatusText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#3BE7A1',
    letterSpacing: 0.4,
  },

  /* Section Styling */
  sectionWrapper: {
    gap: 6,
  },
  sectionHeaderTitle: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#20C8FF',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingLeft: 2,
  },
  settingsCard: {
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  /* Setting Rows */
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingRowWithPadding: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  volumeControlContainer: {
    paddingVertical: 8,
    gap: 8,
  },
  volumeIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(32, 200, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconBoxNavy: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#191D35',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconBoxRed: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 98, 125, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 98, 125, 0.24)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingIconCyan: {
    width: 16,
    height: 16,
    tintColor: '#20C8FF',
  },
  settingIconMuted: {
    width: 15,
    height: 15,
    tintColor: '#9CE9FF',
  },
  settingIconRed: {
    width: 15,
    height: 15,
    tintColor: '#FF627D',
  },
  settingCopyGroup: {
    flex: 1,
    gap: 2,
  },
  settingTitleText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 12,
    color: '#F5F7FF',
  },
  settingTitleTextRed: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 12,
    color: '#FF627D',
  },
  settingSubtitleText: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 9,
    color: '#697292',
  },
  settingValueText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 11,
    color: '#697292',
    marginRight: 2,
  },
  volumePercentText: {
    fontFamily: Fonts.display,
    fontWeight: '800',
    fontSize: 11,
    color: '#20C8FF',
  },
  chevronIcon: {
    width: 15,
    height: 15,
    tintColor: '#697292',
  },
  chevronIconRed: {
    width: 15,
    height: 15,
    tintColor: '#FF627D',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A3154',
  },

  /* Volume Interactive Slider (Figma #19:536) */
  sliderInteractiveArea: {
    height: 24,
    justifyContent: 'center',
  },
  sliderTrackBackground: {
    height: 6,
    borderRadius: 999,
    backgroundColor: '#191D35',
    position: 'relative',
    justifyContent: 'center',
  },
  sliderTrackActive: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#20C8FF',
    borderRadius: 999,
  },
  sliderThumb: {
    position: 'absolute',
    top: -4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F5F7FF',
    borderWidth: 1,
    borderColor: '#20C8FF',
    boxShadow: '0px 0px 12px 1px rgba(32, 200, 255, 0.5)',
    elevation: 4,
    shadowColor: '#20C8FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },

  /* Custom Switch (Figma #19:547) */
  switchContainer: {
    width: 38,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: 'center',
    padding: 2,
  },
  switchContainerActive: {
    backgroundColor: '#00D1FF',
    borderColor: '#00D1FF',
  },
  switchContainerInactive: {
    backgroundColor: '#191D35',
    borderColor: '#2A3154',
  },
  switchThumb: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  switchThumbActive: {
    backgroundColor: '#FFFFFF',
    boxShadow: '0px 0px 8px 1px rgba(0, 209, 255, 0.6)',
    elevation: 3,
  },
  switchThumbInactive: {
    backgroundColor: '#697292',
  },

  /* Footer Note (Figma #19:599) */
  footerSecurityText: {
    fontFamily: Fonts.sans,
    fontWeight: '400',
    fontSize: 9,
    color: '#697292',
    textAlign: 'center',
    marginTop: 6,
    letterSpacing: 0.5,
  },

  /* Bottom Navigation (Figma #19:600) */
  bottomNavContainer: {
    height: 72,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    backgroundColor: 'rgba(9, 11, 24, 0.95)',
    borderTopWidth: 1,
    borderTopColor: '#2A3154',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    width: 62,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    borderRadius: 12,
  },
  navItemActive: {
    backgroundColor: '#16192E',
  },
  navIconInactive: {
    width: 18,
    height: 18,
    tintColor: '#697292',
  },
  navIconActive: {
    width: 18,
    height: 18,
    tintColor: '#20C8FF',
  },
  navLabelInactive: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 9,
    color: '#697292',
  },
  navLabelActive: {
    fontFamily: Fonts.sans,
    fontWeight: '800',
    fontSize: 9,
    color: '#F5F7FF',
  },
  navActiveDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 8px 1px rgba(32, 200, 255, 0.8)',
    elevation: 3,
  },

  /* Modals */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalBox: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#0E1122',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 16,
    padding: 20,
    gap: 12,
    boxShadow: '0px 0px 24px 2px rgba(32, 200, 255, 0.2)',
  },
  modalSubtitle: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 9,
    color: '#20C8FF',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  modalTitle: {
    fontFamily: Fonts.display,
    fontWeight: '800',
    fontSize: 18,
    color: '#F5F7FF',
  },
  modalOptionsList: {
    gap: 8,
    marginTop: 4,
  },
  modalOptionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
  },
  modalOptionButtonSelected: {
    borderColor: '#20C8FF',
    backgroundColor: 'rgba(32, 200, 255, 0.08)',
  },
  modalOptionText: {
    fontFamily: Fonts.sans,
    fontWeight: '600',
    fontSize: 13,
    color: '#A8B0CE',
  },
  modalOptionTextSelected: {
    color: '#20C8FF',
    fontWeight: '800',
  },
  modalSelectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#20C8FF',
    boxShadow: '0px 0px 6px 1px #20C8FF',
  },
  modalCloseBtn: {
    marginTop: 8,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#191D35',
    alignItems: 'center',
  },
  modalCloseBtnText: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 12,
    color: '#F5F7FF',
  },
  privacyDetailsCard: {
    backgroundColor: '#14182D',
    borderWidth: 1,
    borderColor: '#2A3154',
    borderRadius: 10,
    padding: 12,
    gap: 8,
  },
  privacyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: '#697292',
  },
  privacyValue: {
    fontFamily: Fonts.sans,
    fontWeight: '700',
    fontSize: 11,
    color: '#F5F7FF',
  },
  syncNoticeDescription: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: '#A8B0CE',
    lineHeight: 18,
  },
});
