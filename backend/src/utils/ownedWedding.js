import mongoose from 'mongoose';
import Wedding from '../models/Wedding.js';
import {
  canAccessWeddingAsCustomer,
  findAccessibleWeddingIds,
  isWeddingOwner,
} from './weddingMembership.js';
import { isCoupleRole, isWeddingPlannerRole } from './roles.js';

export async function resolveOwnedWedding(req, res, { required = true } = {}) {
  if (!isCoupleRole(req.user.role)) { res.status(403); throw new Error('Groom or Bride access required'); }
  const weddingId = req.query.weddingId || req.body?.weddingId || req.headers['x-wedding-id'];
  if (weddingId) {
    if (!mongoose.isValidObjectId(weddingId)) { res.status(400); throw new Error('Invalid wedding ID'); }
    const wedding = await Wedding.findById(weddingId);
    if (!wedding) { res.status(404); throw new Error('Wedding not found'); }
    if (!await canAccessWeddingAsCustomer(req.user._id, weddingId)) {
      res.status(404);
      throw new Error('Wedding not found');
    }
    return wedding;
  }
  const accessibleIds = await findAccessibleWeddingIds(req.user._id);
  if (!accessibleIds.length) {
    if (!required) return null;
    res.status(400); throw new Error('Create a wedding before using this feature');
  }
  if (accessibleIds.length > 1) { res.status(400); throw new Error('Select a wedding to continue'); }
  const wedding = await Wedding.findById(accessibleIds[0]);
  if (!wedding) {
    if (!required) return null;
    res.status(404); throw new Error('Wedding not found');
  }
  return wedding;
}

export async function resolveWeddingForCustomerEdit(req, res, { weddingId } = {}) {
  const id = weddingId || req.params.id || req.body?.weddingId || req.query.weddingId || req.headers['x-wedding-id'];
  if (req.user.role === 'vendor') {
    res.status(403);
    throw new Error('Vendors cannot edit a customer wedding');
  }
  if (isWeddingPlannerRole(req.user.role)) {
    res.status(403);
    throw new Error('Planner assignment is managed by an administrator');
  }
  if (req.user.role === 'admin') {
    if (!mongoose.isValidObjectId(id)) { res.status(400); throw new Error('Wedding ID is required'); }
    const wedding = await Wedding.findById(id);
    if (!wedding) { res.status(404); throw new Error('Wedding not found'); }
    return wedding;
  }
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Only the wedding owner can make this change');
  }
  if (id) {
    if (!mongoose.isValidObjectId(id)) { res.status(400); throw new Error('Invalid wedding ID'); }
    const wedding = await Wedding.findById(id);
    if (!wedding) { res.status(404); throw new Error('Wedding not found'); }
    if (!await canAccessWeddingAsCustomer(req.user._id, id)) {
      res.status(403);
      throw new Error('You are not authorized to update this wedding');
    }
    return wedding;
  }
  return resolveOwnedWedding(req, res);
}

export async function assertWeddingOwner(req, res, weddingId) {
  if (!mongoose.isValidObjectId(weddingId)) {
    res.status(400);
    throw new Error('Invalid wedding ID');
  }
  const wedding = await Wedding.findById(weddingId);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }
  if (!await isWeddingOwner(req.user._id, weddingId)) {
    res.status(403);
    throw new Error('Only the wedding creator can perform this action');
  }
  return wedding;
}
