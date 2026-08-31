import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Wedding from '../models/Wedding.js';
import VendorProfile from '../models/VendorProfile.js';

export const checkWeddingOwnership = asyncHandler(async (req, res, next) => {
  const weddingId = req.params.weddingId || req.params.id;
  if (!mongoose.isValidObjectId(weddingId)) {
    res.status(400);
    throw new Error('Invalid wedding ID');
  }

  const wedding = await Wedding.findById(weddingId);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }

  if (req.user.role === 'admin') {
    req.wedding = wedding;
    return next();
  }

  if (req.user.role === 'customer' && wedding.customer.equals(req.user._id)) {
    req.wedding = wedding;
    return next();
  }

  res.status(403);
  throw new Error('You do not have permission to access this wedding');
});

export const checkPlannerWeddingAccess = asyncHandler(async (req, res, next) => {
  const weddingId = req.params.weddingId || req.params.id;
  if (!mongoose.isValidObjectId(weddingId)) {
    res.status(400);
    throw new Error('Invalid wedding ID');
  }

  const wedding = await Wedding.findById(weddingId);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }

  if (req.user.role === 'admin') {
    req.wedding = wedding;
    return next();
  }

  if (req.user.role === 'planner' && wedding.planner?.equals(req.user._id)) {
    req.wedding = wedding;
    return next();
  }

  res.status(403);
  throw new Error('You do not have permission to access this wedding');
});

export const checkVendorOwnership = asyncHandler(async (req, res, next) => {
  const vendorId = req.params.vendorId || req.params.id;
  if (!mongoose.isValidObjectId(vendorId)) {
    res.status(400);
    throw new Error('Invalid vendor ID');
  }

  const vendorProfile = await VendorProfile.findById(vendorId);
  if (!vendorProfile) {
    res.status(404);
    throw new Error('Vendor profile not found');
  }

  if (req.user.role === 'admin') {
    req.vendorProfile = vendorProfile;
    return next();
  }

  if (req.user.role === 'vendor' && vendorProfile.user.equals(req.user._id)) {
    req.vendorProfile = vendorProfile;
    return next();
  }

  res.status(403);
  throw new Error('You do not have permission to access this vendor profile');
});
