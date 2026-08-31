import mongoose from 'mongoose';
import Wedding from '../models/Wedding.js';
import User from '../models/User.js';
import { resolveOwnedWedding } from './ownedWedding.js';
import { canAccessWeddingAsCustomer } from './weddingMembership.js';
import { isCoupleRole, isWeddingPlannerRole } from './roles.js';

function slugUsername(value) {
  const slug = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24);
  if (slug.length >= 3) return slug;
  return `user_${slug || 'account'}`.slice(0, 24).padEnd(3, '0');
}

async function ensureUsernameForUser(user) {
  if (user.username) return user.username;
  const base = slugUsername(user.email?.split('@')[0] || `${user.firstName}_${user.lastName}`) || `user_${String(user._id).slice(-6)}`;
  let candidate = base;
  let suffix = 1;
  while (await User.exists({ username: candidate, _id: { $ne: user._id } })) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }
  user.username = candidate;
  await user.save();
  return candidate;
}

export async function migrateUsersWithoutUsername() {
  const users = await User.find({ $or: [{ username: null }, { username: '' }] });
  for (const user of users) {
    await ensureUsernameForUser(user);
  }
  if (users.length) {
    console.log(`Backfilled username for ${users.length} user(s)`);
  }
}

export function requireStaffWeddingScope(req, res) {
  if ((req.user.role === 'planner' || isWeddingPlannerRole(req.user.role) || req.user.role === 'admin')
    && !(req.query.weddingId || req.body?.weddingId || req.headers['x-wedding-id'] || req.params.weddingId)) {
    res.status(403);
    throw new Error('Select an assigned wedding');
  }
}

export async function loadAccessibleWedding(req, res, { required = true, write = false } = {}) {
  const weddingId = req.query.weddingId || req.body?.weddingId || req.headers['x-wedding-id'] || req.params.weddingId;
  if (isCoupleRole(req.user.role)) {
    return resolveOwnedWedding(req, res, { required });
  }
  if (req.user.role === 'admin') {
    if (!weddingId) {
      if (!required) return null;
      res.status(400);
      throw new Error('Select a wedding');
    }
    if (!mongoose.isValidObjectId(weddingId)) {
      res.status(400);
      throw new Error('Invalid wedding ID');
    }
    const wedding = await Wedding.findById(weddingId);
    if (!wedding) {
      res.status(404);
      throw new Error('Wedding not found');
    }
    return wedding;
  }
  if (req.user.role === 'planner' || isWeddingPlannerRole(req.user.role)) {
    if (!weddingId) {
      if (!required) return null;
      res.status(400);
      throw new Error('Select an assigned wedding');
    }
    if (!mongoose.isValidObjectId(weddingId)) {
      res.status(400);
      throw new Error('Invalid wedding ID');
    }
    const wedding = await Wedding.findOne({ _id: weddingId, planner: req.user._id });
    if (!wedding) {
      res.status(403);
      throw new Error('You can only access assigned weddings');
    }
    return wedding;
  }
  if (write) {
    res.status(403);
    throw new Error('Not allowed');
  }
  res.status(403);
  throw new Error('Not allowed');
}

export async function assertWeddingAccess(req, res, weddingId, { write = false } = {}) {
  if (req.user.role === 'admin') {
    const wedding = mongoose.isValidObjectId(weddingId) ? await Wedding.findById(weddingId) : null;
    if (!wedding) {
      res.status(404);
      throw new Error('Wedding not found');
    }
    return wedding;
  }
  if (isCoupleRole(req.user.role)) {
    if (!mongoose.isValidObjectId(weddingId)) {
      res.status(400);
      throw new Error('Invalid wedding ID');
    }
    const wedding = await Wedding.findById(weddingId);
    if (!wedding) {
      res.status(404);
      throw new Error('Wedding not found');
    }
    if (!await canAccessWeddingAsCustomer(req.user._id, weddingId)) {
      res.status(404);
      throw new Error('Wedding not found');
    }
    return wedding;
  }
  if (req.user.role === 'planner' || isWeddingPlannerRole(req.user.role)) {
    const wedding = mongoose.isValidObjectId(weddingId)
      ? await Wedding.findOne({ _id: weddingId, planner: req.user._id })
      : null;
    if (!wedding) {
      res.status(403);
      throw new Error('You can only access assigned weddings');
    }
    return wedding;
  }
  if (write) {
    res.status(403);
    throw new Error('Not allowed');
  }
  res.status(403);
  throw new Error('Not allowed');
}
