// ============================================================
// Audio Context — Global BGM & Sound Effects Management
// Powered by expo-audio (Expo SDK 57)
// ============================================================
/* eslint-disable react-hooks/immutability */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio';
import {
  AUDIO_ASSETS,
  AUDIO_STORAGE_KEY,
  DEFAULT_AUDIO_SETTINGS,
  type AudioSettings,
} from '@/constants/audio';

interface AudioContextType {
  /** Whether BGM is enabled in settings */
  bgmEnabled: boolean;
  /** Whether SFX is enabled in settings */
  sfxEnabled: boolean;
  /** Current BGM volume (0.0 to 1.0) */
  bgmVolume: number;
  /** Current SFX volume (0.0 to 1.0) */
  sfxVolume: number;
  /** Whether the BGM track is actively playing */
  isBgmPlaying: boolean;
  /** Toggle BGM on / off */
  toggleBGM: () => void;
  /** Set BGM enabled state */
  setBGMEnabled: (enabled: boolean) => void;
  /** Set SFX enabled state */
  setSFXEnabled: (enabled: boolean) => void;
  /** Adjust BGM volume */
  setBGMVolume: (volume: number) => void;
  /** Adjust SFX volume */
  setSFXVolume: (volume: number) => void;
  /** Whether the opening animation is active (suppresses main BGM) */
  isOpeningAnimationActive: boolean;
  /** Set opening animation active state */
  setOpeningAnimationActive: (active: boolean) => void;
  /** Play the arise sound effect */
  playAriseSound: () => void;
  /** Play the reward claiming sound effect */
  playClaimSound: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpeningAnimationActive, setIsOpeningAnimationActive] = useState(true);

  // Expo-audio player instances
  const bgmPlayer = useAudioPlayer(AUDIO_ASSETS.BGM, {
    updateInterval: 1000,
  });
  const claimPlayer = useAudioPlayer(AUDIO_ASSETS.CLAIM, {
    updateInterval: 500,
  });

  const bgmStatus = useAudioPlayerStatus(bgmPlayer);

  // Keep ref to latest settings for event handlers
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // 1. Initialize audio mode & load saved settings from AsyncStorage
  useEffect(() => {
    let mounted = true;

    async function initAudio() {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'mixWithOthers',
          shouldPlayInBackground: false,
        });
      } catch (err) {
        console.warn('[AudioContext] setAudioModeAsync warning:', err);
      }

      try {
        const stored = await AsyncStorage.getItem(AUDIO_STORAGE_KEY);
        if (stored && mounted) {
          const parsed: Partial<AudioSettings> = JSON.parse(stored);
          setSettings({
            bgmEnabled: parsed.bgmEnabled ?? DEFAULT_AUDIO_SETTINGS.bgmEnabled,
            sfxEnabled: parsed.sfxEnabled ?? DEFAULT_AUDIO_SETTINGS.sfxEnabled,
            bgmVolume: parsed.bgmVolume ?? DEFAULT_AUDIO_SETTINGS.bgmVolume,
            sfxVolume: parsed.sfxVolume ?? DEFAULT_AUDIO_SETTINGS.sfxVolume,
          });
        }
      } catch (err) {
        console.warn('[AudioContext] Failed to load saved audio settings:', err);
      } finally {
        if (mounted) setIsLoaded(true);
      }
    }

    initAudio();

    return () => {
      mounted = false;
    };
  }, []);

  // 2. Persist settings when changed
  useEffect(() => {
    if (!isLoaded) return;
    AsyncStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings)).catch((err) =>
      console.warn('[AudioContext] Failed to persist audio settings:', err)
    );
  }, [settings, isLoaded]);

  // 3. Configure BGM Player loop and volume
  useEffect(() => {
    try {
      bgmPlayer.loop = true;
      bgmPlayer.volume = settings.bgmVolume;
    } catch {}
  }, [bgmPlayer, settings.bgmVolume]);

  // 4. Configure Claim Sound Player loop and volume
  useEffect(() => {
    try {
      claimPlayer.loop = false;
      claimPlayer.volume = settings.sfxVolume;
    } catch {}
  }, [claimPlayer, settings.sfxVolume]);

  // 5. Handle BGM playback based on bgmEnabled & opening animation state
  useEffect(() => {
    if (!isLoaded) return;

    if (settings.bgmEnabled && !isOpeningAnimationActive) {
      try {
        bgmPlayer.loop = true;
        bgmPlayer.volume = settings.bgmVolume;
        bgmPlayer.play();
      } catch (err) {
        // Autoplay may be blocked on web until user interaction
        console.log('[AudioContext] BGM play deferred (waiting for interaction):', err);
      }
    } else {
      try {
        bgmPlayer.pause();
      } catch {}
    }
  }, [settings.bgmEnabled, settings.bgmVolume, isLoaded, bgmPlayer, isOpeningAnimationActive]);

  // 6. Handle web browser autoplay policy (first click/touch triggers playback if enabled)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const startAudioOnInteraction = () => {
      if (settingsRef.current.bgmEnabled && !bgmPlayer.playing) {
        try {
          bgmPlayer.loop = true;
          bgmPlayer.volume = settingsRef.current.bgmVolume;
          bgmPlayer.play();
        } catch {}
      }
    };

    window.addEventListener('click', startAudioOnInteraction, { once: true });
    window.addEventListener('touchstart', startAudioOnInteraction, { once: true });
    window.addEventListener('keydown', startAudioOnInteraction, { once: true });

    return () => {
      window.removeEventListener('click', startAudioOnInteraction);
      window.removeEventListener('touchstart', startAudioOnInteraction);
      window.removeEventListener('keydown', startAudioOnInteraction);
    };
  }, [bgmPlayer]);

  // 7. Toggle BGM
  const toggleBGM = useCallback(() => {
    setSettings((prev) => {
      const next = !prev.bgmEnabled;
      if (!next) {
        try {
          bgmPlayer.pause();
        } catch {}
      } else {
        try {
          bgmPlayer.loop = true;
          bgmPlayer.volume = prev.bgmVolume;
          bgmPlayer.play();
        } catch {}
      }
      return { ...prev, bgmEnabled: next };
    });
  }, [bgmPlayer]);

  const setBGMEnabled = useCallback(
    (enabled: boolean) => {
      setSettings((prev) => {
        if (prev.bgmEnabled === enabled) return prev;
        if (!enabled) {
          try {
            bgmPlayer.pause();
          } catch {}
        } else {
          try {
            bgmPlayer.loop = true;
            bgmPlayer.volume = prev.bgmVolume;
            bgmPlayer.play();
          } catch {}
        }
        return { ...prev, bgmEnabled: enabled };
      });
    },
    [bgmPlayer]
  );

  const setSFXEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({ ...prev, sfxEnabled: enabled }));
  }, []);

  const setBGMVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      try {
        bgmPlayer.volume = clamped;
      } catch {}
      setSettings((prev) => ({ ...prev, bgmVolume: clamped }));
    },
    [bgmPlayer]
  );

  const setSFXVolume = useCallback(
    (volume: number) => {
      const clamped = Math.max(0, Math.min(1, volume));
      try {
        claimPlayer.volume = clamped;
      } catch {}
      setSettings((prev) => ({ ...prev, sfxVolume: clamped }));
    },
    [claimPlayer]
  );

  // 8. Play claim sound effect
  const playClaimSound = useCallback(() => {
    if (!settingsRef.current.sfxEnabled) return;

    try {
      claimPlayer.volume = settingsRef.current.sfxVolume;
      claimPlayer.seekTo(0);
      claimPlayer.play();
    } catch (err) {
      console.warn('[AudioContext] Could not play claim sound:', err);
    }
  }, [claimPlayer]);

  const value: AudioContextType = {
    bgmEnabled: settings.bgmEnabled,
    sfxEnabled: settings.sfxEnabled,
    bgmVolume: settings.bgmVolume,
    sfxVolume: settings.sfxVolume,
    isBgmPlaying: bgmStatus.playing || false,
    isOpeningAnimationActive,
    setOpeningAnimationActive: setIsOpeningAnimationActive,
    toggleBGM,
    setBGMEnabled,
    setSFXEnabled,
    setBGMVolume,
    setSFXVolume,
    playClaimSound,
    playAriseSound: playClaimSound,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudio(): AudioContextType {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}
