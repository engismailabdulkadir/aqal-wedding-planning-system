import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { expandAllowedRoles, userHasRole } from '../utils/roles.js';
import {
  resolveAccountStatus,
  getLoginDeniedMessage,
} from '../utils/userAccountStatus.js';


// ============================================================
// PROTECT MIDDLEWARE
// ============================================================

// Middleware-kan wuxuu ilaaliyaa routes-ka u baahan login.
// Wuxuu hubiyaa JWT token-ka uu frontend-ku soo diray.
export const protect = asyncHandler(async (req, res, next) => {

  // Authorization header-ka kasoo qaado request-ka
  const authorization = req.headers.authorization;

  // Token-ku waa inuu leeyahay qaabka:
  // Authorization: Bearer TOKEN
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  // Ka saar "Bearer " oo kaliya token-ka qaado
  const token = authorization.slice(7).trim();

  try {

    // JWT token-ka xaqiiji
    // env.jwtSecret waa secret-ka server-ka
    const decoded = jwt.verify(token, env.jwtSecret);

    // Token-ka wuxuu xambaarsan yahay user ID
    // ID-gaas database-ka user-ka ku raadi
    const user = await User.findById(decoded.id);

    // Haddii user-ka database-ka laga waayo
    if (!user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }

    // Hubi account status-ka
    if (resolveAccountStatus(user) !== 'active') {
      res.status(403);
      throw new Error(
        getLoginDeniedMessage(resolveAccountStatus(user))
      );
    }

    // User-ka ku kaydi req.user
    // Controllers-ka dambe ayaa isticmaali kara req.user
    req.user = user;

    // U gudub route/controller-ka xiga
    next();

  } catch (error) {

    // Haddii error-ku yahay 403, error-kaas sii gudbi
    if (error.statusCode || res.statusCode === 403) {
      throw error;
    }

    // Token haddii uu invalid yahay ama expired yahay
    res.status(401);
    throw new Error(
      'Not authorized, token is invalid or expired'
    );
  }
});


// ============================================================
// ROLE AUTHORIZATION
// ============================================================

// Function-kan wuxuu hubiyaa user-ka inuu leeyahay role-ka
// route-ka loo oggol yahay.
export function requireRole(...allowedRoles) {

  return (req, res, next) => {

    // Role-yada la oggol yahay normalize/expand garee
    const expanded = expandAllowedRoles(allowedRoles);

    // Hubi user-ka iyo role-kiisa
    if (
      !req.user ||
      !userHasRole(req.user.role, expanded)
    ) {
      res.status(403);

      // User-ku permission uma laha resource-kan
      return next(
        new Error(
          'You do not have permission to access this resource'
        )
      );
    }

    // Haddii role-ku sax yahay route-ka sii wad
    return next();
  };
}


/**
 * Alias for requireRole — matches Part 1 middleware naming.
 */

// authorizeRoles iyo requireRole waa isla function
export const authorizeRoles = requireRole;