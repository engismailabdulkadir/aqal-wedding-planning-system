import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Hall from '../models/Hall.js';
import HallBooking from '../models/HallBooking.js';
import HallQuote from '../models/HallQuote.js';
import HallSlotLock from '../models/HallSlotLock.js';
import Order from '../models/Order.js';
import Wedding from '../models/Wedding.js';
import { createHttpError } from '../utils/httpErrors.js';
import { notify, notifyAdmins } from '../utils/notify.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { evaluateBudgetCommitment } from '../utils/budgetValidation.js';
import { validateHallCapacity } from '../utils/hallValidation.js';
import { slotsForHall } from '../utils/hallReplacement.js';
import {
  acquireSlotLocks,
  blocksSlot,
  expireStaleHolds,
  findOverlappingBookings,
  HOLD_MINUTES,
  slotSchedule,
} from '../utils/hallOccupancy.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';
import { resolveVenueQuoteReadiness, QUOTE_UNAVAILABLE_MESSAGE } from '../utils/venueQuoteReadiness.js';
import Venue from '../models/Venue.js';

const populate = [
  { path: 'customer', select: 'firstName lastName username phone email' },
  { path: 'wedding', select: 'weddingName partner1Name partner2Name weddingDate expectedGuests estimatedBudget city' },
  { path: 'venue', select: 'name city district' },
  { path: 'hall', select: 'hallName capacity' },
  { path: 'vendor', select: 'firstName lastName' },
  { path: 'quotedBy', select: 'firstName lastName role' },
  { path: 'hallBooking', select: 'status paymentStatus basePrice depositRequired amountPaid balance holdExpiresAt' },
];

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function assertQuoteAmounts(totalPrice, requiredDeposit) {
  const total = roundMoney(totalPrice);
  const deposit = roundMoney(requiredDeposit);
  if (!(total > 0)) {
    throw createHttpError('Total booking price must be greater than 0.', { statusCode: 400, field: 'totalPrice' });
  }
  if (deposit < 0) {
    throw createHttpError('Required deposit cannot be negative.', { statusCode: 400, field: 'requiredDeposit' });
  }
  if (deposit > total) {
    throw createHttpError('Required deposit cannot exceed the total booking price.', {
      statusCode: 400,
      field: 'requiredDeposit',
      code: 'DEPOSIT_EXCEEDS_TOTAL',
    });
  }
  return { total, deposit };
}

async function loadAccessibleQuote(req, quoteId) {
  if (!mongoose.isValidObjectId(quoteId)) {
    throw createHttpError('Quote not found', { statusCode: 404 });
  }
  const quote = await HallQuote.findById(quoteId).populate(populate);
  if (!quote) throw createHttpError('Quote not found', { statusCode: 404 });

  const role = req.user.role;
  if (role === 'admin') return quote;
  if (role === 'customer' && String(quote.customer._id || quote.customer) === String(req.user._id)) return quote;
  if (role === 'vendor' && String(quote.vendor._id || quote.vendor) === String(req.user._id)) return quote;
  throw createHttpError('You do not have access to this quote', { statusCode: 403 });
}

async function expireStaleQuotes() {
  const now = new Date();
  await HallQuote.updateMany(
    { status: 'quoted', expiresAt: { $ne: null, $lte: now } },
    { $set: { status: 'expired' } },
  );
}

export const requestHallQuote = asyncHandler(async (req, res) => {
  await expireStaleQuotes();
  if (req.user.role !== 'customer') {
    throw createHttpError('Only customers can request a hall quote', { statusCode: 403 });
  }
  const wedding = await resolveOwnedWedding(req, res);
  const { hall: hallId, slotType, customerMessage = '' } = req.body;
  if (!mongoose.isValidObjectId(hallId) || !slotType) {
    throw createHttpError('Hall and slot type are required', { statusCode: 400 });
  }

  const hall = await Hall.findOne({ _id: hallId, status: 'active' });
  if (!hall) throw createHttpError('Hall not found', { statusCode: 404 });
  const venue = await Venue.findById(hall.venue).populate('vendorProfile', 'businessName verificationStatus verified active');
  const quoteReadiness = await resolveVenueQuoteReadiness(venue || { vendor: hall.vendor });
  if (!quoteReadiness.acceptsQuotes) {
    throw createHttpError(QUOTE_UNAVAILABLE_MESSAGE, {
      statusCode: 409,
      code: 'VENUE_QUOTES_UNAVAILABLE',
    });
  }

  validateHallCapacity(wedding, hall);

  const bookingDate = wedding.weddingDate
    ? new Date(new Date(wedding.weddingDate).getTime() - new Date(wedding.weddingDate).getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10)
    : null;
  if (!bookingDate) {
    throw createHttpError('Set a wedding date before requesting a hall quote.', { statusCode: 400, field: 'weddingDate' });
  }

  const slots = await slotsForHall(hall._id, hall);
  const slot = slots.find((item) => item.slotType === slotType);
  if (!slot) throw createHttpError('Invalid slot for this hall', { statusCode: 400 });

  await expireStaleHolds();
  const schedule = slotSchedule(bookingDate, slot);
  const overlapping = await findOverlappingBookings(hall._id, schedule.occupancyStart, schedule.occupancyEnd);
  if (overlapping.some((booking) => blocksSlot(booking.slotType, slotType))) {
    throw createHttpError('This hall slot is no longer available on your wedding date.', {
      statusCode: 409,
      code: 'HALL_SLOT_UNAVAILABLE',
      details: { hallId: hall._id, hallName: hall.hallName, date: bookingDate, slotType },
    });
  }

  const existing = await HallQuote.findOne({
    wedding: wedding._id,
    hall: hall._id,
    bookingDate,
    slotType,
    status: { $in: ['pending', 'quoted'] },
  });
  if (existing) {
    await existing.populate(populate);
    return res.status(200).json({ success: true, quote: existing, message: 'An open quote request already exists for this hall and slot.' });
  }

  const quote = await HallQuote.create({
    customer: req.user._id,
    wedding: wedding._id,
    venue: hall.venue,
    hall: hall._id,
    vendor: hall.vendor,
    bookingDate,
    slotType,
    guestCount: Number(wedding.expectedGuests || 0),
    status: 'pending',
    customerMessage: String(customerMessage || '').trim(),
  });

  await quote.populate(populate);
  await notify(hall.vendor, {
    title: 'New hall quote request',
    message: `${wedding.weddingName || 'A wedding'} requested a quote for ${hall.hallName} (${slotType}) on ${bookingDate}.`,
    type: 'new_booking',
    link: '/vendor/quotes',
    wedding: wedding._id,
  });
  await notifyAdmins({
    title: 'Hall quote requested',
    message: `${req.user.firstName} requested a quote for ${hall.hallName}.`,
    type: 'system',
    link: '/admin/quotes',
    wedding: wedding._id,
  });

  res.status(201).json({ success: true, quote });
});

export const listHallQuotes = asyncHandler(async (req, res) => {
  await expireStaleQuotes();
  const filter = {};
  if (req.user.role === 'customer') filter.customer = req.user._id;
  else if (req.user.role === 'vendor') filter.vendor = req.user._id;
  else if (req.user.role !== 'admin') {
    throw createHttpError('Forbidden', { statusCode: 403 });
  }
  if (req.query.status) filter.status = String(req.query.status);
  if (mongoose.isValidObjectId(req.query.weddingId)) filter.wedding = req.query.weddingId;

  const quotes = await HallQuote.find(filter).populate(populate).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, quotes });
});

export const getHallQuote = asyncHandler(async (req, res) => {
  await expireStaleQuotes();
  const quote = await loadAccessibleQuote(req, req.params.id);
  res.json({ success: true, quote });
});

export const submitHallQuote = asyncHandler(async (req, res) => {
  await expireStaleQuotes();
  if (!['vendor', 'admin'].includes(req.user.role)) {
    throw createHttpError('Only vendors or admins can submit hall quotes', { statusCode: 403 });
  }
  const quote = await loadAccessibleQuote(req, req.params.id);
  if (!['pending', 'quoted'].includes(quote.status)) {
    throw createHttpError('Only pending or quoted requests can be priced.', { statusCode: 409 });
  }

  const { total, deposit } = assertQuoteAmounts(req.body.totalPrice, req.body.requiredDeposit ?? 0);
  const notes = String(req.body.notes || '').trim();
  let expiresAt = null;
  if (req.body.expiresAt) {
    const parsed = new Date(req.body.expiresAt);
    if (Number.isNaN(parsed.getTime())) {
      throw createHttpError('Invalid quote expiry date', { statusCode: 400, field: 'expiresAt' });
    }
    expiresAt = parsed;
  }

  quote.totalPrice = total;
  quote.requiredDeposit = deposit;
  quote.notes = notes;
  quote.expiresAt = expiresAt;
  quote.status = 'quoted';
  quote.quotedBy = req.user._id;
  quote.quotedAt = new Date();
  await quote.save();
  await quote.populate(populate);

  await notify(quote.customer._id || quote.customer, {
    title: 'Hall quote received',
    message: `Your quote for ${quote.hall?.hallName || 'the hall'} is ready: $${total} (deposit $${deposit}).`,
    type: 'system',
    link: '/quotes',
    wedding: quote.wedding._id || quote.wedding,
  });

  res.json({ success: true, quote, message: 'Quote sent to customer.' });
});

export const rejectHallQuote = asyncHandler(async (req, res) => {
  const quote = await loadAccessibleQuote(req, req.params.id);
  if (req.user.role !== 'customer') {
    throw createHttpError('Only the customer can reject a quote', { statusCode: 403 });
  }
  if (!['pending', 'quoted'].includes(quote.status)) {
    throw createHttpError('This quote can no longer be rejected.', { statusCode: 409 });
  }
  quote.status = 'rejected';
  quote.rejectedAt = new Date();
  await quote.save();
  await quote.populate(populate);
  await notify(quote.vendor._id || quote.vendor, {
    title: 'Hall quote rejected',
    message: `${quote.customer?.firstName || 'Customer'} rejected the quote for ${quote.hall?.hallName || 'a hall'}.`,
    type: 'system',
    link: '/vendor/quotes',
    wedding: quote.wedding._id || quote.wedding,
  });
  res.json({ success: true, quote });
});

export const cancelHallQuote = asyncHandler(async (req, res) => {
  const quote = await loadAccessibleQuote(req, req.params.id);
  if (req.user.role === 'customer' && String(quote.customer._id || quote.customer) !== String(req.user._id)) {
    throw createHttpError('Forbidden', { statusCode: 403 });
  }
  if (!['pending', 'quoted'].includes(quote.status)) {
    throw createHttpError('This quote can no longer be cancelled.', { statusCode: 409 });
  }
  quote.status = 'cancelled';
  await quote.save();
  await quote.populate(populate);
  res.json({ success: true, quote });
});

export const acceptHallQuote = asyncHandler(async (req, res) => {
  await expireStaleQuotes();
  await expireStaleHolds();
  if (req.user.role !== 'customer') {
    throw createHttpError('Only the customer can accept a quote', { statusCode: 403 });
  }

  const quote = await HallQuote.findById(req.params.id);
  if (!quote) throw createHttpError('Quote not found', { statusCode: 404 });
  if (String(quote.customer) !== String(req.user._id)) {
    throw createHttpError('Forbidden', { statusCode: 403 });
  }
  if (quote.status !== 'quoted') {
    throw createHttpError('Only a submitted quote can be accepted.', { statusCode: 409 });
  }
  if (quote.expiresAt && quote.expiresAt <= new Date()) {
    quote.status = 'expired';
    await quote.save();
    throw createHttpError('This quote has expired. Request a new quote.', { statusCode: 409, code: 'QUOTE_EXPIRED' });
  }

  const { total, deposit } = assertQuoteAmounts(quote.totalPrice, quote.requiredDeposit ?? 0);
  const wedding = await Wedding.findById(quote.wedding);
  if (!wedding || String(wedding.customer) !== String(req.user._id)) {
    throw createHttpError('Wedding not found', { statusCode: 404 });
  }

  const hall = await Hall.findOne({ _id: quote.hall, status: 'active' });
  if (!hall || !hall.vendor) throw createHttpError('Hall is no longer available', { statusCode: 409 });
  validateHallCapacity(wedding, hall);

  const slots = await slotsForHall(hall._id, hall);
  const slot = slots.find((item) => item.slotType === quote.slotType);
  if (!slot) throw createHttpError('Invalid slot for this hall', { statusCode: 400 });

  const bookingDate = quote.bookingDate;
  const schedule = slotSchedule(bookingDate, slot);
  const overlapping = await findOverlappingBookings(hall._id, schedule.occupancyStart, schedule.occupancyEnd);
  if (overlapping.some((booking) => blocksSlot(booking.slotType, quote.slotType))) {
    throw createHttpError('This hall slot is no longer available. Request a new quote for another slot or date.', {
      statusCode: 409,
      code: 'HALL_SLOT_UNAVAILABLE',
    });
  }

  await evaluateBudgetCommitment(wedding, total, {
    allowOverBudget: req.body.confirmOverBudget === true,
    category: 'hall',
  });

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  let locks;
  try {
    locks = await acquireSlotLocks({
      hallId: hall._id,
      date: bookingDate,
      slotType: quote.slotType,
      expiresAt: holdExpiresAt,
    });
  } catch (error) {
    if (error.statusCode === 409) throw error;
    throw error;
  }

  try {
    const booking = await HallBooking.create({
      customer: req.user._id,
      wedding: wedding._id,
      venue: hall.venue,
      hall: hall._id,
      vendor: hall.vendor,
      bookingDate,
      slotType: quote.slotType,
      startDateTime: schedule.startDateTime,
      endDateTime: schedule.endDateTime,
      occupancyStart: schedule.occupancyStart,
      occupancyEnd: schedule.occupancyEnd,
      basePrice: total,
      depositRequired: deposit,
      agreedTotalAmount: total,
      quotedTotal: total,
      requiredDeposit: deposit,
      quote: quote._id,
      amountPaid: 0,
      balance: total,
      status: 'held',
      holdExpiresAt,
      paymentStatus: 'unpaid',
      notes: quote.notes || '',
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
      amount: total,
      depositRequired: deposit,
      amountPaid: 0,
      balance: total,
      status: 'pending',
      paymentStatus: 'unpaid',
      eventDate: schedule.startDateTime,
    });

    wedding.selectedVenue = hall.venue;
    wedding.selectedHall = hall._id;
    wedding.selectedSlot = quote.slotType;
    await wedding.save();

    quote.status = 'accepted';
    quote.acceptedAt = new Date();
    quote.hallBooking = booking._id;
    await quote.save();

    await booking.populate([
      { path: 'venue', select: 'name city district address' },
      { path: 'hall', select: 'hallName capacity venue' },
      { path: 'vendor', select: 'firstName lastName' },
    ]);
    await quote.populate(populate);

    await notify(hall.vendor, {
      title: 'Hall quote accepted',
      message: `${wedding.weddingName || 'Customer'} accepted the $${total} quote for ${hall.hallName}.`,
      type: 'new_booking',
      link: '/vendor/orders',
      wedding: wedding._id,
    });
    await syncWeddingTimelineSafe(wedding._id);

    res.status(201).json({
      success: true,
      quote,
      booking,
      holdMinutes: HOLD_MINUTES,
      message: 'Quote accepted. Complete deposit or full payment to confirm the booking.',
    });
  } catch (error) {
    if (locks?.length) await HallSlotLock.deleteMany({ _id: { $in: locks.map((lock) => lock._id) } });
    throw error;
  }
});
