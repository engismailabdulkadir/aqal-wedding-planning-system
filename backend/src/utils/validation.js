const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]*[A-Za-z.]?$|^[A-Za-z]$/;
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_INPUT_PATTERN = /^[0-9+()\s.-]{7,20}$/;

export function isValidPersonName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed || trimmed.length > 80) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return PERSON_NAME_PATTERN.test(trimmed);
}

export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidUsername(value) {
  const username = normalizeUsername(value);
  return USERNAME_PATTERN.test(username);
}

export function isValidEmail(value) {
  if (!value) return true;
  return EMAIL_PATTERN.test(String(value).trim().toLowerCase());
}

export function isValidPhoneInput(value) {
  if (!value) return false;
  return PHONE_INPUT_PATTERN.test(String(value).trim());
}

export function isPositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0;
}

export function isNonNegativeMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

export function isValidPassword(value) {
  const password = String(value || '');
  return password.length >= 4;
}

export function assertValidPersonName(value, label = 'Name') {
  if (!isValidPersonName(value)) {
    const err = new Error(`Please enter a valid ${label.toLowerCase()}.`);
    err.statusCode = 400;
    throw err;
  }
}

export function assertPhoneRequired(value) {
  if (!isValidPhoneInput(value)) {
    const err = new Error('A valid phone number is required.');
    err.statusCode = 400;
    throw err;
  }
}
