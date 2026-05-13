import { create } from 'zustand';

import { secureGet, secureSet } from '@/services/secure/storage';

const KEYS = {
  hapticsEnabled: 'ektahr.settings.haptics',
  soundEnabled: 'ektahr.settings.sound',
  matchThreshold: 'ektahr.settings.matchThreshold',
  cameraFps: 'ektahr.settings.cameraFps',
} as const;

type SettingsState = {
  hydrated: boolean;
  hapticsEnabled: boolean;
  soundEnabled: boolean;
  matchThreshold: number;
  cameraFps: 'low' | 'medium' | 'high';

  hydrate: () => Promise<void>;
  setHaptics: (v: boolean) => Promise<void>;
  setSound: (v: boolean) => Promise<void>;
  setMatchThreshold: (v: number) => Promise<void>;
  setCameraFps: (v: 'low' | 'medium' | 'high') => Promise<void>;
};

export const useSettingsStore = create<SettingsState>((set) => ({
  hydrated: false,
  hapticsEnabled: true,
  soundEnabled: true,
  matchThreshold: 0.55,
  cameraFps: 'medium',

  hydrate: async () => {
    const [h, s, t, f] = await Promise.all([
      secureGet(KEYS.hapticsEnabled),
      secureGet(KEYS.soundEnabled),
      secureGet(KEYS.matchThreshold),
      secureGet(KEYS.cameraFps),
    ]);
    set({
      hydrated: true,
      hapticsEnabled: h !== 'false',
      soundEnabled: s !== 'false',
      matchThreshold: t ? Number(t) : 0.55,
      cameraFps: (f as 'low' | 'medium' | 'high') ?? 'medium',
    });
  },

  setHaptics: async (v) => {
    await secureSet(KEYS.hapticsEnabled, String(v));
    set({ hapticsEnabled: v });
  },
  setSound: async (v) => {
    await secureSet(KEYS.soundEnabled, String(v));
    set({ soundEnabled: v });
  },
  setMatchThreshold: async (v) => {
    await secureSet(KEYS.matchThreshold, String(v));
    set({ matchThreshold: v });
  },
  setCameraFps: async (v) => {
    await secureSet(KEYS.cameraFps, v);
    set({ cameraFps: v });
  },
}));
