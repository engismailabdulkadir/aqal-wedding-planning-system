import asyncHandler from 'express-async-handler';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { expandAllowedRoles, userHasRole } from '../utils/roles.js';
import { resolveAccountStatus, getLoginDeniedMessage } from '../utils/userAccountStatus.js';

export const protect = asyncHandler(async (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }

  const token = authorization.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(401);
      throw new Error('Not authorized, user not found');
    }
    if (resolveAccountStatus(user) !== 'active') {
      res.status(403);
      throw new Error(getLoginDeniedMessage(resolveAccountStatus(user)));
    }
    req.user = user;
    next();
  } catch (error) {
    if (error.statusCode || res.statusCode === 403) throw error;
    res.status(401);
    throw new Error('Not authorized, token is invalid or expired');
  }
});

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const expanded = expandAllowedRoles(allowedRoles);
    if (!req.user || !userHasRole(req.user.role, expanded)) {
      res.status(403);
      return next(new Error('You do not have permission to access this resource'));
    }
    return next();
  };
}

/** Alias for requireRole — matches Part 1 middleware naming. */
export const authorizeRoles = requireRole;
