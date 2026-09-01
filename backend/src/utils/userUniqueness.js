import User from '../models/User.js';
import {
  conflictError,
  createHttpError,
} from './httpErrors.js';

import { tryNormalizePhone } from './phone.js';

import {
  isValidEmail,
  isValidUsername,
  normalizeUsername,
} from './validation.js';


// ============================================================
// EMAIL NORMALIZATION
// ============================================================

// Email-ka trim iyo lowercase ayaa laga dhigayaa.
export function normalizeOptionalEmail(value) {

  const email =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : '';

  // Haddii email madhan yahay null soo celi
  return email || null;
}


// ============================================================
// USERNAME UNIQUENESS
// ============================================================

// Hubi username inuu sax yahay iyo inuu unique yahay.
export async function assertUsernameAvailable(
  username,
  excludeUserId = null
) {

  // Username-ka normalize garee
  const normalizedUsername =
    normalizeUsername(username);

  // Hubi username format-kiisa
  if (!isValidUsername(normalizedUsername)) {

    throw createHttpError(
      'Username must be 3-30 characters using letters, numbers, dots, or underscores',
      {
        statusCode: 400,
        code: 'INVALID_USERNAME',
        field: 'username',
      }
    );
  }

  // Search filter
  const filter = {
    username: normalizedUsername,
  };

  // Marka profile la update gareynayo,
  // user-ka hadda jira ha loo tixgelin duplicate.
  if (excludeUserId) {
    filter._id = {
      $ne: excludeUserId,
    };
  }

  // Database-ka ka hubi username-ka
  if (await User.exists(filter)) {

    throw conflictError(
      'username',
      'USERNAME_EXISTS',
      `Username '${normalizedUsername}' is already taken. Please choose another username.`
    );
  }

  return normalizedUsername;
}


// ============================================================
// EMAIL UNIQUENESS
// ============================================================

// Hubi email inuu valid yahay iyo inuu unique yahay.
export async function assertEmailAvailable(
  email,
  excludeUserId = null
) {

  // Email-ka normalize garee
  const normalizedEmail =
    normalizeOptionalEmail(email);

  // Email optional ayuu yahay
  if (!normalizedEmail) return null;

  // Hubi email format
  if (!isValidEmail(normalizedEmail)) {

    throw createHttpError(
      'Please provide a valid email address',
      {
        statusCode: 400,
        code: 'INVALID_EMAIL',
        field: 'email',
      }
    );
  }

  // Email-ka database-ka ka raadi
  const filter = {
    email: normalizedEmail,
  };

  // User-ka hadda jira ha loo tixgelin duplicate
  if (excludeUserId) {
    filter._id = {
      $ne: excludeUserId,
    };
  }

  // Hubi email-ku inuu qof kale leeyahay
  if (await User.exists(filter)) {

    throw conflictError(
      'email',
      'EMAIL_EXISTS',
      'This email address is already registered.'
    );
  }

  return normalizedEmail;
}


// ============================================================
// PHONE UNIQUENESS
// ============================================================

// Hubi phone-ka inuu sax yahay iyo inuu unique yahay.
export async function assertPhoneAvailable(
  phone,
  {
    required = false,
    excludeUserId = null,
  } = {}
) {

  // Phone-ka trim garee
  const trimmed =
    phone == null
      ? ''
      : String(phone).trim();

  // Haddii phone la waayay
  if (!trimmed) {

    // Haddii phone-ku required yahay error samee
    if (required) {

      throw createHttpError(
        'A valid phone number is required.',
        {
          statusCode: 400,
          code: 'PHONE_REQUIRED',
          field: 'phone',
        }
      );
    }

    // Haddii optional yahay
    return {
      phone: '',
      phoneNormalized: null,
    };
  }


  // Phone-ka normalize garee
  const phoneNormalized =
    tryNormalizePhone(trimmed);


  // Haddii phone-ku invalid yahay
  if (!phoneNormalized) {

    throw createHttpError(
      'Invalid phone number.',
      {
        statusCode: 400,
        code: 'INVALID_PHONE',
        field: 'phone',
      }
    );
  }


  // Database-ka phone normalized ka raadi
  const filter = {
    phoneNormalized,
  };


  // User-ka hadda jira ha loo tixgelin duplicate
  if (excludeUserId) {

    filter._id = {
      $ne: excludeUserId,
    };
  }


  // Hubi phone-ka inuusan user kale isticmaalin
  if (await User.exists(filter)) {

    throw conflictError(
      'phone',
      'PHONE_EXISTS',
      'This phone number is already registered.'
    );
  }


  // Phone-ka original iyo normalized labadaba celi
  return {
    phone: trimmed,
    phoneNormalized,
  };
}