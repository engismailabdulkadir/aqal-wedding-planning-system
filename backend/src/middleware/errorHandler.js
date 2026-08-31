export function errorHandler(err, _req, res, _next) {
  const duplicateKey = err?.code === 11000;
  const validationError = err?.name === 'ValidationError' || err?.name === 'CastError';
  const multerError = err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE';
  const isProduction = process.env.NODE_ENV === 'production';

  if (multerError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Image must be smaller than 5 MB.'
      : err.message || 'Invalid image upload.';
    return res.status(400).json({
      success: false,
      message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  }

  if (duplicateKey) {
    const mapped = mapDuplicateFromModule(err);
    return res.status(409).json({
      success: false,
      code: mapped.code,
      field: mapped.field,
      message: mapped.message,
      ...(isProduction ? {} : { stack: err.stack }),
    });
  }

  const statusCode = validationError
    ? 400
    : err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    code: typeof err.code === 'string' ? err.code : undefined,
    field: err.field || undefined,
    message: statusCode === 500 && isProduction ? 'Internal server error' : err.message,
    ...(err.details ? { details: err.details } : {}),
    ...(isProduction ? {} : { stack: err.stack }),
  });
}

function mapDuplicateFromModule(err) {
  // Lazy import avoided; inline mirror of mapDuplicateKeyError for circular-safe use
  const keyPattern = err?.keyPattern || {};
  const keyValue = err?.keyValue || {};
  const field = Object.keys(keyPattern)[0];

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
  if (field === 'email') {
    return {
      code: 'EMAIL_EXISTS',
      field: 'email',
      message: 'This email address is already registered.',
    };
  }
  if (field === 'phone' || field === 'phoneNormalized') {
    return {
      code: 'PHONE_EXISTS',
      field: 'phone',
      message: 'This phone number is already registered.',
    };
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
    field: field || null,
    message: field ? `A record with this ${field} already exists.` : 'A record with this unique value already exists.',
  };
}
