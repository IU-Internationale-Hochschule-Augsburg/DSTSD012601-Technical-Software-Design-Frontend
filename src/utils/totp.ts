import * as Crypto from 'expo-crypto';

/**
 * TOTP (RFC 6238) – kompatibel mit Google Authenticator.
 *
 * HMAC-SHA1 wird aus `expo-crypto`s SHA-1-Digest aufgebaut
 * (HMAC(K,m) = H((K⊕opad) ‖ H((K⊕ipad) ‖ m))), damit keine native
 * Krypto-Abhängigkeit nötig ist und der Code auf Web + nativ läuft.
 */

const PERIOD_SECONDS = 30;
const DIGITS = 6;
const BLOCK_SIZE = 64; // SHA-1 Blockgröße
const B32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

// ─── Base32 (RFC 4648) ────────────────────────────────────────────────────────

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

function base32Decode(input: string): Uint8Array {
  const clean = input.toUpperCase().replace(/=+$/, '').replace(/\s/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const c of clean) {
    const idx = B32_ALPHABET.indexOf(c);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(out);
}

// ─── HMAC-SHA1 ──────────────────────────────────────────────────────────────

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a);
  out.set(b, a.length);
  return out;
}

async function sha1(bytes: Uint8Array): Promise<Uint8Array> {
  // Cast: expo-crypto erwartet BufferSource; Uint8Array<ArrayBufferLike> ist
  // zur Laufzeit kompatibel, TS 5.9 unterscheidet die Buffer-Typen aber strikt.
  const buf = await Crypto.digest(
    Crypto.CryptoDigestAlgorithm.SHA1,
    bytes as unknown as BufferSource
  );
  return new Uint8Array(buf);
}

async function hmacSha1(key: Uint8Array, msg: Uint8Array): Promise<Uint8Array> {
  let k = key;
  if (k.length > BLOCK_SIZE) k = await sha1(k);
  if (k.length < BLOCK_SIZE) {
    const padded = new Uint8Array(BLOCK_SIZE);
    padded.set(k);
    k = padded;
  }

  const ipad = new Uint8Array(BLOCK_SIZE);
  const opad = new Uint8Array(BLOCK_SIZE);
  for (let i = 0; i < BLOCK_SIZE; i++) {
    ipad[i] = k[i] ^ 0x36;
    opad[i] = k[i] ^ 0x5c;
  }

  const inner = await sha1(concat(ipad, msg));
  return sha1(concat(opad, inner));
}

// ─── HOTP / TOTP ──────────────────────────────────────────────────────────────

function counterToBytes(counter: number): Uint8Array {
  const buf = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    buf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }
  return buf;
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const hmac = await hmacSha1(secret, counterToBytes(counter));
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, '0');
}

/** Erzeugt ein neues, zufälliges Base32-Secret (20 Byte → 32 Zeichen). */
export function generateSecret(): string {
  return base32Encode(Crypto.getRandomBytes(20));
}

/**
 * Baut die `otpauth://`-URI für QR-Codes (Google Authenticator etc.).
 */
export function buildOtpAuthUri(secret: string, account: string, issuer = 'AboTracker'): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/**
 * Prüft einen 6-stelligen Code gegen das Secret. `window` erlaubt eine Toleranz
 * von ±n Zeitfenstern (Standard ±1 = ±30 s) gegen Uhr-Drift.
 */
export async function verifyTotp(code: string, secret: string, window = 1): Promise<boolean> {
  const normalized = code.trim();
  if (!/^\d{6}$/.test(normalized)) return false;

  const secretBytes = base32Decode(secret);
  if (secretBytes.length === 0) return false;

  const counter = Math.floor(Date.now() / 1000 / PERIOD_SECONDS);
  for (let w = -window; w <= window; w++) {
    if ((await hotp(secretBytes, counter + w)) === normalized) return true;
  }
  return false;
}
