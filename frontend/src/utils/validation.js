const PERSON_NAME_PATTERN = /^[A-Za-z][A-Za-z\s'.-]*[A-Za-z.]?$|^[A-Za-z]$/;
const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_INPUT_PATTERN = /^[0-9+()\s.-]{7,20}$/;

export function isValidPersonName(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'This field is required.';
  if (/^\d+$/.test(trimmed)) return 'Please enter a valid name.';
  if (!PERSON_NAME_PATTERN.test(trimmed)) return 'Please enter a valid name.';
  return '';
}

export function isValidUsername(value) {
  const username = String(value || '').trim().toLowerCase();
  if (!username) return 'Username is required.';
  if (!USERNAME_PATTERN.test(username)) return 'Username must be 3-30 characters using letters, numbers, dots, or underscores.';
  return '';
}

export function isValidEmailOptional(value) {
  if (!value?.trim()) return '';
  if (!EMAIL_PATTERN.test(value.trim().toLowerCase())) return 'Enter a valid email address.';
  return '';
}

export function isValidPhone(value, { required = false } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return required ? 'Phone number is required.' : '';
  if (!PHONE_INPUT_PATTERN.test(trimmed)) return 'Invalid phone number.';
  if (/[a-zA-Z]/.test(trimmed)) return 'Phone number cannot contain letters.';
  return '';
}

export function isValidPassword(value, { required = true } = {}) {
  const password = String(value || '');
  if (!password) return required ? 'Password is required.' : '';
  if (password.length < 4) return 'Password must be at least 4 characters.';
  return '';
}

export function isPositiveInteger(value, label = 'Value') {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return label + ' is required.';
  if (!/^\d+$/.test(trimmed)) return label + ' must be a positive whole number.';
  const number = Number(trimmed);
  if (number <= 0) return label + ' must be greater than zero.';
  return '';
}

export function isNonNegativeMoney(value, label = 'Amount') {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) return label + ' is required.';
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return label + ' must be a valid number.';
  if (Number(trimmed) < 0) return label + ' must be 0 or more.';
  return '';
}
