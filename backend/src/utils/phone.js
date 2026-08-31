import { isValidPhoneInput } from './validation.js';

export function tryNormalizePhone(value) {
  if (!value || !isValidPhoneInput(value)) return null;

  let digits = String(value).trim().replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) digits = digits.slice(1);

  if (digits.startsWith('252')) {
    if (digits.length < 11 || digits.length > 13) return null;
    return digits;
  }

  if (digits.startsWith('0')) digits = digits.slice(1);

  if (/^[61]\d{8}$/.test(digits)) {
    return `252${digits}`;
  }

  return null;
}

export function normalizePhoneForWaafi(value) {
  const normalized = tryNormalizePhone(value);
  if (!normalized) {
    const err = new Error(
      value && isValidPhoneInput(value)
        ? 'Phone number format is invalid. Use formats like 0618827482 or 252618827482.'
        : 'A valid mobile number is required.',
    );
    err.statusCode = 400;
    throw err;
  }
  return normalized;
}

export function maskPhone(value) {
  const normalized = String(value || '');
  if (normalized.length < 6) return normalized;
  return `${normalized.slice(0, 5)}****${normalized.slice(-3)}`;
}
