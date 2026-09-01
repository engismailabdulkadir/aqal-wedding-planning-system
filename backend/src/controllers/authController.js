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

// Function-kan wuxuu diyaariyaa xogta user-ka ee frontend-ka loo diri karo.
// Password-ka iyo xogaha xasaasiga ah laguma soo celinayo frontend-ka.
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

    // true haddii account-ku active yahay
    isActive: accountStatus === 'active',

    // Xaaladda verification-ka user-ka
    isVerified: user.isVerified,

    // Waqtigii ugu dambeeyay ee user-ku login sameeyay
    lastLogin: user.lastLogin,

    // Waqtigii account-ka la sameeyay
    createdAt: user.createdAt,
  };
}

// Function-kan wuxuu user-ka ku raadinayaa username ama email.
// Waxaa loo isticmaalaa marka user-ku login sameynayo.
async function findUserByLoginIdentifier(identifier) {
  // Ka saar spaces-ka bilowga iyo dhammaadka
  const trimmed = String(identifier || '').trim();

  // Haddii username/email aan la soo dirin user ma jiro
  if (!trimmed) return null;

  // Marka hore username ayaa la isku dayayaa
  const username = normalizeUsername(trimmed);

  if (isValidUsername(username)) {
    // +password ayaa password-ka kasoo saaraya database-ka
    // sababtoo ah User model-ka password wuxuu leeyahay select: false
    const byUsername = await User.findOne({ username }).select('+password');

    if (byUsername) return byUsername;
  }

  // Haddii username laga waayo, email ayaa la isku dayayaa
  const email = normalizeOptionalEmail(trimmed);

  if (email && isValidEmail(email)) {
    return User.findOne({ email }).select('+password');
  }

  return null;
}


// ============================================================
// REGISTER / SIGN UP
// ============================================================

// Function-kan wuxuu sameynayaa account cusub.
export const register = asyncHandler(async (req, res) => {

  // Xogta user-ka ee frontend-ka kasoo timid
  const { firstName, lastName, username, email, phone, password } = req.body;

  // Role-ka waxaa laga aqbalayaa role ama account_type
  const roleInput = req.body.role ?? req.body.account_type;

  // Hubi in role-ka uu yahay role sax ah
  const role = parsePublicRegistrationRole(roleInput);

  // Haddii role-ku khaldan yahay
  if (!role) {
    const raw = String(roleInput ?? '').trim().toLowerCase();

    // Admin si public ah looma sameyn karo
    if (raw === ROLES.ADMIN) {
      throw createHttpError('Admin accounts cannot be created through public registration.', {
        statusCode: 403,
        field: 'role',
        code: 'ADMIN_REGISTRATION_FORBIDDEN',
      });
    }

    // Haddii account type-ku aanu sax ahayn
    throw createHttpError(
      'Invalid account type. Choose Groom, Bride, Wedding Planner, or Vendor.',
      {
        statusCode: 400,
        field: 'role',
        code: 'INVALID_ACCOUNT_TYPE',
      }
    );
  }

  // Hubi first name iyo last name
  assertValidPersonName(firstName, 'First name');
  assertValidPersonName(lastName, 'Last name');

  // Hubi password-ka
  if (!isValidPassword(password)) {
    throw createHttpError('Password must be at least 4 characters.', {
      statusCode: 400,
      code: 'INVALID_PASSWORD',
      field: 'password',
    });
  }

  // Hubi username inuu database-ka hore ugu jirin
  const normalizedUsername = await assertUsernameAvailable(username);

  // Hubi email inuu hore ugu jirin database-ka
  const normalizedEmail = await assertEmailAvailable(email);

  // Hubi phone number-ka iyo inuu hore ugu jirin database-ka
  const phoneData = await assertPhoneAvailable(phone, {
    required: isCoupleRole(role),
  });

  // Xogta user-ka lagu sameynayo database-ka
  const userPayload = {
    firstName,
    lastName,
    username: normalizedUsername,
    phone: phoneData.phone,

    // Password-ka halkan plain text ayuu ahaan karaa,
    // laakiin User model-ka pre-save middleware ayaa hash gareynaya.
    password,

    role,
  };

  // Email-ka kaliya ku dar haddii uu jiro
  if (normalizedEmail) userPayload.email = normalizedEmail;

  // User-ka cusub ku kaydi MongoDB
  const user = await User.create(userPayload);


  // ============================================================
  // PROFILE-KA USER-KA OO KU XIRAN ROLE-KIISA
  // ============================================================

  // Haddii user-ku yahay Groom ama Bride
  if (isCoupleRole(role)) {

    // Samee CustomerProfile
    await CustomerProfile.create({
      user: user._id,
      city: '',
    });

  // Haddii user-ku yahay Wedding Planner
  } else if (isWeddingPlannerRole(role)) {

    // Samee PlannerProfile
    await PlannerProfile.create({
      user: user._id,
    });

  // Haddii user-ku yahay Vendor
  } else if (role === ROLES.VENDOR) {

    // Samee VendorProfile
    await VendorProfile.create({
      user: user._id,
      businessName: `${firstName} ${lastName}`,
      category: 'other',
      city: 'Pending',
      verificationStatus: 'pending',
    });

    // Admin-yada ogeysii in vendor cusub isdiiwaangeliyay
    await notifyAdmins({
      title: 'New vendor registration',
      message: `${firstName} ${lastName} registered as a vendor.`,
      type: 'vendor_registration',
      link: '/admin/vendors',
    });
  }

  // Marka registration-ku guuleysto:
  // 1. success ayaa la diraa
  // 2. JWT token ayaa la sameeyaa
  // 3. user-ka public data ayaa frontend-ka loo diraa
  res.status(201).json({
    success: true,
    token: generateToken(user._id),
    user: publicUser(user),
  });
});


// ============================================================
// LOGIN
// ============================================================

// Function-kan wuxuu user-ka geliyaa system-ka.
export const login = asyncHandler(async (req, res) => {

  // Frontend-ka wuxuu soo diri karaa username ama email
  const { username, password, email } = req.body;

  // Username ayaa mudnaanta leh; haddii uusan jirin email ayaa la isticmaalayaa
  const identifier = username || email;

  // Database-ka ka raadi user-ka
  const user = await findUserByLoginIdentifier(identifier);

  // Hubi:
  // - user inuu jiro
  // - password inuu string yahay
  // - password-ka inuu sax yahay
  if (
    !user ||
    typeof password !== 'string' ||
    !(await user.comparePassword(password))
  ) {
    res.status(401);
    throw new Error('Invalid username or password');
  }

  // Hubi xaaladda account-ka
  const accountStatus = resolveAccountStatus(user);

  // Haddii account-ku active ahayn login waa la diidayaa
  if (accountStatus !== 'active') {
    res.status(403);
    throw new Error(getLoginDeniedMessage(accountStatus));
  }

  // Kaydi waqtiga ugu dambeeyay ee login-ka
  user.lastLogin = new Date();

  // Database-ka ku update garee
  await user.save();

  // Login-ku guuleystay:
  // JWT token iyo user data ayaa frontend-ka loo diraa
  res.json({
    success: true,
    token: generateToken(user._id),
    user: publicUser(user),
  });
});


// ============================================================
// GET CURRENT USER
// ============================================================

// Function-kan wuxuu soo celiyaa user-ka hadda login-ka ku jira.
// Waxaa muhiim u ah /auth/me.
export const getCurrentUser = asyncHandler(async (req, res) => {

  // req.user waxaa hore u diyaariyay protect middleware
  res.json({
    success: true,
    user: publicUser(req.user),
  });
});


// ============================================================
// UPDATE PROFILE
// ============================================================

// User-ka login-ka ku jira wuxuu update gareyn karaa profile-kiisa.
export const updateProfile = asyncHandler(async (req, res) => {

  // Haddii firstName la soo diray
  if (req.body.firstName !== undefined) {

    // Hubi inuu valid yahay
    assertValidPersonName(req.body.firstName, 'First name');

    // Update garee
    req.user.firstName = req.body.firstName;
  }

  // Haddii lastName la soo diray
  if (req.body.lastName !== undefined) {
    assertValidPersonName(req.body.lastName, 'Last name');
    req.user.lastName = req.body.lastName;
  }

  // Haddii phone la beddelayo
  if (req.body.phone !== undefined) {

    // Hubi phone-ka inuu sax yahay oo uusan qof kale isticmaalin
    const phoneData = await assertPhoneAvailable(req.body.phone, {
      required: isCoupleRole(req.user.role),
      excludeUserId: req.user._id,
    });

    req.user.phone = phoneData.phone;
  }

  // Haddii email la beddelayo
  if (req.body.email !== undefined) {

    // Hubi email-ka
    const email = await assertEmailAvailable(
      req.body.email,
      req.user._id
    );

    if (email) {
      req.user.email = email;
    } else {

      // Haddii email la tirtiray
      req.user.email = undefined;

      if (req.user._doc) delete req.user._doc.email;

      req.user.markModified('email');
    }
  }

  // Save garee xogta cusub
  await req.user.save();

  // Haddii email aanu jirin database-ka si dhab ah uga saar
  if (!req.user.email) {
    await User.collection.updateOne(
      { _id: req.user._id },
      { $unset: { email: '' } }
    );
  }

  // Soo celi user-ka updated
  res.json({
    success: true,
    user: publicUser(req.user),
  });
});


// ============================================================
// CHANGE PASSWORD
// ============================================================

// User login ku jira wuxuu password-kiisa beddeli karaa.
export const changePassword = asyncHandler(async (req, res) => {

  // Password-yada frontend-ka kasoo baxay
  const { currentPassword, newPassword, confirmPassword } = req.body;

  // Hubi password-ka cusub
  if (!isValidPassword(newPassword)) {
    throw createHttpError('Password must be at least 4 characters.', {
      statusCode: 400,
      code: 'INVALID_PASSWORD',
      field: 'password',
    });
  }

  // Hubi new password iyo confirm password inay isku mid yihiin
  if (newPassword !== confirmPassword) {
    throw createHttpError(
      'New passwords must match',
      {
        statusCode: 400,
        field: 'confirmPassword',
      }
    );
  }

  // User-ka database-ka kasoo qaado
  // +password waa muhiim sababtoo ah password-ka default ahaan lama soo qaato
  const user = await User.findById(req.user._id).select('+password');

  // Hubi password-kii hore
  if (
    !currentPassword ||
    !(await user.comparePassword(currentPassword))
  ) {
    throw createHttpError(
      'Current password is incorrect',
      {
        statusCode: 400,
        field: 'currentPassword',
      }
    );
  }

  // Hubi password-ka cusub inuusan la mid ahayn kii hore
  if (await user.comparePassword(newPassword)) {
    throw createHttpError(
      'New password must be different from the current password.',
      {
        statusCode: 400,
        field: 'newPassword',
      }
    );
  }

  // Password-ka cusub dhig
  // User model-ka ayaa save-ka ka hor hash gareynaya
  user.password = newPassword;

  // Database-ka save garee
  await user.save();

  // Jawaab guul ah
  res.json({
    success: true,
    message: 'Password changed successfully',
  });
});


// ============================================================
// LOGOUT
// ============================================================

// Logout endpoint.
// JWT-ga client-ka ayaa frontend-ka laga tirtirayaa.
export const logout = asyncHandler(async (_req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});