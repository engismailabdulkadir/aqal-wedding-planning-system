import User from '../models/User.js';
import { conflictError, createHttpError } from './httpErrors.js';
import { tryNormalizePhone } from './phone.js';
import { isValidEmail, isValidUsername, normalizeUsername } from './validation.js';

export function normalizeOptionalEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email || null;
}

export async function assertUsernameAvailable(username, excludeUserId = null) {
  const normalizedUsername = normalizeUsername(username);
  if (!isValidUsername(normalizedUsername)) {
    throw createHttpError('Username must be 3-30 characters using letters, numbers, dots, or underscores', {
      statusCode: 400,
      code: 'INVALID_USERNAME',
      field: 'username',
    });
  }
  const filter = { username: normalizedUsername };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  if (await User.exists(filter)) {
    throw conflictError(
      'username',
      'USERNAME_EXISTS',
      `Username '${normalizedUsername}' is already taken. Please choose another username.`,
    );
  }
  return normalizedUsername;
}

export async function assertEmailAvailable(email, excludeUserId = null) {
  const normalizedEmail = normalizeOptionalEmail(email);
  if (!normalizedEmail) return null;
  if (!isValidEmail(normalizedEmail)) {
    throw createHttpError('Please provide a valid email address', {
      statusCode: 400,
      code: 'INVALID_EMAIL',
      field: 'email',
    });
  }
  const filter = { email: normalizedEmail };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  if (await User.exists(filter)) {
    throw conflictError('email', 'EMAIL_EXISTS', 'This email address is already registered.');
  }
  return normalizedEmail;
}

export async function assertPhoneAvailable(phone, { required = false, excludeUserId = null } = {}) {
  const trimmed = phone == null ? '' : String(phone).trim();
  if (!trimmed) {
    if (required) {
      throw createHttpError('A valid phone number is required.', {
        statusCode: 400,
        code: 'PHONE_REQUIRED',
        field: 'phone',
      });
    }
    return { phone: '', phoneNormalized: null };
  }

  const phoneNormalized = tryNormalizePhone(trimmed);
  if (!phoneNormalized) {
    throw createHttpError('Invalid phone number.', {
      statusCode: 400,
      code: 'INVALID_PHONE',
      field: 'phone',
    });
  }

  const filter = { phoneNormalized };
  if (excludeUserId) filter._id = { $ne: excludeUserId };
  if (await User.exists(filter)) {
    throw conflictError('phone', 'PHONE_EXISTS', 'This phone number is already registered.');
  }

  return { phone: trimmed, phoneNormalized };
}
