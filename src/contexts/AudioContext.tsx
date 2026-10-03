// ============================================================
// Audio Context — Global BGM & Sound Effects Management
// Powered by expo-audio (Expo SDK 57)
// ============================================================

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

// Safe HTMLMediaElement.play wrapper on Web to prevent unhandled NotAllowedError rejections
if (
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  typeof window.HTMLMediaElement !== 'undefined'
) {
  const originalPlay = window.HTMLMediaElement.prototype.play;
  if (originalPlay && !(originalPlay as any).__isSafePlayPatched) {
    window.HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      const result = originalPlay.call(this);
      if (result && typeof (result as any).catch === 'function') {
        return (result as any).catch((err: any) => {
          if (
            err?.name === 'NotAllowedError' ||
            err?.message?.includes('interact') ||
            err?.message?.includes('user gesture')
          ) {
            // Autoplay blocked by browser policy — gracefully ignored; audio will start on user interaction
            return;
          }
          return Promise.reject(err);
        });
      }
      return result;
    };
    (window.HTMLMediaElement.prototype.play as any).__isSafePlayPatched = true;
  }

  // Also suppress unhandledrejection for NotAllowedError on web
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.name === 'NotAllowedError' ||
      event.reason?.message?.includes("user didn't interact") ||
      event.reason?.message?.includes('interact with the document first')
    ) {
      event.preventDefault();
    }
  });
}

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
  /** Whether the user is currently on the dashboard / tabs */
  isDashboardActive: boolean;
  /** Set dashboard active state */
  setDashboardActive: (active: boolean) => void;
  /** Trigger BGM play safely */
  playBGM: () => void;
  /** Trigger BGM pause safely */
  pauseBGM: () => void;
  /** Play the arise sound effect */
  playAriseSound: () => void;
  /** Play the reward claiming sound effect */
  playClaimSound: () => void;
  /** Play the touch / button click sound effect */
  playTouchSound: () => void;
}

const AudioContext = createContext<AudioContextType | null>(null);

export function AudioProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AudioSettings>(DEFAULT_AUDIO_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isOpeningAnimationActive, setIsOpeningAnimationActive] = useState(true);
  const [isDashboardActive, setIsDashboardActive] = useState(false);

  // Expo-audio player instances
  const bgmPlayer = useAudioPlayer(AUDIO_ASSETS.BGM, {
    updateInterval: 1000,
  });
  const claimPlayer = useAudioPlayer(AUDIO_ASSETS.CLAIM, {
    updateInterval: 500,
  });
  const touchPlayer = useAudioPlayer(AUDIO_ASSETS.TOUCH, {
    updateInterval: 500,
  });

  const bgmStatus = useAudioPlayerStatus(bgmPlayer);

  // Keep refs to latest states for event handlers & async operations
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const isOpeningAnimationActiveRef = useRef(isOpeningAnimationActive);
  useEffect(() => {
    isOpeningAnimationActiveRef.current = isOpeningAnimationActive;
  }, [isOpeningAnimationActive]);

  const isDashboardActiveRef = useRef(isDashboardActive);
  useEffect(() => {
    isDashboardActiveRef.current = isDashboardActive;
  }, [isDashboardActive]);

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
      } catch {
        // audio mode warning
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

  // 4. Configure SFX Players loop and volume
  useEffect(() => {
    try {
      claimPlayer.loop = false;
      claimPlayer.volume = settings.sfxVolume;
      touchPlayer.loop = false;
      touchPlayer.volume = settings.sfxVolume;
    } catch {}
  }, [claimPlayer, touchPlayer, settings.sfxVolume]);

  // Safe Play and Pause BGM functions
  const playBGM = useCallback(() => {
    try {
      bgmPlayer.loop = true;
      bgmPlayer.volume = settingsRef.current.bgmVolume;
      const res: any = bgmPlayer.play();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {}
  }, [bgmPlayer]);

  const pauseBGM = useCallback(() => {
    try {
      bgmPlayer.pause();
    } catch {}
  }, [bgmPlayer]);

  // 5. Handle BGM playback:
  // Main BGM starts ONLY when:
  // - bgmEnabled is true
  // - user has arrived at the dashboard (isDashboardActive === true)
  // - opening animation is completed (isOpeningAnimationActive === false)
  useEffect(() => {
    if (!isLoaded) return;

    const shouldPlay =
      settings.bgmEnabled && isDashboardActive && !isOpeningAnimationActive;

    if (shouldPlay) {
      playBGM();
    } else {
      pauseBGM();
    }
  }, [
    settings.bgmEnabled,
    settings.bgmVolume,
    isLoaded,
    isDashboardActive,
    isOpeningAnimationActive,
    playBGM,
    pauseBGM,
  ]);

  // 6. Handle web browser autoplay policy:
  // When user is on dashboard and BGM should play, listen for first user interaction (click, keydown, touch)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const tryUnlockAndPlay = () => {
      if (
        settingsRef.current.bgmEnabled &&
        isDashboardActiveRef.current &&
        !isOpeningAnimationActiveRef.current
      ) {
        playBGM();
      }
    };

    window.addEventListener('click', tryUnlockAndPlay, { passive: true });
    window.addEventListener('pointerdown', tryUnlockAndPlay, { passive: true });
    window.addEventListener('touchstart', tryUnlockAndPlay, { passive: true });
    window.addEventListener('keydown', tryUnlockAndPlay, { passive: true });

    return () => {
      window.removeEventListener('click', tryUnlockAndPlay);
      window.removeEventListener('pointerdown', tryUnlockAndPlay);
      window.removeEventListener('touchstart', tryUnlockAndPlay);
      window.removeEventListener('keydown', tryUnlockAndPlay);
    };
  }, [playBGM]);

  // 7. Toggle BGM
  const toggleBGM = useCallback(() => {
    // If BGM is enabled but paused/blocked by browser autoplay on web, tapping resumes/plays immediately
    if (
      settingsRef.current.bgmEnabled &&
      !bgmPlayer.playing &&
      isDashboardActiveRef.current &&
      !isOpeningAnimationActiveRef.current
    ) {
      playBGM();
      return;
    }

    setSettings((prev) => {
      const next = !prev.bgmEnabled;
      if (!next) {
        pauseBGM();
      } else if (isDashboardActiveRef.current && !isOpeningAnimationActiveRef.current) {
        playBGM();
      }
      return { ...prev, bgmEnabled: next };
    });
  }, [bgmPlayer.playing, playBGM, pauseBGM]);

  const setBGMEnabled = useCallback(
    (enabled: boolean) => {
      setSettings((prev) => {
        if (prev.bgmEnabled === enabled) return prev;
        if (!enabled) {
          pauseBGM();
        } else if (isDashboardActiveRef.current && !isOpeningAnimationActiveRef.current) {
          playBGM();
        }
        return { ...prev, bgmEnabled: enabled };
      });
    },
    [pauseBGM, playBGM]
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
        touchPlayer.volume = clamped;
      } catch {}
      setSettings((prev) => ({ ...prev, sfxVolume: clamped }));
    },
    [claimPlayer, touchPlayer]
  );

  // 8. Play claim sound effect
  const playClaimSound = useCallback(() => {
    if (!settingsRef.current.sfxEnabled) return;

    try {
      claimPlayer.volume = settingsRef.current.sfxVolume;
      claimPlayer.seekTo(0);
      const res: any = claimPlayer.play();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {
      // ignore web autoplay restrictions
    }
  }, [claimPlayer]);

  // 9. Play touch sound effect
  const playTouchSound = useCallback(() => {
    if (!settingsRef.current.sfxEnabled) return;

    try {
      touchPlayer.volume = settingsRef.current.sfxVolume;
      touchPlayer.seekTo(0);
      const res: any = touchPlayer.play();
      if (res && typeof res.catch === 'function') {
        res.catch(() => {});
      }
    } catch {
      // ignore web autoplay restrictions
    }
  }, [touchPlayer]);

  // 10. Global web click sound on interactive elements
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const handleGlobalClick = (event: MouseEvent | TouchEvent) => {
      if (!settingsRef.current.sfxEnabled) return;

      const target = event.target as HTMLElement | null;
      if (!target) return;

      const interactiveEl = target.closest('button, [role="button"], a, input, [tabindex="0"]');
      if (interactiveEl) {
        playTouchSound();
      }
    };

    window.addEventListener('click', handleGlobalClick, { passive: true, capture: true });

    return () => {
      window.removeEventListener('click', handleGlobalClick, { capture: true } as any);
    };
  }, [playTouchSound]);

  const value: AudioContextType = {
    bgmEnabled: settings.bgmEnabled,
    sfxEnabled: settings.sfxEnabled,
    bgmVolume: settings.bgmVolume,
    sfxVolume: settings.sfxVolume,
    isBgmPlaying: bgmStatus.playing || false,
    isOpeningAnimationActive,
    setOpeningAnimationActive: setIsOpeningAnimationActive,
    isDashboardActive,
    setDashboardActive: setIsDashboardActive,
    playBGM,
    pauseBGM,
    toggleBGM,
    setBGMEnabled,
    setSFXEnabled,
    setBGMVolume,
    setSFXVolume,
    playClaimSound,
    playTouchSound,
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

