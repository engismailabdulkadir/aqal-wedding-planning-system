import asyncHandler from 'express-async-handler';
import User from '../models/User.js';
import CustomerProfile from '../models/CustomerProfile.js';
import PlannerProfile from '../models/PlannerProfile.js';
import VendorProfile from '../models/VendorProfile.js';
import { generateToken } from '../utils/generateToken.js';
import { notifyAdmins } from '../utils/notify.js';
import { createHttpError } from '../utils/httpErrors.js';
import {
  isCoupleRole,
  isWeddingPlannerRole,
  parsePublicRegistrationRole,
  ROLES,
} from '../utils/roles.js';
import {
  assertEmailAvailable,
  assertPhoneAvailable,
  assertUsernameAvailable,
  normalizeOptionalEmail,
} from '../utils/userUniqueness.js';
import {
  assertValidPersonName,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeUsername,
} from '../utils/validation.js';

import {
  resolveAccountStatus,
  getLoginDeniedMessage,
} from '../utils/userAccountStatus.js';

function publicUser(user) {
  const accountStatus = resolveAccountStatus(user);
  return {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    username: user.username,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar: user.avatar,
    accountStatus,
    isActive: accountStatus === 'active',
    isVerified: user.isVerified,
    lastLogin: user.lastLogin,
    createdAt: user.createdAt,
  };
}

async function findUserByLoginIdentifier(identifier) {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return null;

  const username = normalizeUsername(trimmed);
  if (isValidUsername(username)) {
    const byUsername = await User.findOne({ username }).select('+password');
    if (byUsername) return byUsername;
  }

  const email = normalizeOptionalEmail(trimmed);
  if (email && isValidEmail(email)) {
    return User.findOne({ email }).select('+password');
  }

  return null;
}

export const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, username, email, phone, password } = req.body;
  const roleInput = req.body.role ?? req.body.account_type;
  const role = parsePublicRegistrationRole(roleInput);

  if (!role) {
    const raw = String(roleInput ?? '').trim().toLowerCase();
    if (raw === ROLES.ADMIN) {
      throw createHttpError('Admin accounts cannot be created through public registration.', {
        statusCode: 403,
        field: 'role',
        code: 'ADMIN_REGISTRATION_FORBIDDEN',
      });
    }
    throw createHttpError('Invalid account type. Choose Groom, Bride, Wedding Planner, or Vendor.', {
      statusCode: 400,
      field: 'role',
      code: 'INVALID_ACCOUNT_TYPE',
    });
  }

  assertValidPersonName(firstName, 'First name');
  assertValidPersonName(lastName, 'Last name');

  if (!isValidPassword(password)) {
    throw createHttpError('Password must be at least 4 characters.', {
      statusCode: 400,
      code: 'INVALID_PASSWORD',
      field: 'password',
    });
  }

  const normalizedUsername = await assertUsernameAvailable(username);
  const normalizedEmail = await assertEmailAvailable(email);
  const phoneData = await assertPhoneAvailable(phone, {
    required: isCoupleRole(role),
  });

  const userPayload = {
    firstName,
    lastName,
    username: normalizedUsername,
    phone: phoneData.phone,
    password,
    role,
  };
  if (normalizedEmail) userPayload.email = normalizedEmail;

  const user = await User.create(userPayload);

  if (isCoupleRole(role)) {
    await CustomerProfile.create({ user: user._id, city: '' });
  } else if (isWeddingPlannerRole(role)) {
    await PlannerProfile.create({ user: user._id });
  } else if (role === ROLES.VENDOR) {
    await VendorProfile.create({
      user: user._id,
      businessName: `${firstName} ${lastName}`,
      category: 'other',
      city: 'Pending',
      verificationStatus: 'pending',
    });
    await notifyAdmins({
      title: 'New vendor registration',
      message: `${firstName} ${lastName} registered as a vendor.`,
      type: 'vendor_registration',
      link: '/admin/vendors',
    });
  }

  res.status(201).json({ success: true, token: generateToken(user._id), user: publicUser(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { username, password, email } = req.body;
  const identifier = username || email;
  const user = await findUserByLoginIdentifier(identifier);

  if (!user || typeof password !== 'string' || !(await user.comparePassword(password))) {
    res.status(401);
    throw new Error('Invalid username or password');
  }
  const accountStatus = resolveAccountStatus(user);
  if (accountStatus !== 'active') {
    res.status(403);
    throw new Error(getLoginDeniedMessage(accountStatus));
  }

  user.lastLogin = new Date();
  await user.save();
  res.json({ success: true, token: generateToken(user._id), user: publicUser(user) });
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res.json({ success: true, user: publicUser(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  if (req.body.firstName !== undefined) {
    assertValidPersonName(req.body.firstName, 'First name');
    req.user.firstName = req.body.firstName;
  }
  if (req.body.lastName !== undefined) {
    assertValidPersonName(req.body.lastName, 'Last name');
    req.user.lastName = req.body.lastName;
  }
  if (req.body.phone !== undefined) {
    const phoneData = await assertPhoneAvailable(req.body.phone, {
      required: isCoupleRole(req.user.role),
      excludeUserId: req.user._id,
    });
    req.user.phone = phoneData.phone;
  }
  if (req.body.email !== undefined) {
    const email = await assertEmailAvailable(req.body.email, req.user._id);
    if (email) req.user.email = email;
    else {
      req.user.email = undefined;
      if (req.user._doc) delete req.user._doc.email;
      req.user.markModified('email');
    }
  }
  await req.user.save();
  if (!req.user.email) {
    await User.collection.updateOne({ _id: req.user._id }, { $unset: { email: '' } });
  }
  res.json({ success: true, user: publicUser(req.user) });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!isValidPassword(newPassword)) {
    throw createHttpError('Password must be at least 4 characters.', {
      statusCode: 400,
      code: 'INVALID_PASSWORD',
      field: 'password',
    });
  }
  if (newPassword !== confirmPassword) {
    throw createHttpError('New passwords must match', { statusCode: 400, field: 'confirmPassword' });
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!currentPassword || !(await user.comparePassword(currentPassword))) {
    throw createHttpError('Current password is incorrect', { statusCode: 400, field: 'currentPassword' });
  }
  if (await user.comparePassword(newPassword)) {
    throw createHttpError('New password must be different from the current password.', {
      statusCode: 400,
      field: 'newPassword',
    });
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password changed successfully' });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});
