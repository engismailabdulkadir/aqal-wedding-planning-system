import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import VendorProfile from '../models/VendorProfile.js';
import WeddingListing, { LISTING_CATEGORIES } from '../models/WeddingListing.js';
import {
  activeListingFilter,
  MARKETPLACE_CATEGORY_GROUPS,
  publishableVendorFilter,
  resolveMarketplaceCategoryFilter,
} from '../utils/marketplaceListings.js';

const editable = [
  'name', 'category', 'listingType', 'description', 'price', 'discountPrice', 'city', 'location',
  'images', 'available', 'active', 'status', 'availabilityType', 'features', 'quantity', 'metadata',
];

function normalizeListingImages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((path) => typeof path === 'string' && path.trim())
    .map((path) => path.trim())
    .filter((path) => !path.startsWith('blob:'));
}

function serializeListing(listing) {
  const doc = listing.toObject ? listing.toObject() : listing;
  return {
    ...doc,
    images: normalizeListingImages(doc.images),
  };
}

async function publishableProfileIds() {
  const profiles = await VendorProfile.find(publishableVendorFilter()).select('_id');
  return profiles.map((profile) => profile._id);
}

async function assertPublishableListing(listing) {
  if (!listing || !listing.active || listing.status !== 'active' || !listing.available) return false;
  const profile = listing.vendorProfile?.verificationStatus
    ? listing.vendorProfile
    : await VendorProfile.findById(listing.vendorProfile).lean();
  if (!profile || !profile.active) return false;
  if (['rejected', 'suspended'].includes(profile.verificationStatus)) return false;
  return true;
}

export const listListings = asyncHandler(async (req, res) => {
  const filter = { ...activeListingFilter() };
  const publishable = await publishableProfileIds();
  filter.vendorProfile = { $in: publishable };
  const categoryFilter = resolveMarketplaceCategoryFilter(req.query.category);
  if (categoryFilter) filter.category = categoryFilter;
  if (req.query.city) filter.city = new RegExp(String(req.query.city).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (req.query.vendor && mongoose.isValidObjectId(req.query.vendor)) filter.vendor = req.query.vendor;
  if (req.query.availabilityType) filter.availabilityType = req.query.availabilityType;
  if (req.query.minPrice || req.query.maxPrice) {
    filter.price = {
      ...(req.query.minPrice ? { $gte: Number(req.query.minPrice) } : {}),
      ...(req.query.maxPrice ? { $lte: Number(req.query.maxPrice) } : {}),
    };
  }
  if (req.query.rentalOrPurchase) filter['metadata.rentalOrPurchase'] = req.query.rentalOrPurchase;
  if (req.query.minCapacity) filter['metadata.capacity'] = { $gte: Number(req.query.minCapacity) };
  if (req.query.district) {
    filter['metadata.district'] = new RegExp(String(req.query.district).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  if (req.query.search) {
    const q = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: q }, { description: q }, { city: q }, { location: q }];
  }
  const sort = req.query.sort === 'price_asc' ? { price: 1 }
    : req.query.sort === 'price_desc' ? { price: -1 }
      : req.query.sort === 'popular' ? { createdAt: -1 }
        : { createdAt: -1 };
  const limit = Math.min(Math.max(Number(req.query.limit) || 0, 0), 48);
  let query = WeddingListing.find(filter)
    .populate('vendorProfile', 'businessName phone email city verified verificationStatus')
    .sort(sort);
  if (limit) query = query.limit(limit);
  const listings = await query;
  res.json({
    success: true,
    count: listings.length,
    listings: listings.map(serializeListing),
    categories: LISTING_CATEGORIES,
    marketplaceGroups: MARKETPLACE_CATEGORY_GROUPS,
  });
});

export const getListing = asyncHandler(async (req, res) => {
  const listing = mongoose.isValidObjectId(req.params.id)
    ? await WeddingListing.findOne({ _id: req.params.id })
      .populate('vendorProfile', 'businessName description phone email city address verified verificationStatus active')
    : null;
  if (!await assertPublishableListing(listing)) {
    res.status(404);
    throw new Error('Wedding service not found');
  }
  res.json({ success: true, listing: serializeListing(listing) });
});

export const getMyListings = asyncHandler(async (req, res) => {
  const listings = await WeddingListing.find({ vendor: req.user._id }).populate('vendorProfile', 'businessName').sort({ createdAt: -1 });
  res.json({
    success: true,
    listings: listings.map(serializeListing),
    categories: LISTING_CATEGORIES,
  });
});

export const createListing = asyncHandler(async (req, res) => {
  const profile = await VendorProfile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(409);
    throw new Error('Create your vendor profile before adding listings');
  }
  const data = { vendor: req.user._id, vendorProfile: profile._id };
  for (const key of editable) {
    if (req.body[key] !== undefined) {
      data[key] = key === 'images' ? normalizeListingImages(req.body[key]) : req.body[key];
    }
  }
  const listing = await WeddingListing.create(data);
  res.status(201).json({ success: true, listing: serializeListing(listing) });
});

export const updateListing = asyncHandler(async (req, res) => {
  const listing = mongoose.isValidObjectId(req.params.id)
    ? await WeddingListing.findOne({ _id: req.params.id, vendor: req.user._id })
    : null;
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  for (const key of editable) {
    if (req.body[key] === undefined) continue;
    if (key === 'images') {
      const nextImages = normalizeListingImages(req.body.images);
      // Keep existing images when client sends empty array without explicit clear flag
      if (nextImages.length === 0 && listing.images?.length > 0 && !req.body.clearImages) {
        continue;
      }
      listing.images = nextImages;
      continue;
    }
    listing[key] = req.body[key];
  }
  if (req.body.status === 'archived' || req.body.status === 'inactive') listing.active = false;
  if (req.body.status === 'active') listing.active = true;
  await listing.save();
  res.json({ success: true, listing: serializeListing(listing) });
});

export const deactivateListing = asyncHandler(async (req, res) => {
  const listing = mongoose.isValidObjectId(req.params.id)
    ? await WeddingListing.findOne({ _id: req.params.id, vendor: req.user._id })
    : null;
  if (!listing) {
    res.status(404);
    throw new Error('Listing not found');
  }
  listing.active = false;
  listing.status = 'archived';
  await listing.save();
  res.json({ success: true, listing });
});
