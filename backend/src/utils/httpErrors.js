export function createHttpError(message, { statusCode = 400, code, field, details } = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (code) error.code = code;
  if (field) error.field = field;
  if (details) error.details = details;
  return error;
}

export function conflictError(field, code, message) {
  return createHttpError(message, { statusCode: 409, code, field });
}

const DUPLICATE_FIELD_MESSAGES = {
  username: {
    code: 'USERNAME_EXISTS',
    field: 'username',
    message: 'This username is already in use.',
  },
  email: {
    code: 'EMAIL_EXISTS',
    field: 'email',
    message: 'This email address is already registered.',
  },
  phone: {
    code: 'PHONE_EXISTS',
    field: 'phone',
    message: 'This phone number is already registered.',
  },
  phoneNormalized: {
    code: 'PHONE_EXISTS',
    field: 'phone',
    message: 'This phone number is already registered.',
  },
};

export function mapDuplicateKeyError(err) {
  const keyPattern = err?.keyPattern || {};
  const keyValue = err?.keyValue || {};
  const field = Object.keys(keyPattern)[0];
  if (!field) {
    return {
      code: 'DUPLICATE_VALUE',
      field: null,
      message: 'A record with this unique value already exists.',
    };
  }

  if (field === 'username') {
    const username = keyValue.username;
    return {
      code: 'USERNAME_EXISTS',
      field: 'username',
      message: username
        ? `Username '${username}' is already taken. Please choose another username.`
        : 'This username is already in use.',
    };
  }

  if (DUPLICATE_FIELD_MESSAGES[field]) {
    return { ...DUPLICATE_FIELD_MESSAGES[field] };
  }

  if (field === 'user') {
    return {
      code: 'PROFILE_EXISTS',
      field: null,
      message: 'A profile for this user already exists.',
    };
  }

  return {
    code: 'DUPLICATE_VALUE',
    field,
    message: `A record with this ${field} already exists.`,
  };
}
