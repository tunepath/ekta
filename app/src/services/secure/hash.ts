import * as Crypto from 'expo-crypto';

const ITERATIONS = 2_000;

function bytesToHex(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, '0');
  return out;
}

export function generateSalt(): string {
  return bytesToHex(Crypto.getRandomBytes(16));
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
