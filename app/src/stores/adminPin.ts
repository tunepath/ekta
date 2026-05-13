import { create } from 'zustand';

import { SecureKeys, secureDelete, secureGet, secureSet } from '@/services/secure/storage';
import { emailHash, generateSalt, hashPin } from '@/services/secure/hash';

const ATTEMPT_LIMIT = 5;
const COOLDOWN_MS = 60_000;

type PinState = {
  hydrated: boolean;
  failedAttempts: number;
  cooldownUntil: number | null;

  hydrate: () => Promise<void>;
  hasPin: (email: string) => Promise<boolean>;
  setPin: (email: string, pin: string) => Promise<void>;
  verifyPin: (email: string, pin: string) => Promise<{ ok: true } | { ok: false; reason: 'cooldown' | 'invalid'; cooldownMs?: number }>;
  resetAttempts: () => void;
  clearPin: (email: string) => Promise<void>;
};

async function getStored(email: string): Promise<{ hash: string; salt: string } | null> {
  const h = await emailHash(email);
  const [storedHash, storedSalt] = await Promise.all([
    secureGet(SecureKeys.pinHash(h)),
    secureGet(SecureKeys.pinSalt(h)),
  ]);
  if (!storedHash || !storedSalt) return null;
  return { hash: storedHash, salt: storedSalt };
}

export const useAdminPinStore = create<PinState>((set, get) => ({
  hydrated: false,
  failedAttempts: 0,
  cooldownUntil: null,

  hydrate: async () => {
    set({ hydrated: true });
  },

  hasPin: async (email) => {
    const stored = await getStored(email);
    return stored !== null;
  },

  setPin: async (email, pin) => {
    const h = await emailHash(email);
    const salt = generateSalt();
    const hash = await hashPin(pin, salt);
    await Promise.all([
      secureSet(SecureKeys.pinHash(h), hash),
      secureSet(SecureKeys.pinSalt(h), salt),
    ]);
    set({ failedAttempts: 0, cooldownUntil: null });
  },

  verifyPin: async (email, pin) => {
    const now = Date.now();
    const { cooldownUntil, failedAttempts } = get();
    if (cooldownUntil && cooldownUntil > now) {
      return { ok: false, reason: 'cooldown', cooldownMs: cooldownUntil - now };
    }
    const stored = await getStored(email);
    if (!stored) return { ok: false, reason: 'invalid' };

    const candidate = await hashPin(pin, stored.salt);
    if (candidate === stored.hash) {
      set({ failedAttempts: 0, cooldownUntil: null });
      return { ok: true };
    }

    const nextAttempts = failedAttempts + 1;
    if (nextAttempts >= ATTEMPT_LIMIT) {
      set({ failedAttempts: 0, cooldownUntil: now + COOLDOWN_MS });
      return { ok: false, reason: 'cooldown', cooldownMs: COOLDOWN_MS };
    }
    set({ failedAttempts: nextAttempts });
    return { ok: false, reason: 'invalid' };
  },

  resetAttempts: () => set({ failedAttempts: 0, cooldownUntil: null }),

  clearPin: async (email) => {
    const h = await emailHash(email);
    await Promise.all([
      secureDelete(SecureKeys.pinHash(h)),
      secureDelete(SecureKeys.pinSalt(h)),
    ]);
    set({ failedAttempts: 0, cooldownUntil: null });
  },
}));
