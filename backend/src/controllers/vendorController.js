import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import VendorProfile, { VENDOR_CATEGORIES } from '../models/VendorProfile.js';
import { createHttpError } from '../utils/httpErrors.js';

const editable = ['businessName', 'ownerName', 'category', 'description', 'phone', 'email', 'city', 'district', 'address', 'logo', 'coverImage', 'startingPrice', 'services', 'availability', 'active'];
const safePopulate = { path: 'user', select: 'firstName lastName' };
function vendorOnly(req, res) { if (req.user.role !== 'vendor') { res.status(403); throw new Error('Vendor access required'); } }

export const listVendors = asyncHandler(async (req, res) => {
  const filter = {
    active: true,
    verificationStatus: { $nin: ['rejected', 'suspended'] },
  };
  if (req.query.category) filter.category = String(req.query.category).toLowerCase();
  if (req.query.city) filter.city = new RegExp(String(req.query.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.minPrice || req.query.maxPrice) filter.startingPrice = { ...(req.query.minPrice ? { $gte: Number(req.query.minPrice) } : {}), ...(req.query.maxPrice ? { $lte: Number(req.query.maxPrice) } : {}) };
  if (req.query.search) {
    const q = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ businessName: q }, { description: q }, { city: q }];
  }
  const sort = req.query.sort === 'price_desc' ? { startingPrice: -1 } : req.query.sort === 'price_asc' ? { startingPrice: 1 } : { verified: -1, createdAt: -1 };
  const vendors = await VendorProfile.find(filter).populate(safePopulate).sort(sort).lean();
  res.json({ success: true, vendors, categories: VENDOR_CATEGORIES });
});

export const getVendor = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) { res.status(400); throw new Error('Invalid vendor ID'); }
  const vendor = await VendorProfile.findOne({ _id: req.params.id, active: true }).populate(safePopulate).lean();
  if (!vendor) { res.status(404); throw new Error('Vendor not found'); }
  res.json({ success: true, vendor });
});

export const getMyVendorProfile = asyncHandler(async (req, res) => {
  vendorOnly(req, res);
  res.json({
    success: true,
    vendor: await VendorProfile.findOne({ user: req.user._id }),
    categories: VENDOR_CATEGORIES,
  });
});
export const upsertMyVendorProfile = asyncHandler(async (req, res) => {
  vendorOnly(req, res);
  const data = {};
  for (const key of editable) {
    if (req.body[key] === undefined) continue;
    if (key === 'category') {
      const category = String(req.body[key]).toLowerCase().trim();
      if (!VENDOR_CATEGORIES.includes(category)) {
        throw createHttpError(
          `Category must be one of: ${VENDOR_CATEGORIES.join(', ')}`,
          { statusCode: 400, field: 'category' },
        );
      }
      data[key] = category;
      continue;
    }
    data[key] = req.body[key];
  }
  let vendor = await VendorProfile.findOne({ user: req.user._id });
  if (vendor) { Object.assign(vendor, data); await vendor.save(); } else vendor = await VendorProfile.create({ ...data, user: req.user._id });
  res.status(200).json({ success: true, vendor });
});
