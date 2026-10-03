// ============================================================
// Solo Leveling System Audio Constants & Asset References
// ============================================================

export const AUDIO_ASSETS = {
  BGM: require('@/components/music/BGM.mp3'),
  CLAIM: require('@/components/music/arise.mp3'),
  ARISE: require('@/components/music/arise.mp3'),
  ANIMATION: require('@/components/music/Animation.mp3'),
  TOUCH: require('@/components/music/touch.mp3'),
} as const;

export const AUDIO_STORAGE_KEY = '@solo_system_audio_settings_v2';

export interface AudioSettings {
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  bgmVolume: number; // 0.0 to 1.0
  sfxVolume: number; // 0.0 to 1.0
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  bgmEnabled: true,
  sfxEnabled: true,
  bgmVolume: 0.35,
  sfxVolume: 0.85,
};
