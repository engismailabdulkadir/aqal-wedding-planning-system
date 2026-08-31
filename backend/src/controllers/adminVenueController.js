import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Hall from '../models/Hall.js';
import HallSlot from '../models/HallSlot.js';
import User from '../models/User.js';
import VendorProfile from '../models/VendorProfile.js';
import Venue from '../models/Venue.js';
import { quoteSlots } from '../utils/hallOccupancy.js';
import { presentVenue } from '../utils/venuePresentation.js';

const venueFields = [
  'name', 'slug', 'description', 'city', 'district', 'address', 'location', 'phone', 'email',
  'images', 'coverImage', 'galleryImages', 'imageSource', 'imageIsPlaceholder', 'imageCredit',
  'amenities', 'parking', 'airConditioning', 'stage', 'soundSystem', 'security', 'catering',
  'capacityMin', 'capacityMax', 'priceStatus', 'priceFrom', 'pricePerPerson',
  'morningPrice', 'eveningPrice', 'fullDayPrice', 'deposit', 'priceNotes',
  'featured', 'featuredOrder', 'verified', 'status',
];

const hallFields = [
  'hallName', 'description', 'images', 'coverImage', 'capacity', 'minimumCapacity', 'facilities',
  'parking', 'maleSection', 'femaleSection', 'airConditioning', 'stage', 'kitchen', 'security',
  'status', 'priceStatus', 'morningPrice', 'eveningPrice', 'fullDayPrice', 'deposit',
];

export const listAdminVenues = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.featured === 'true') filter.featured = true;
  if (req.query.verified === 'true') filter.verified = true;
  if (req.query.ownershipStatus) filter.ownershipStatus = req.query.ownershipStatus;
  if (req.query.search) {
    const search = new RegExp(String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ name: search }, { city: search }, { district: search }, { slug: search }];
  }
  const venues = await Venue.find(filter)
    .populate('vendor', 'firstName lastName email')
    .populate('vendorProfile', 'businessName')
    .sort({ featured: -1, featuredOrder: 1, name: 1 })
    .lean();
  const halls = await Hall.find({ venue: { $in: venues.map((venue) => venue._id) } }).lean();
  const hallsByVenue = {};
  for (const hall of halls) {
    const key = String(hall.venue);
    if (!hallsByVenue[key]) hallsByVenue[key] = [];
    hallsByVenue[key].push(hall);
  }
  res.json({
    success: true,
    venues: venues.map((venue) => presentVenue(venue, hallsByVenue[String(venue._id)] || [])),
  });
});

export const getAdminVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id)
    .populate('vendor', 'firstName lastName email')
    .populate('vendorProfile', 'businessName phone email');
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const halls = await Hall.find({ venue: venue._id }).sort({ hallName: 1 }).lean();
  const slots = await HallSlot.find({ hall: { $in: halls.map((hall) => hall._id) } }).lean();
  const slotsByHall = {};
  for (const slot of slots) {
    const key = String(slot.hall);
    if (!slotsByHall[key]) slotsByHall[key] = [];
    slotsByHall[key].push(slot);
  }
  res.json({
    success: true,
    venue: presentVenue(venue.toObject(), halls, slots),
    halls: halls.map((hall) => ({ ...hall, slots: slotsByHall[String(hall._id)] || [] })),
  });
});

export const createAdminVenue = asyncHandler(async (req, res) => {
  const data = {
    ownershipStatus: 'unclaimed',
    vendor: null,
    vendorProfile: null,
    verified: false,
    featured: false,
    priceStatus: req.body.priceStatus || 'quote_required',
    city: req.body.city || 'Mogadishu',
    imageIsPlaceholder: true,
    imageSource: 'placeholder',
    externallySourced: false,
  };
  for (const field of venueFields) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (!data.name) {
    res.status(400);
    throw new Error('Venue name is required');
  }
  const venue = await Venue.create(data);
  res.status(201).json({ success: true, venue });
});

export const updateAdminVenue = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  for (const field of venueFields) {
    if (req.body[field] !== undefined) venue[field] = req.body[field];
  }
  await venue.save();
  res.json({ success: true, venue });
});

export const linkAdminVenueVendor = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const vendorId = req.body.vendor;
  if (vendorId === null || vendorId === '') {
    venue.vendor = null;
    venue.vendorProfile = null;
    venue.ownershipStatus = 'unclaimed';
    await venue.save();
    await Hall.updateMany({ venue: venue._id }, { $set: { vendor: null } });
    const halls = await Hall.find({ venue: venue._id }).select('_id');
    await HallSlot.updateMany({ hall: { $in: halls.map((hall) => hall._id) } }, { $set: { vendor: null } });
    return res.json({ success: true, venue, message: 'Venue unlinked from vendor.' });
  }
  if (!mongoose.isValidObjectId(vendorId)) {
    res.status(400);
    throw new Error('Provide a valid vendor');
  }
  const user = await User.findOne({ _id: vendorId, role: 'vendor' });
  if (!user) {
    res.status(404);
    throw new Error('Vendor account not found');
  }
  const profile = await VendorProfile.findOne({ user: user._id });
  if (!profile) {
    res.status(409);
    throw new Error('Vendor must complete a business profile before claiming a venue');
  }
  venue.vendor = user._id;
  venue.vendorProfile = profile._id;
  venue.ownershipStatus = 'claimed';
  await venue.save();
  await Hall.updateMany({ venue: venue._id }, { $set: { vendor: user._id } });
  const halls = await Hall.find({ venue: venue._id }).select('_id');
  await HallSlot.updateMany({ hall: { $in: halls.map((hall) => hall._id) } }, { $set: { vendor: user._id } });
  res.json({ success: true, venue, message: 'Venue linked to vendor.' });
});

export const createAdminHall = asyncHandler(async (req, res) => {
  const venue = await Venue.findById(req.params.id);
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const data = { venue: venue._id, vendor: venue.vendor || null, priceStatus: 'quote_required' };
  for (const field of hallFields) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (!data.hallName || !data.capacity) {
    res.status(400);
    throw new Error('Hall name and capacity are required');
  }
  // Pricing belongs to the booking quote, not the hall master record.
  data.priceStatus = 'quote_required';
  data.morningPrice = null;
  data.eveningPrice = null;
  data.fullDayPrice = null;
  data.deposit = null;
  const hall = await Hall.create(data);
  const slots = (Array.isArray(req.body.slots) && req.body.slots.length ? req.body.slots : quoteSlots()).map((slot) => ({
    ...slot,
    hall: hall._id,
    vendor: venue.vendor || null,
    price: 0,
    deposit: 0,
    quoteRequired: true,
  }));
  await HallSlot.insertMany(slots);
  res.status(201).json({ success: true, hall });
});

export const updateAdminHall = asyncHandler(async (req, res) => {
  const hall = await Hall.findById(req.params.id);
  if (!hall) {
    res.status(404);
    throw new Error('Hall not found');
  }
  for (const field of hallFields) {
    if (req.body[field] !== undefined) hall[field] = req.body[field];
  }
  await hall.save();
  res.json({ success: true, hall });
});
