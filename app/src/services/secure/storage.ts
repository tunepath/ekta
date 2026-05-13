import * as SecureStore from 'expo-secure-store';

/**
 * Typed wrapper around expo-secure-store.
 * Keys follow the convention "ektahr.<domain>.<field>" — admin-scoped keys
 * append ".<email-hash>".
 */

export const SecureKeys = {
  AdminToken: 'ektahr.session.token',
  AdminRefreshToken: 'ektahr.session.refresh_token',
  AdminEmail: 'ektahr.session.email',
  AdminProfile: 'ektahr.session.profile',
  KioskOffice: 'ektahr.kiosk.office',
  KioskDeviceId: 'ektahr.kiosk.device_id',
  /** Per-admin PIN hash, keyed dynamically. */
  pinHash: (emailHash: string) => `ektahr.admin.pin_hash.${emailHash}`,
  pinSalt: (emailHash: string) => `ektahr.admin.pin_salt.${emailHash}`,
} as const;

export async function secureGet(key: string): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

export async function secureSet(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

export async function secureDelete(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // best effort
  }
}

export async function secureGetJson<T>(key: string): Promise<T | null> {
  const raw = await secureGet(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function secureSetJson<T>(key: string, value: T): Promise<void> {
  await secureSet(key, JSON.stringify(value));
}
