import { create } from 'zustand';

import { SecureKeys, secureDelete, secureGet, secureSet } from '@/services/secure/storage';

export type AdminProfile = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type SessionState = {
  hydrated: boolean;
  token: string | null;
  refreshToken: string | null;
  admin: AdminProfile | null;

  /** Loads any persisted session from secure-store on app launch. */
  hydrate: () => Promise<void>;

  /** Sets a fresh session after a successful login. */
  setSession: (token: string, refreshToken: string, admin: AdminProfile) => Promise<void>;

  /** Replaces the access + refresh tokens (used by auth interceptor). */
  setTokens: (token: string, refreshToken: string) => Promise<void>;

  /** Wipes the session token only — keeps PIN + kiosk identity (per A8). */
  clearSession: () => Promise<void>;
};

export const useSessionStore = create<SessionState>((set, get) => ({
  hydrated: false,
  token: null,
  refreshToken: null,
  admin: null,

  hydrate: async () => {
    const [token, refreshToken, profileRaw] = await Promise.all([
      secureGet(SecureKeys.AdminToken),
      secureGet(SecureKeys.AdminRefreshToken),
      secureGet(SecureKeys.AdminProfile),
    ]);
    let admin: AdminProfile | null = null;
    if (profileRaw) {
      try {
        admin = JSON.parse(profileRaw);
      } catch {
        admin = null;
      }
    }
    set({ hydrated: true, token, refreshToken, admin });
  },

  setSession: async (token, refreshToken, admin) => {
    await Promise.all([
      secureSet(SecureKeys.AdminToken, token),
      secureSet(SecureKeys.AdminRefreshToken, refreshToken),
      secureSet(SecureKeys.AdminProfile, JSON.stringify(admin)),
      secureSet(SecureKeys.AdminEmail, admin.email),
    ]);
    set({ token, refreshToken, admin });
  },

  setTokens: async (token, refreshToken) => {
    await Promise.all([
      secureSet(SecureKeys.AdminToken, token),
      secureSet(SecureKeys.AdminRefreshToken, refreshToken),
    ]);
    set({ token, refreshToken });
  },

  clearSession: async () => {
    await Promise.all([
      secureDelete(SecureKeys.AdminToken),
      secureDelete(SecureKeys.AdminRefreshToken),
      secureDelete(SecureKeys.AdminProfile),
    ]);
    // NOTE: AdminEmail is retained for "remember last email" on login screen.
    // Per-admin PIN, kiosk identity, settings are NOT cleared on logout.
    set({ token: null, refreshToken: null, admin: null });
  },
}));
