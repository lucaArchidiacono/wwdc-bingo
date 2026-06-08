import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateRoomCode(len = 6) {
  const bytes = crypto.randomBytes(len);
  let out = '';
  for (let i = 0; i < len; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function normalizeRoomCode(input) {
  return String(input || '').trim().toUpperCase();
}

// Custom (admin-chosen) codes: 4–12 uppercase letters/digits.
const CUSTOM_CODE_RE = /^[A-Z0-9]{4,12}$/;

export function isValidCustomCode(code) {
  return CUSTOM_CODE_RE.test(code);
}
