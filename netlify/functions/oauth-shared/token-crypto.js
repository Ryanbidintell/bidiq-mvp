// netlify/functions/oauth-shared/token-crypto.js
// AES-256-GCM encryption for OAuth refresh tokens at rest.
//
// Per BidIntell_FollowUp_Automation_Build_Spec_v1.md §5, §12:
//   - Never log tokens
//   - Never include them in error messages
//   - Encrypt at rest using a single key from Netlify env (TOKEN_ENCRYPTION_KEY)
//
// Key format: 64-character hex string (32 bytes / 256 bits)
// Generate one with:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
//
// Stored format: iv(hex):tag(hex):ciphertext(hex)
//   - iv  = 12 random bytes (96 bits, GCM recommended)
//   - tag = 16-byte auth tag emitted by GCM
//   - ciphertext = whatever length the plaintext was

const crypto = require('crypto');

const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

function getKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('TOKEN_ENCRYPTION_KEY env var is not set');
  }
  if (hex.length !== KEY_BYTES * 2) {
    throw new Error(`TOKEN_ENCRYPTION_KEY must be ${KEY_BYTES * 2} hex characters (was ${hex.length})`);
  }
  return Buffer.from(hex, 'hex');
}

function encryptToken(plaintext) {
  if (plaintext == null || plaintext === '') {
    return null;
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`;
}

function decryptToken(payload) {
  if (!payload) return null;
  const parts = String(payload).split(':');
  if (parts.length !== 3) {
    throw new Error('Encrypted token is malformed');
  }
  const [ivHex, tagHex, ctHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const ct = Buffer.from(ctHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
  return dec.toString('utf8');
}

// Self-test (helpful for sanity-checking env config without exposing tokens).
// Returns true if encrypt/decrypt round-trips a non-sensitive sentinel value.
function selfTest() {
  try {
    const sentinel = 'bidintell-crypto-selftest-' + Date.now();
    const encrypted = encryptToken(sentinel);
    const decrypted = decryptToken(encrypted);
    return decrypted === sentinel;
  } catch (err) {
    console.error('token-crypto selfTest failed:', err.message);
    return false;
  }
}

module.exports = {
  encryptToken,
  decryptToken,
  selfTest,
};
