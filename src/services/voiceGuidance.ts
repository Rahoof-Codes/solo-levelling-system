// ============================================================
// Voice Guidance Service — Solo Leveling System Audio Coach
// Supports both Native (expo-speech) and Web (SpeechSynthesis)
// ============================================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

export const VOICE_GUIDANCE_KEY = '@solo_system_voice_guidance_enabled';

let isEnabledCache: boolean | null = null;

/**
 * Check whether voice guidance is currently enabled
 */
export async function getVoiceGuidanceEnabled(): Promise<boolean> {
  if (isEnabledCache !== null) {
    return isEnabledCache;
  }
  try {
    const val = await AsyncStorage.getItem(VOICE_GUIDANCE_KEY);
    // Default to true if not set
    const enabled = val === null ? true : val === 'true';
    isEnabledCache = enabled;
    return enabled;
  } catch {
    return true;
  }
}

/**
 * Persist voice guidance enabled state
 */
export async function setVoiceGuidanceEnabled(enabled: boolean): Promise<void> {
  isEnabledCache = enabled;
  try {
    await AsyncStorage.setItem(VOICE_GUIDANCE_KEY, String(enabled));
  } catch (err) {
    console.warn('[VoiceGuidance] Failed to persist preference:', err);
  }
}

/**
 * Stop any current speech playback
 */
export function stopVoiceGuidance(): void {
  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
  } catch {}
}

/**
 * Speak a voice prompt if voice guidance is enabled
 */
export async function speakVoiceGuidance(
  text: string,
  options?: {
    pitch?: number;
    rate?: number;
    force?: boolean;
  }
): Promise<void> {
  const enabled = options?.force ? true : await getVoiceGuidanceEnabled();
  if (!enabled) return;

  const pitch = options?.pitch ?? 0.95; // Slightly deeper, authoritative system tone
  const rate = options?.rate ?? 1.05;   // Crisp cadence

  try {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = pitch;
      utterance.rate = rate;
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    } else {
      Speech.stop();
      Speech.speak(text, {
        pitch,
        rate,
        language: 'en-US',
      });
    }
  } catch (err) {
    console.warn('[VoiceGuidance] Speech error:', err);
  }
}
