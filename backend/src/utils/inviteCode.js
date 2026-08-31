import crypto from 'crypto';

export function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

const INVITE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Globally unique 8-character partner invitation codes (e.g. 7P4K8XQ2).
 */
export function generateWeddingInviteCode() {
  const bytes = crypto.randomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i += 1) {
    code += INVITE_ALPHABET[bytes[i] % INVITE_ALPHABET.length];
  }
  return code;
}

export function normalizeInviteCode(value) {
  return String(value || '').trim().toUpperCase().replace(/\s+/g, '');
}
