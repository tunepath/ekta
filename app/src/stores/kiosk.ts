import { create } from 'zustand';
import * as Application from 'expo-application';

import { SecureKeys, secureGet, secureGetJson, secureSet, secureSetJson } from '@/services/secure/storage';

export type KioskOffice = {
  id: string;
  name: string;
  lat: number;
  lng: number;
};

type KioskState = {
  hydrated: boolean;
  deviceId: string | null;
  office: KioskOffice | null;

  hydrate: () => Promise<void>;
  setOffice: (office: KioskOffice) => Promise<void>;
  clearOffice: () => Promise<void>;
};

async function generateDeviceId(): Promise<string> {
  // Deterministic best-effort: prefer the native install id, otherwise a random UUID-ish string.
  try {
    const androidId = Application.getAndroidId?.();
    if (androidId) return `android-${androidId}`;
    const iosId = await Application.getIosIdForVendorAsync?.();
    if (iosId) return `ios-${iosId}`;
  } catch {
    /* fall through */
  }
  return `kiosk-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}

export const useKioskStore = create<KioskState>((set) => ({
  hydrated: false,
  deviceId: null,
  office: null,

  hydrate: async () => {
    let deviceId = await secureGet(SecureKeys.KioskDeviceId);
    if (!deviceId) {
      deviceId = await generateDeviceId();
      await secureSet(SecureKeys.KioskDeviceId, deviceId);
    }
    const office = await secureGetJson<KioskOffice>(SecureKeys.KioskOffice);
    set({ hydrated: true, deviceId, office });
  },

  setOffice: async (office) => {
    await secureSetJson(SecureKeys.KioskOffice, office);
    set({ office });
  },

  clearOffice: async () => {
    await secureSet(SecureKeys.KioskOffice, '');
    set({ office: null });
  },
}));
