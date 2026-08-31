import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Hall from '../models/Hall.js';
import HallBooking from '../models/HallBooking.js';
import HallSlotLock from '../models/HallSlotLock.js';
import Order from '../models/Order.js';
import Venue from '../models/Venue.js';
import Wedding from '../models/Wedding.js';
import { resolveOwnedWedding, resolveWeddingForCustomerEdit } from '../utils/ownedWedding.js';
import { canAccessWeddingAsCustomer } from '../utils/weddingMembership.js';
import { bookingOwnerFromUserRole, isCoupleRole } from '../utils/roles.js';
import { notify } from '../utils/notify.js';
import { evaluateBudgetCommitment } from '../utils/budgetValidation.js';
import { buildHallRecommendations, hallCapacityStatus, validateHallCapacity } from '../utils/hallValidation.js';
import {
  applyHallChange,
  currentHallBooking,
  previewHallChange,
  slotsForHall,
} from '../utils/hallReplacement.js';
import {
  acquireSlotLocks,
  blocksSlot,
  expireStaleHolds,
  findOverlappingBookings,
  HOLD_MINUTES,
  lockKeysForSlot,
  releaseLocks,
  slotSchedule,
} from '../utils/hallOccupancy.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';
import { resolveVenueQuoteReadiness } from '../utils/venueQuoteReadiness.js';

const populate = [
  { path: 'venue', select: 'name city district address' },
  { path: 'hall', select: 'hallName capacity venue' },
  { path: 'vendor', select: 'firstName lastName' },
];

async function slotBlocker(hallId, date, slotType, excludeBookingId = null) {
  const now = new Date();
  const bookings = await HallBooking.find({
    hall: hallId,
    bookingDate: date,
    status: { $in: ['pending', 'held', 'confirmed'] },
  });
  return bookings.find((booking) => {
    if (excludeBookingId && String(booking._id) === String(excludeBookingId)) return false;
    if (booking.status === 'held' && booking.holdExpiresAt && booking.holdExpiresAt <= now) return false;
    return blocksSlot(booking.slotType, slotType);
  }) || null;
}

function slotStatus(booking) {
  if (!booking) return 'available';
  if (booking.status === 'held') return 'held';
  return 'booked';
}

export const getHallAvailability = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400);
    throw new Error('Provide date as YYYY-MM-DD');
  }
  const hall = mongoose.isValidObjectId(req.params.id) ? await Hall.findById(req.params.id) : null;
  if (!hall || hall.status !== 'active') {
    res.status(404);
    throw new Error('Hall not found');
  }
  const slots = await slotsForHall(hall._id);
  const data = [];
  const excludeBookingId = mongoose.isValidObjectId(req.query.excludeBookingId) ? req.query.excludeBookingId : null;
  for (const slot of slots) {
    const schedule = slotSchedule(date, slot);
    const blocker = await slotBlocker(hall._id, date, slot.slotType, excludeBookingId);
    const state = slotStatus(blocker);
    data.push({
      slot: slot.slotType,
      name: slot.name,
      startTime: slot.startTime,
      endTime: slot.endTime,
      overnight: Boolean(slot.overnight),
      price: slot.price,
      deposit: slot.deposit,
      available: state === 'available',
      status: state,
      holdExpiresAt: blocker?.status === 'held' ? blocker.holdExpiresAt : null,
      quoteRequired: Boolean(slot.quoteRequired || hall.priceStatus === 'quote_required'),
      bookable: Boolean(hall.vendor) && !slot.quoteRequired && Number(slot.price) > 0,
      requestable: Boolean(hall.vendor) && state === 'available',
    });
  }
  res.json({ success: true, data: { hallId: hall._id, hallName: hall.hallName, date, slots: data } });
});

export const getVenueAvailability = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400);
    throw new Error('Provide date as YYYY-MM-DD');
  }
  const venue = mongoose.isValidObjectId(req.params.id)
    ? await Venue.findById(req.params.id).populate('vendorProfile', 'businessName verificationStatus verified active')
    : null;
  if (!venue) {
    res.status(404);
    throw new Error('Venue not found');
  }
  const quoteReadiness = await resolveVenueQuoteReadiness(venue);
  const acceptsQuotes = quoteReadiness.acceptsQuotes;
  const halls = await Hall.find({ venue: venue._id, status: 'active' }).sort({ hallName: 1 });
  const expectedGuests = Number(req.query.expectedGuests);
  const weddingBudget = Number(req.query.estimatedBudget);
  const excludeBookingId = mongoose.isValidObjectId(req.query.excludeBookingId) ? req.query.excludeBookingId : null;
  const hasGuestContext = Number.isFinite(expectedGuests) && expectedGuests > 0;
  const grid = [];
  for (const hall of halls) {
    const slots = await slotsForHall(hall._id);
    const slotStates = {};
    for (const slot of slots) {
      const blocker = await slotBlocker(hall._id, date, slot.slotType, excludeBookingId);
      const state = slotStatus(blocker);
      const quoteRequired = Boolean(slot.quoteRequired || hall.priceStatus === 'quote_required');
      slotStates[slot.slotType] = {
        slot: slot.slotType,
        name: slot.name,
        available: state === 'available',
        status: state,
        price: slot.price,
        deposit: slot.deposit,
        holdExpiresAt: blocker?.status === 'held' ? blocker.holdExpiresAt : null,
        quoteRequired,
        bookable: acceptsQuotes && Boolean(hall.vendor) && !quoteRequired && Number(slot.price) > 0 && state === 'available',
        requestable: acceptsQuotes && Boolean(hall.vendor) && state === 'available',
      };
    }
    grid.push({
      hallId: hall._id,
      hallName: hall.hallName,
      capacity: hall.capacity,
      minimumCapacity: hall.minimumCapacity || null,
      facilities: hall.facilities || [],
      description: hall.description || '',
      bookable: acceptsQuotes && Boolean(hall.vendor),
      acceptsQuotes,
      quoteRequired: hall.priceStatus === 'quote_required',
      capacityStatus: hasGuestContext ? hallCapacityStatus(expectedGuests, hall) : { suitable: true, issue: null },
      slots: slotStates,
    });
  }
  const recommendations = hasGuestContext && acceptsQuotes
    ? buildHallRecommendations(grid, expectedGuests, { budget: Number.isFinite(weddingBudget) ? weddingBudget : null })
    : [];
  res.json({
    success: true,
    venue: {
      _id: venue._id,
      name: venue.name,
      city: venue.city,
      bookable: acceptsQuotes && Boolean(venue.vendor),
      acceptsQuotes,
      quoteUnavailableReason: quoteReadiness.quoteUnavailableReason,
    },
    date,
    expectedGuests: hasGuestContext ? expectedGuests : null,
    halls: grid,
    recommendations,
  });
});

export const holdHallBooking = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Only Groom or Bride accounts can reserve a hall');
  }
  const wedding = await resolveOwnedWedding(req, res);
  const { hall: hallId, date, slotType } = req.body;
  if (!mongoose.isValidObjectId(hallId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !slotType) {
    res.status(400);
    throw new Error('Hall, date, and slot type are required');
  }
  const hall = await Hall.findOne({ _id: hallId, status: 'active' });
  if (!hall) {
    res.status(404);
    throw new Error('Hall not found');
  }
  if (!hall.vendor) {
    const err = new Error('This venue is not yet available for online booking. Please request a quote.');
    err.statusCode = 409;
    err.code = 'VENUE_UNCLAIMED';
    throw err;
  }
  validateHallCapacity(wedding, hall);
  const slots = await slotsForHall(hall._id, hall);
  const slot = slots.find((item) => item.slotType === slotType);
  if (!slot) {
    res.status(400);
    throw new Error('Invalid slot for this hall');
  }
  if (slot.quoteRequired || Number(slot.price) <= 0) {
    const err = new Error('Pricing is available on request. Contact the venue before reserving.');
    err.statusCode = 409;
    err.code = 'QUOTE_REQUIRED';
    throw err;
  }
  const schedule = slotSchedule(date, slot);
  const overlapping = await findOverlappingBookings(hall._id, schedule.occupancyStart, schedule.occupancyEnd);
  const slotConflict = overlapping.some((booking) => blocksSlot(booking.slotType, slotType));
  if (slotConflict) {
    const err = new Error('This hall slot is no longer available');
    err.statusCode = 409;
    err.code = 'HALL_SLOT_UNAVAILABLE';
    err.details = { hallId: hall._id, hallName: hall.hallName, date, slotType };
    throw err;
  }

  await evaluateBudgetCommitment(wedding, slot.price, { allowOverBudget: req.body.confirmOverBudget === true, category: 'hall' });

  const keys = lockKeysForSlot(slotType);
  if (slotType === 'full_day') {
    const extraLocks = await HallSlotLock.find({
      hall: hall._id,
      date,
      slotKey: { $in: ['morning', 'evening'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
    if (extraLocks.length) {
      const err = new Error('This hall slot is no longer available');
      err.statusCode = 409;
      err.code = 'HALL_SLOT_UNAVAILABLE';
      err.details = { hallId: hall._id, hallName: hall.hallName, date, slotType };
      throw err;
    }
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  let locks;
  try {
    locks = await acquireSlotLocks({
      hallId: hall._id,
      date,
      slotType,
      expiresAt: holdExpiresAt,
    });
  } catch (error) {
    if (error.statusCode === 409) {
      res.status(409);
      throw error;
    }
    throw error;
  }

  try {
    const booking = await HallBooking.create({
      customer: req.user._id,
      wedding: wedding._id,
      venue: hall.venue,
      hall: hall._id,
      vendor: hall.vendor,
      bookingDate: date,
      slotType,
      startDateTime: schedule.startDateTime,
      endDateTime: schedule.endDateTime,
      occupancyStart: schedule.occupancyStart,
      occupancyEnd: schedule.occupancyEnd,
      basePrice: slot.price,
      depositRequired: slot.deposit,
      amountPaid: 0,
      balance: slot.price,
      status: 'held',
      holdExpiresAt,
      paymentStatus: 'unpaid',
      bookingOwner: 'shared',
      bookedBy: req.user._id,
    });
    await HallSlotLock.updateMany({ _id: { $in: locks.map((lock) => lock._id) } }, { $set: { booking: booking._id } });

    await Order.create({
      customer: req.user._id,
      wedding: wedding._id,
      vendor: hall.vendor,
      booking: booking._id,
      category: 'hall',
      itemName: `${hall.hallName} (${slot.name})`,
      quantity: 1,
      amount: slot.price,
      depositRequired: slot.deposit,
      amountPaid: 0,
      balance: slot.price,
      status: 'pending',
      paymentStatus: 'unpaid',
      eventDate: schedule.startDateTime,
    });

    wedding.selectedVenue = hall.venue;
    wedding.selectedHall = hall._id;
    wedding.selectedSlot = slotType;
    wedding.weddingDate = schedule.startDateTime;
    await wedding.save();

    await booking.populate(populate);
    await notify(hall.vendor, {
      title: 'Temporary hall hold',
      message: `${hall.hallName} was reserved pending payment.`,
      type: 'new_booking',
      link: '/vendor/orders',
      wedding: wedding._id,
    });
    await syncWeddingTimelineSafe(wedding._id);
    res.status(201).json({ success: true, booking, holdMinutes: HOLD_MINUTES });
  } catch (error) {
    if (locks?.length) await HallSlotLock.deleteMany({ _id: { $in: locks.map((lock) => lock._id) } });
    throw error;
  }
});

export const confirmHallBooking = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const bookingId = req.body.bookingId || req.body.id;
  const booking = mongoose.isValidObjectId(bookingId)
    ? await HallBooking.findOne({ _id: bookingId, customer: req.user._id })
    : null;
  if (!booking) {
    res.status(404);
    throw new Error('Hall booking not found');
  }
  if (booking.status !== 'held') {
    res.status(409);
    throw new Error('Only a held reservation can be confirmed');
  }
  if (booking.amountPaid < Number(booking.depositRequired || 0)) {
    res.status(409);
    throw new Error('Pay the required deposit before confirming this reservation');
  }
  if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
    booking.status = 'expired';
    await booking.save();
    await releaseLocks(booking._id);
    res.status(409);
    throw new Error('This hold has expired');
  }
  booking.status = 'confirmed';
  booking.holdExpiresAt = null;
  await booking.save();
  await HallSlotLock.updateMany({ booking: booking._id }, { $unset: { expiresAt: 1 } });
  await Order.updateMany({ booking: booking._id }, { $set: { status: 'confirmed' } });
  await booking.populate(populate);
  await syncWeddingTimelineSafe(booking.wedding);
  res.json({ success: true, booking });
});

export const replaceHallBooking = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const wedding = await resolveWeddingForCustomerEdit(req, res);
  const { hall: hallId, date, slotType } = req.body;
  if (!mongoose.isValidObjectId(hallId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !slotType) {
    res.status(400);
    throw new Error('Hall, date, and slot type are required');
  }
  const hall = await Hall.findOne({ _id: hallId, status: 'active' }).populate('venue', 'name city');
  if (!hall) {
    res.status(404);
    throw new Error('Hall not found');
  }
  const current = await currentHallBooking(wedding._id);
  const allowOverBudget = req.body.confirmOverBudget === true;
  const previewResult = await previewHallChange({
    wedding,
    currentBooking: current,
    hall,
    date,
    slotType,
    allowOverBudget,
  });
  if (req.body.preview === true || req.body.confirm !== true) {
    return res.json({
      success: true,
      preview: true,
      mode: previewResult.mode,
      ...previewResult.summary,
      budget: previewResult.budget,
    });
  }
  const result = await applyHallChange({
    wedding,
    customerId: wedding.customer,
    currentBooking: current,
    hall,
    date,
    slotType,
    allowOverBudget,
  });
  await result.booking.populate(populate);
  if (result.releasedBooking) await result.releasedBooking.populate(populate);
  await notify(hall.vendor, {
    title: result.releasedBooking ? 'Hall booking replaced' : 'Hall reserved',
    message: `${hall.hallName} was reserved for a wedding.`,
    type: 'new_booking',
    link: '/vendor/orders',
    wedding: wedding._id,
  });
  await syncWeddingTimelineSafe(wedding._id);
  res.status(current ? 200 : 201).json({
    success: true,
    booking: result.booking,
    releasedBooking: result.releasedBooking,
    summary: result.summary,
    budget: previewResult.budget,
    message: result.releasedBooking
      ? 'Hall booking replaced. Previous hall was released after the new reservation succeeded.'
      : 'Hall reserved.',
  });
});

export const cancelHallBooking = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const booking = mongoose.isValidObjectId(req.params.id)
    ? await HallBooking.findById(req.params.id)
    : null;
  if (!booking) {
    res.status(404);
    throw new Error('Hall booking not found');
  }
  const isOwner = booking.customer.equals(req.user._id);
  const isVendor = booking.vendor.equals(req.user._id);
  if (!isOwner && !isVendor && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You cannot cancel this booking');
  }
  if (!['held', 'pending', 'confirmed'].includes(booking.status)) {
    res.status(409);
    throw new Error('This booking cannot be cancelled');
  }
  booking.status = 'cancelled';
  await booking.save();
  await releaseLocks(booking._id);
  await Order.updateMany({ booking: booking._id, status: { $in: ['pending', 'confirmed'] } }, { $set: { status: 'cancelled' } });
  await booking.populate(populate);
  await syncWeddingTimelineSafe(booking.wedding);
  res.json({ success: true, booking });
});

export const listHallBookings = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const filter = {};
  if (isCoupleRole(req.user.role)) {
    const wedding = await resolveOwnedWedding(req, res, { required: false });
    if (wedding) filter.wedding = wedding._id;
    else return res.json({ success: true, bookings: [] });
  } else if (req.user.role === 'vendor') {
    filter.vendor = req.user._id;
  } else if (req.user.role === 'planner') {
    const weddingId = req.query.weddingId;
    if (!mongoose.isValidObjectId(weddingId)) {
      res.status(400);
      throw new Error('Select an assigned wedding');
    }
    const wedding = await Wedding.findOne({ _id: weddingId, planner: req.user._id });
    if (!wedding) {
      res.status(403);
      throw new Error('You can only view assigned weddings');
    }
    filter.wedding = wedding._id;
  } else if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not allowed');
  }
  const bookings = await HallBooking.find(filter).populate(populate).sort({ createdAt: -1 });
  res.json({ success: true, bookings });
});

export const getHallBooking = asyncHandler(async (req, res) => {
  await expireStaleHolds();
  const booking = mongoose.isValidObjectId(req.params.id) ? await HallBooking.findById(req.params.id).populate(populate) : null;
  if (!booking) {
    res.status(404);
    throw new Error('Hall booking not found');
  }
  const allowed = booking.customer.equals(req.user._id)
    || await canAccessWeddingAsCustomer(req.user._id, booking.wedding)
    || booking.vendor.equals(req.user._id)
    || req.user.role === 'admin'
    || (req.user.role === 'planner' && await Wedding.exists({ _id: booking.wedding, planner: req.user._id }));
  if (!allowed) {
    res.status(403);
    throw new Error('You cannot view this booking');
  }
  res.json({ success: true, booking });
});
