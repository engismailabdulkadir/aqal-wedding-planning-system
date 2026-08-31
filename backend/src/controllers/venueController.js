import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Hall from '../models/Hall.js';
import HallBooking from '../models/HallBooking.js';
import HallSlot from '../models/HallSlot.js';
import VendorProfile from '../models/VendorProfile.js';
import Venue from '../models/Venue.js';
import { defaultSlots, expireStaleHolds, quoteSlots } from '../utils/hallOccupancy.js';
import { presentVenue } from '../utils/venuePresentation.js';

const venueFields = [
  'name', 'description', 'city', 'district', 'address', 'location', 'phone', 'email', 'images', 'status',
  'coverImage', 'galleryImages', 'imageSource', 'imageIsPlaceholder', 'imageCredit', 'amenities',
  'parking', 'airConditioning', 'stage', 'soundSystem', 'security', 'catering',
  'capacityMin', 'capacityMax', 'priceStatus', 'priceFrom', 'pricePerPerson',
  'morningPrice', 'eveningPrice', 'fullDayPrice', 'deposit', 'priceNotes',
];
const hallFields = [
  'hallName', 'description', 'images', 'coverImage', 'capacity', 'minimumCapacity', 'facilities',
  'parking', 'maleSection', 'femaleSection', 'airConditioning', 'stage', 'kitchen', 'security', 'status',
  'priceStatus', 'morningPrice', 'eveningPrice', 'fullDayPrice', 'deposit',
];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function requireVendorProfile(req, res) {
  const profile = await VendorProfile.findOne({ user: req.user._id });
  if (!profile) {
    res.status(409);
    throw new Error('Create your vendor profile first');
  }
  return profile;
}

function assertOwner(doc, req, res, message = 'You do not own this resource') {
  if (req.user.role === 'admin') return;
  if (!doc.vendor || !doc.vendor.equals(req.user._id)) {
    res.status(403);
    throw new Error(message);
  }
}

function queryList(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (value == null || value === '') return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

async function hallAvailabilityByDate(hallIds, date, slotType) {
  await expireStaleHolds();
  const bookings = await HallBooking.find({
    hall: { $in: hallIds },
    bookingDate: date,
    status: { $in: ['pending', 'held', 'confirmed'] },
  }).select('hall slotType status holdExpiresAt').lean();
  const now = new Date();
  const byHall = {};
  for (const hallId of hallIds) byHall[String(hallId)] = { morning: true, evening: true, full_day: true };
  for (const booking of bookings) {
    if (booking.status === 'held' && booking.holdExpiresAt && booking.holdExpiresAt <= now) continue;
    const key = String(booking.hall);
    if (!byHall[key]) continue;
    if (booking.slotType === 'full_day') {
      byHall[key].morning = false;
      byHall[key].evening = false;
      byHall[key].full_day = false;
    } else {
      byHall[key][booking.slotType] = false;
      byHall[key].full_day = false;
    }
  }
  return {
    byHall,
    hallAvailable(hallId) {
      const state = byHall[String(hallId)];
      if (!state) return true;
      if (slotType && ['morning', 'evening', 'full_day'].includes(slotType)) return Boolean(state[slotType]);
      return state.morning || state.evening || state.full_day;
    },
  };
}

export const listVenues = asyncHandler(async (req, res) => {
  const q = req.query;
  const filter = { status: q.status || 'active' };
  if (q.featured === 'true') {
    filter.featured = true;
    filter.verified = true;
    filter.status = 'active';
  }
  if (q.verified === 'true') filter.verified = true;
  if (q.city) filter.city = new RegExp(escapeRegex(q.city), 'i');
  if (q.district) filter.district = new RegExp(escapeRegex(q.district), 'i');
  if (q.search) {
    const search = new RegExp(escapeRegex(q.search), 'i');
    filter.$or = [
      { name: search },
      { description: search },
      { city: search },
      { district: search },
      { location: search },
      { address: search },
    ];
  }
  const amenities = queryList(q.amenities || q.amenity);
  if (amenities.length) filter.amenities = { $all: amenities };
  if (q.parking === 'true') filter.parking = true;
  if (q.airConditioning === 'true') filter.airConditioning = true;
  if (q.stage === 'true') filter.stage = true;
  if (q.soundSystem === 'true') filter.soundSystem = true;
  if (q.security === 'true') filter.security = true;
  if (q.catering === 'true') filter.catering = true;

  const sort = q.featured === 'true'
    ? { featuredOrder: 1, name: 1 }
    : { featured: -1, featuredOrder: 1, name: 1 };

  const venues = await Venue.find(filter)
    .populate('vendorProfile', 'businessName verificationStatus verified active city')
    .sort(sort)
    .lean();

  const venueIds = venues.map((venue) => venue._id);
  const halls = await Hall.find({ venue: { $in: venueIds }, status: 'active' }).sort({ hallName: 1 }).lean();
  const hallIds = halls.map((hall) => hall._id);
  const slots = await HallSlot.find({ hall: { $in: hallIds }, active: true }).lean();

  const hallsByVenue = {};
  const slotsByHall = {};
  for (const slot of slots) {
    const key = String(slot.hall);
    if (!slotsByHall[key]) slotsByHall[key] = [];
    slotsByHall[key].push(slot);
  }
  for (const hall of halls) {
    const key = String(hall.venue);
    if (!hallsByVenue[key]) hallsByVenue[key] = [];
    hallsByVenue[key].push(hall);
  }

  const date = String(q.date || '');
  const slotType = String(q.slotType || '');
  const hasDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
  const availability = hasDate ? await hallAvailabilityByDate(hallIds, date, slotType) : null;

  const minCapacity = Number(q.minCapacity || q.guests);
  const maxPrice = Number(q.maxPrice);
  const minPrice = Number(q.minPrice);
  const expectedGuests = Number(q.expectedGuests || q.guests);
  const remainingBudget = Number(q.remainingBudget);
  const estimatedBudget = Number(q.estimatedBudget);

  let presented = venues.map((venue) => {
    const venueHalls = hallsByVenue[String(venue._id)] || [];
    const venueSlots = venueHalls.flatMap((hall) => slotsByHall[String(hall._id)] || []);
    const card = presentVenue(venue, venueHalls, venueSlots);
    const capacityOk = !Number.isFinite(minCapacity) || minCapacity <= 0
      ? true
      : (card.capacityMax != null && card.capacityMax >= minCapacity);
    const unknownCapacity = card.capacityMax == null;
    let dateAvailable = null;
    if (availability) {
      dateAvailable = venueHalls.some((hall) => availability.hallAvailable(hall._id));
    }
    const budgetCeiling = Number.isFinite(remainingBudget) ? remainingBudget
      : Number.isFinite(estimatedBudget) ? estimatedBudget
        : null;
    let budgetMatch = 'unknown';
    if (card.quoteRequired || card.priceAmount == null) budgetMatch = 'quote';
    else if (budgetCeiling != null) budgetMatch = card.priceAmount <= budgetCeiling ? 'within' : 'over';

    let capacityMatch = 'unknown';
    if (Number.isFinite(expectedGuests) && expectedGuests > 0) {
      if (card.capacityMax == null) capacityMatch = 'unknown';
      else capacityMatch = card.capacityMax >= expectedGuests ? 'suitable' : 'not_suitable';
    }

    return {
      ...card,
      dateAvailable,
      match: {
        capacity: capacityMatch,
        availability: dateAvailable == null ? 'unknown' : dateAvailable ? 'available' : 'booked',
        budget: budgetMatch,
      },
      _filter: { capacityOk: unknownCapacity || capacityOk, dateAvailable, priceAmount: card.priceAmount, quoteRequired: card.quoteRequired },
    };
  });

  if (Number.isFinite(minCapacity) && minCapacity > 0) {
    presented = presented.filter((venue) => venue._filter.capacityOk);
  }
  if (hasDate) {
    presented = presented.filter((venue) => venue._filter.dateAvailable);
  }
  if (slotType && ['morning', 'evening', 'full_day'].includes(slotType) && !hasDate) {
    presented = presented.filter((venue) => (venue.halls || []).length > 0);
  }
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    presented = presented.filter((venue) => {
      if (venue._filter.quoteRequired || venue._filter.priceAmount == null) return false;
      if (Number.isFinite(minPrice) && venue._filter.priceAmount < minPrice) return false;
      if (Number.isFinite(maxPrice) && venue._filter.priceAmount > maxPrice) return false;
      return true;
    });
  }

  presented.sort((left, right) => {
    const guestScore = (venue) => {
      if (!Number.isFinite(expectedGuests) || expectedGuests <= 0) return 0;
      if (venue.match.capacity === 'suitable') return 2;
      if (venue.match.capacity === 'unknown') return 1;
      return 0;
    };
    const availScore = (venue) => (venue.match.availability === 'available' ? 2 : venue.match.availability === 'unknown' ? 1 : 0);
    const budgetScore = (venue) => (venue.match.budget === 'within' ? 2 : venue.match.budget === 'quote' || venue.match.budget === 'unknown' ? 1 : 0);
    const score = (venue) => guestScore(venue) * 100 + availScore(venue) * 10 + budgetScore(venue);
    return score(right) - score(left);
  });

  const districts = [...new Set(
    presented.map((venue) => venue.district).filter(Boolean),
  )].sort((a, b) => a.localeCompare(b));

  res.json({
    success: true,
    count: presented.length,
    meta: { districts },
    venues: presented.map(({ _filter, ...venue }) => venue),
  });
});

export const getVenue = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid venue ID');
  }
  const venue = await Venue.findById(req.params.id).populate('vendorProfile', 'businessName phone email city verificationStatus verified active');
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const halls = await Hall.find({ venue: venue._id }).sort({ hallName: 1 }).lean();
  const slots = await HallSlot.find({ hall: { $in: halls.map((hall) => hall._id) }, active: true }).lean();
  const slotsByHall = {};
  for (const slot of slots) {
    const key = String(slot.hall);
    if (!slotsByHall[key]) slotsByHall[key] = [];
    slotsByHall[key].push(slot);
  }
  const presented = presentVenue(venue.toObject(), halls, slots);
  const hallsWithSlots = halls.map((hall) => ({
    ...hall,
    slots: slotsByHall[String(hall._id)] || [],
    quoteRequired: hall.priceStatus === 'quote_required' || (slotsByHall[String(hall._id)] || []).some((slot) => slot.quoteRequired),
    acceptsQuotes: presented.acceptsQuotes,
  }));
  res.json({ success: true, venue: presented, halls: hallsWithSlots });
});

export const listHalls = asyncHandler(async (req, res) => {
  const filter = { status: 'active' };
  if (req.query.city) {
    const venues = await Venue.find({
      status: 'active',
      city: new RegExp(escapeRegex(req.query.city), 'i'),
    }).select('_id');
    filter.venue = { $in: venues.map((venue) => venue._id) };
  }
  if (req.query.search) {
    const search = new RegExp(escapeRegex(req.query.search), 'i');
    filter.$or = [{ hallName: search }, { description: search }];
  }
  const halls = await Hall.find(filter)
    .populate('venue', 'name city district address location images coverImage imageIsPlaceholder imageSource priceStatus')
    .sort({ hallName: 1 });
  res.json({ success: true, halls });
});

export const getHall = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid hall ID');
  }
  const hall = await Hall.findById(req.params.id).populate('venue');
  if (!hall) {
    res.status(404);
    throw new Error('Hall not found');
  }
  const slots = await HallSlot.find({ hall: hall._id, active: true });
  const fallback = hall.vendor && hall.priceStatus !== 'quote_required' ? defaultSlots() : quoteSlots();
  res.json({ success: true, hall, slots: slots.length ? slots : fallback });
});

export const getMyVenues = asyncHandler(async (req, res) => {
  const venues = await Venue.find({ vendor: req.user._id }).sort({ createdAt: -1 });
  const halls = await Hall.find({ vendor: req.user._id }).sort({ hallName: 1 });
  res.json({ success: true, venues, halls });
});

export const createVenue = asyncHandler(async (req, res) => {
  const profile = await requireVendorProfile(req, res);
  const data = {
    vendor: req.user._id,
    vendorProfile: profile._id,
    ownershipStatus: 'claimed',
    verified: false,
    featured: false,
    priceStatus: req.body.priceStatus || 'quote_required',
  };
  for (const field of venueFields) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (!data.name || !data.city) {
    res.status(400);
    throw new Error('Venue name and city are required');
  }
  const venue = await Venue.create(data);
  res.status(201).json({ success: true, venue });
});

export const updateVenue = asyncHandler(async (req, res) => {
  const venue = mongoose.isValidObjectId(req.params.id) ? await Venue.findById(req.params.id) : null;
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  assertOwner(venue, req, res);
  for (const field of venueFields) {
    if (req.body[field] !== undefined) venue[field] = req.body[field];
  }
  await venue.save();
  res.json({ success: true, venue });
});

export const createHall = asyncHandler(async (req, res) => {
  const venue = mongoose.isValidObjectId(req.params.id) ? await Venue.findById(req.params.id) : null;
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  assertOwner(venue, req, res);
  const data = { venue: venue._id, vendor: venue.vendor || null };
  for (const field of hallFields) {
    if (req.body[field] !== undefined) data[field] = req.body[field];
  }
  if (!data.hallName || !data.capacity) {
    res.status(400);
    throw new Error('Hall name and capacity are required');
  }
  // Professional quote workflow: halls are created without fixed slot prices.
  data.priceStatus = 'quote_required';
  data.morningPrice = null;
  data.eveningPrice = null;
  data.fullDayPrice = null;
  data.deposit = null;
  const hall = await Hall.create(data);
  const sourceSlots = Array.isArray(req.body.slots) && req.body.slots.length
    ? req.body.slots
    : quoteSlots();
  const slots = sourceSlots.map((slot) => ({
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

export const updateHall = asyncHandler(async (req, res) => {
  const hall = mongoose.isValidObjectId(req.params.id) ? await Hall.findById(req.params.id) : null;
  if (!hall) {
    res.status(404);
    throw new Error('Hall not found');
  }
  assertOwner(hall, req, res);
  for (const field of hallFields) {
    if (req.body[field] !== undefined) hall[field] = req.body[field];
  }
  await hall.save();
  res.json({ success: true, hall });
});

export const upsertHallSlots = asyncHandler(async (req, res) => {
  const hall = mongoose.isValidObjectId(req.params.id) ? await Hall.findById(req.params.id) : null;
  if (!hall) {
    res.status(404);
    throw new Error('Hall not found');
  }
  assertOwner(hall, req, res);
  if (!Array.isArray(req.body.slots) || !req.body.slots.length) {
    res.status(400);
    throw new Error('Provide at least one slot configuration');
  }
  await HallSlot.deleteMany({ hall: hall._id });
  const slots = await HallSlot.insertMany(req.body.slots.map((slot) => ({
    ...slot,
    hall: hall._id,
    vendor: hall.vendor,
  })));
  res.json({ success: true, slots });
});
