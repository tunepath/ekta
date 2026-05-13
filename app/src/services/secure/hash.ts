import * as Crypto from 'expo-crypto';

/**
 * PIN hashing helpers. We use PBKDF2-style derivation by repeated SHA-256
 * (Argon2 is not available cross-platform without native modules).
 *
 * For a 6-digit PIN with a per-admin random salt, 100k iterations of SHA-256
 * is sufficient to make brute-force on a stolen device painful.
 */

const ITERATIONS = 100_000;

export function generateSalt(): string {
  const bytes = Crypto.getRandomBytes(16);
  return Buffer.from(bytes).toString('hex');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  let current = `${salt}|${pin}`;
  for (let i = 0; i < ITERATIONS; i++) {
    current = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      current
    );
  }
  return current;
}

export async function emailHash(email: string): Promise<string> {
  const normalised = email.trim().toLowerCase();
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    normalised
  );
}
