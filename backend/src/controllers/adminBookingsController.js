import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Booking from '../models/Booking.js';
import BookingHistory from '../models/BookingHistory.js';
import HallBooking from '../models/HallBooking.js';
import Order from '../models/Order.js';
import RentalBooking from '../models/RentalBooking.js';
import Wedding from '../models/Wedding.js';
import { createHttpError } from '../utils/httpErrors.js';
import { expireStaleHolds, releaseLocks } from '../utils/hallOccupancy.js';
import { assertSlotAvailable } from '../utils/hallReplacement.js';
import { notify } from '../utils/notify.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';

const CATEGORY_TO_TYPE = {
  hall: 'hall',
  bridal_salon: 'salon',
  groom_salon: 'salon',
  hair: 'salon',
  makeup: 'makeup',
  photography: 'photography',
  videography: 'videography',
  transportation: 'transport',
  bride_dress: 'dress_rental',
  bride_shoes: 'dress_rental',
  accessories: 'dress_rental',
  groom_attire: 'suit_rental',
  groom_shoes: 'suit_rental',
};

function bookingTypeFromCategory(category) {
  return CATEGORY_TO_TYPE[category] || 'service';
}

function refCode(source, id) {
  const suffix = String(id).slice(-5).toUpperCase();
  const prefix = { hall: 'BK-H', appointment: 'BK-A', rental: 'BK-R', legacy: 'BK-L' }[source] || 'BK';
  return `${prefix}${suffix}`;
}

function composeId(source, id) {
  return `${source}:${id}`;
}

function parseComposeId(value) {
  const [source, id] = String(value || '').split(':');
  if (!['hall', 'appointment', 'rental', 'legacy'].includes(source) || !mongoose.isValidObjectId(id)) {
    return null;
  }
  return { source, id };
}

function personName(user) {
  if (!user) return '—';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '—';
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function recordHistory({ source, bookingId, wedding, action, oldStatus, newStatus, performedBy, notes = '' }) {
  await BookingHistory.create({
    source,
    bookingId,
    wedding: wedding || null,
    action,
    oldStatus: oldStatus || null,
    newStatus: newStatus || null,
    performedBy: performedBy || null,
    notes,
  });
}

async function notifyWeddingParties({ customerId, vendorId, weddingId, title, message, type }) {
  const tasks = [
    notify(customerId, { title, message, type, link: '/bookings', wedding: weddingId }),
    notify(vendorId, { title, message, type, link: '/vendor/orders', wedding: weddingId }),
  ];
  if (weddingId) {
    const wedding = await Wedding.findById(weddingId).select('planner');
    if (wedding?.planner) {
      tasks.push(notify(wedding.planner, {
        title,
        message,
        type,
        link: `/planner/weddings/${weddingId}`,
        wedding: weddingId,
      }));
    }
  }
  await Promise.all(tasks);
}

function matchesSearch(row, search) {
  if (!search) return true;
  const q = search.toLowerCase();
  const haystack = [
    row.reference,
    row.serviceName,
    row.bookingType,
    row.customerName,
    row.customerUsername,
    row.customerPhone,
    row.weddingName,
    row.vendorName,
    row.venueName,
    row.hallName,
    row.slotLabel,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

function isUpcoming(row, now = new Date()) {
  if (['cancelled', 'expired', 'rejected', 'completed'].includes(row.status)) return false;
  const start = row.startDateTime ? new Date(row.startDateTime) : row.date ? new Date(row.date) : null;
  return start && start >= now;
}

function isToday(row, now = new Date()) {
  const key = now.toISOString().slice(0, 10);
  if (row.date === key) return true;
  if (row.startDateTime) return new Date(row.startDateTime).toISOString().slice(0, 10) === key;
  return false;
}

async function buildHallRows() {
  await expireStaleHolds();
  const halls = await HallBooking.find()
    .populate('customer', 'firstName lastName username phone email')
    .populate('vendor', 'firstName lastName username')
    .populate('venue', 'name city')
    .populate('hall', 'hallName capacity')
    .populate('wedding', 'weddingName weddingDate expectedGuests planner')
    .sort({ createdAt: -1 })
    .lean();

  return halls.map((b) => {
    const total = roundMoney(b.basePrice);
    const paid = roundMoney(b.amountPaid);
    const due = roundMoney(b.balance ?? Math.max(0, total - paid));
    return {
      id: composeId('hall', b._id),
      source: 'hall',
      sourceId: String(b._id),
      reference: refCode('hall', b._id),
      bookingType: 'hall',
      serviceName: b.hall?.hallName || 'Hall',
      venueName: b.venue?.name || '',
      hallName: b.hall?.hallName || '',
      hallCapacity: b.hall?.capacity ?? null,
      guestCount: b.wedding?.expectedGuests ?? null,
      customerName: personName(b.customer),
      customerUsername: b.customer?.username || '',
      customerPhone: b.customer?.phone || '',
      customerId: b.customer?._id,
      weddingName: b.wedding?.weddingName || '',
      weddingId: b.wedding?._id,
      vendorName: personName(b.vendor),
      vendorId: b.vendor?._id,
      date: b.bookingDate,
      startDateTime: b.startDateTime,
      endDateTime: b.endDateTime,
      slotType: b.slotType,
      slotLabel: String(b.slotType || '').replaceAll('_', ' '),
      totalAmount: total,
      amountPaid: paid,
      amountDue: due,
      depositRequired: roundMoney(b.depositRequired),
      paymentStatus: b.paymentStatus || 'unpaid',
      status: b.status,
      holdExpiresAt: b.holdExpiresAt,
      notes: b.notes || '',
      createdAt: b.createdAt,
      raw: b,
    };
  });
}

async function buildAppointmentRows() {
  const appointments = await Appointment.find()
    .populate('customer', 'firstName lastName username phone email')
    .populate('vendor', 'firstName lastName username')
    .populate('wedding', 'weddingName weddingDate expectedGuests planner')
    .populate('listing', 'name category')
    .sort({ createdAt: -1 })
    .lean();

  const ids = appointments.map((a) => a._id);
  const orders = await Order.find({ appointment: { $in: ids } }).lean();
  const orderMap = Object.fromEntries(orders.map((o) => [String(o.appointment), o]));

  return appointments.map((a) => {
    const order = orderMap[String(a._id)];
    const total = roundMoney(order?.amount ?? a.price);
    const paid = roundMoney(order?.amountPaid ?? 0);
    const due = roundMoney(order?.balance ?? Math.max(0, total - paid));
    return {
      id: composeId('appointment', a._id),
      source: 'appointment',
      sourceId: String(a._id),
      reference: refCode('appointment', a._id),
      bookingType: bookingTypeFromCategory(a.listing?.category),
      serviceName: a.listing?.name || 'Appointment',
      venueName: '',
      hallName: '',
      customerName: personName(a.customer),
      customerUsername: a.customer?.username || '',
      customerPhone: a.customer?.phone || '',
      customerId: a.customer?._id,
      weddingName: a.wedding?.weddingName || '',
      weddingId: a.wedding?._id,
      vendorName: personName(a.vendor),
      vendorId: a.vendor?._id,
      date: a.date,
      startDateTime: a.startDateTime,
      endDateTime: a.endDateTime,
      slotType: null,
      slotLabel: a.startDateTime
        ? new Date(a.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '',
      totalAmount: total,
      amountPaid: paid,
      amountDue: due,
      depositRequired: roundMoney(order?.depositRequired ?? 0),
      paymentStatus: order?.paymentStatus || (paid > 0 ? (due > 0 ? 'partially_paid' : 'paid') : 'unpaid'),
      status: a.status,
      holdExpiresAt: null,
      notes: a.notes || '',
      createdAt: a.createdAt,
      listingCategory: a.listing?.category,
      orderId: order?._id || null,
      raw: a,
    };
  });
}

async function buildRentalRows() {
  const rentals = await RentalBooking.find()
    .populate('customer', 'firstName lastName username phone email')
    .populate('vendor', 'firstName lastName username')
    .populate('wedding', 'weddingName weddingDate expectedGuests planner')
    .populate('listing', 'name category')
    .sort({ createdAt: -1 })
    .lean();

  const ids = rentals.map((r) => r._id);
  const orders = await Order.find({ rental: { $in: ids } }).lean();
  const orderMap = Object.fromEntries(orders.map((o) => [String(o.rental), o]));

  return rentals.map((r) => {
    const order = orderMap[String(r._id)];
    const total = roundMoney(order?.amount ?? r.price);
    const paid = roundMoney(order?.amountPaid ?? 0);
    const due = roundMoney(order?.balance ?? Math.max(0, total - paid));
    return {
      id: composeId('rental', r._id),
      source: 'rental',
      sourceId: String(r._id),
      reference: refCode('rental', r._id),
      bookingType: bookingTypeFromCategory(r.listing?.category),
      serviceName: r.listing?.name || 'Rental',
      venueName: '',
      hallName: '',
      customerName: personName(r.customer),
      customerUsername: r.customer?.username || '',
      customerPhone: r.customer?.phone || '',
      customerId: r.customer?._id,
      weddingName: r.wedding?.weddingName || '',
      weddingId: r.wedding?._id,
      vendorName: personName(r.vendor),
      vendorId: r.vendor?._id,
      date: r.rentalStart ? new Date(r.rentalStart).toISOString().slice(0, 10) : null,
      startDateTime: r.rentalStart,
      endDateTime: r.rentalEnd,
      slotType: null,
      slotLabel: r.quantity > 1 ? `Qty ${r.quantity}` : 'Rental period',
      quantity: r.quantity,
      totalAmount: total,
      amountPaid: paid,
      amountDue: due,
      depositRequired: roundMoney(order?.depositRequired ?? 0),
      paymentStatus: order?.paymentStatus || (paid > 0 ? (due > 0 ? 'partially_paid' : 'paid') : 'unpaid'),
      status: r.status,
      holdExpiresAt: null,
      notes: r.notes || '',
      createdAt: r.createdAt,
      listingCategory: r.listing?.category,
      orderId: order?._id || null,
      raw: r,
    };
  });
}

async function buildLegacyRows() {
  const bookings = await Booking.find()
    .populate('customer', 'firstName lastName username phone email')
    .populate('vendor', 'firstName lastName username')
    .populate('wedding', 'weddingName weddingDate planner')
    .sort({ createdAt: -1 })
    .lean();

  return bookings.map((b) => ({
    id: composeId('legacy', b._id),
    source: 'legacy',
    sourceId: String(b._id),
    reference: refCode('legacy', b._id),
    bookingType: 'service',
    serviceName: b.serviceName || 'Service',
    venueName: '',
    hallName: '',
    customerName: personName(b.customer),
    customerUsername: b.customer?.username || '',
    customerPhone: b.customer?.phone || '',
    customerId: b.customer?._id,
    weddingName: b.wedding?.weddingName || '',
    weddingId: b.wedding?._id,
    vendorName: personName(b.vendor),
    vendorId: b.vendor?._id,
    date: b.eventDate ? new Date(b.eventDate).toISOString().slice(0, 10) : null,
    startDateTime: b.eventDate,
    endDateTime: null,
    slotType: null,
    slotLabel: '',
    totalAmount: roundMoney(b.amount),
    amountPaid: 0,
    amountDue: roundMoney(b.amount),
    depositRequired: 0,
    paymentStatus: 'unpaid',
    status: b.status === 'accepted' ? 'confirmed' : b.status,
    holdExpiresAt: null,
    notes: b.customerMessage || b.vendorMessage || '',
    createdAt: b.createdAt,
    raw: b,
  }));
}

async function loadAllBookingRows() {
  const [halls, appointments, rentals, legacy] = await Promise.all([
    buildHallRows(),
    buildAppointmentRows(),
    buildRentalRows(),
    buildLegacyRows(),
  ]);
  return [...halls, ...appointments, ...rentals, ...legacy].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}

function applyFilters(rows, query) {
  const {
    search = '',
    type,
    status,
    paymentStatus,
    vendor,
    wedding,
    dateFrom,
    dateTo,
    quick,
  } = query;

  let filtered = rows;

  if (search) filtered = filtered.filter((row) => matchesSearch(row, String(search).trim()));
  if (type) filtered = filtered.filter((row) => row.bookingType === type);
  if (status) filtered = filtered.filter((row) => row.status === status);
  if (paymentStatus) filtered = filtered.filter((row) => row.paymentStatus === paymentStatus);
  if (vendor && mongoose.isValidObjectId(vendor)) {
    filtered = filtered.filter((row) => String(row.vendorId) === String(vendor));
  }
  if (wedding && mongoose.isValidObjectId(wedding)) {
    filtered = filtered.filter((row) => String(row.weddingId) === String(wedding));
  }
  if (dateFrom) filtered = filtered.filter((row) => row.date && row.date >= dateFrom);
  if (dateTo) filtered = filtered.filter((row) => row.date && row.date <= dateTo);

  if (quick === 'today') filtered = filtered.filter((row) => isToday(row));
  if (quick === 'upcoming') filtered = filtered.filter((row) => isUpcoming(row));
  if (quick === 'pending') filtered = filtered.filter((row) => ['pending', 'held'].includes(row.status));
  if (quick === 'confirmed') filtered = filtered.filter((row) => row.status === 'confirmed');
  if (quick === 'completed') filtered = filtered.filter((row) => row.status === 'completed');
  if (quick === 'cancelled') filtered = filtered.filter((row) => ['cancelled', 'rejected', 'expired'].includes(row.status));
  if (quick === 'unpaid') filtered = filtered.filter((row) => ['unpaid', 'partially_paid'].includes(row.paymentStatus));

  return filtered;
}

function buildStats(rows) {
  const now = new Date();
  const sum = (fn) => rows.reduce((n, row) => n + fn(row), 0);
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    held: rows.filter((r) => r.status === 'held').length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    upcoming: rows.filter((r) => isUpcoming(r, now)).length,
    inProgress: rows.filter((r) => r.status === 'in_progress').length,
    completed: rows.filter((r) => r.status === 'completed').length,
    cancelled: rows.filter((r) => ['cancelled', 'rejected', 'expired'].includes(r.status)).length,
    totalValue: roundMoney(sum((r) => r.totalAmount)),
    totalPaid: roundMoney(sum((r) => (r.isTestPayment ? 0 : r.amountPaid))),
    totalDue: roundMoney(sum((r) => r.amountDue)),
  };
}

function allowedActions(row) {
  const actions = ['view'];
  if (['held', 'pending'].includes(row.status)) actions.push('confirm', 'cancel');
  if (row.status === 'confirmed') {
    if (row.source !== 'hall') actions.push('in_progress');
    actions.push('complete', 'cancel');
  }
  if (row.status === 'in_progress') actions.push('complete', 'cancel');
  return actions;
}

function serializeRow(row) {
  const { raw, ...rest } = row;
  return {
    ...rest,
    actions: allowedActions(row),
    holdRemainingMinutes: row.holdExpiresAt
      ? Math.max(0, Math.ceil((new Date(row.holdExpiresAt) - new Date()) / 60_000))
      : null,
  };
}

export const listAdminUnifiedBookings = asyncHandler(async (req, res) => {
  const allRows = await loadAllBookingRows();
  const filtered = applyFilters(allRows, req.query);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const start = (page - 1) * limit;
  const pageRows = filtered.slice(start, start + limit).map(serializeRow);

  res.json({
    success: true,
    stats: buildStats(allRows),
    filteredStats: buildStats(filtered),
    page,
    limit,
    total: filtered.length,
    pages: Math.ceil(filtered.length / limit) || 1,
    bookings: pageRows,
  });
});

export const getAdminUnifiedBooking = asyncHandler(async (req, res) => {
  const parsed = parseComposeId(req.params.id);
  if (!parsed) throw createHttpError('Booking not found', { statusCode: 404 });

  const allRows = await loadAllBookingRows();
  const row = allRows.find((item) => item.source === parsed.source && item.sourceId === parsed.id);
  if (!row) throw createHttpError('Booking not found', { statusCode: 404 });

  const history = await BookingHistory.find({ source: parsed.source, bookingId: parsed.id })
    .populate('performedBy', 'firstName lastName username role')
    .sort({ timestamp: -1 })
    .limit(50)
    .lean();

  res.json({
    success: true,
    booking: serializeRow(row),
    history,
  });
});

export const updateAdminUnifiedBookingStatus = asyncHandler(async (req, res) => {
  await applyAdminBookingStatusChange(req, res);
});

export const cancelAdminUnifiedBooking = asyncHandler(async (req, res) => {
  req.body = { ...(req.body || {}), status: 'cancelled' };
  await applyAdminBookingStatusChange(req, res);
});

async function applyAdminBookingStatusChange(req, res) {
  const parsed = parseComposeId(req.params.id);
  if (!parsed) throw createHttpError('Booking not found', { statusCode: 404 });

  const nextStatus = String(req.body.status || '').trim();
  const allowed = ['confirmed', 'in_progress', 'completed', 'cancelled'];
  if (!allowed.includes(nextStatus)) {
    throw createHttpError('Invalid booking status', { statusCode: 400, field: 'status' });
  }

  if (parsed.source === 'hall') {
    await updateHallStatus(parsed.id, nextStatus, req.user);
  } else if (parsed.source === 'appointment') {
    await updateAppointmentStatus(parsed.id, nextStatus, req.user);
  } else if (parsed.source === 'rental') {
    await updateRentalStatus(parsed.id, nextStatus, req.user);
  } else {
    await updateLegacyStatus(parsed.id, nextStatus, req.user);
  }

  const allRows = await loadAllBookingRows();
  const row = allRows.find((item) => item.source === parsed.source && item.sourceId === parsed.id);
  res.json({ success: true, booking: row ? serializeRow(row) : null });
}

async function updateHallStatus(id, nextStatus, adminUser) {
  await expireStaleHolds();
  const booking = await HallBooking.findById(id);
  if (!booking) throw createHttpError('Hall booking not found', { statusCode: 404 });

  const oldStatus = booking.status;

  if (nextStatus === 'cancelled') {
    if (!['held', 'pending', 'confirmed', 'in_progress'].includes(booking.status)) {
      throw createHttpError('This hall booking cannot be cancelled', { statusCode: 409 });
    }
    booking.status = 'cancelled';
    await booking.save();
    await releaseLocks(booking._id);
    await Order.updateMany(
      { booking: booking._id, status: { $in: ['pending', 'confirmed', 'in_progress'] } },
      { $set: { status: 'cancelled' } },
    );
  } else if (nextStatus === 'confirmed') {
    if (!['held', 'pending'].includes(booking.status)) {
      throw createHttpError('Only held or pending hall bookings can be confirmed', { statusCode: 409 });
    }
    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date() && booking.status === 'held') {
      booking.status = 'expired';
      await booking.save();
      await releaseLocks(booking._id);
      throw createHttpError('This hold has expired', { statusCode: 409 });
    }
    await assertSlotAvailable({
      hallId: booking.hall,
      date: booking.bookingDate,
      slotType: booking.slotType,
      excludeBookingId: booking._id,
    });
    booking.status = 'confirmed';
    booking.holdExpiresAt = null;
    await booking.save();
    await Order.updateMany({ booking: booking._id, status: { $in: ['pending', 'held'] } }, { $set: { status: 'confirmed' } });
  } else if (nextStatus === 'completed') {
    if (!['confirmed', 'in_progress'].includes(booking.status)) {
      throw createHttpError('Only confirmed hall bookings can be completed', { statusCode: 409 });
    }
    booking.status = 'completed';
    await booking.save();
    await Order.updateMany({ booking: booking._id, status: { $in: ['confirmed', 'in_progress'] } }, { $set: { status: 'completed' } });
  } else if (nextStatus === 'in_progress') {
    throw createHttpError('Hall bookings do not use in-progress status', { statusCode: 409 });
  }

  await recordHistory({
    source: 'hall',
    bookingId: booking._id,
    wedding: booking.wedding,
    action: `status_${nextStatus}`,
    oldStatus,
    newStatus: booking.status,
    performedBy: adminUser._id,
    notes: `Admin updated hall booking status to ${booking.status}`,
  });
  await notifyWeddingParties({
    customerId: booking.customer,
    vendorId: booking.vendor,
    weddingId: booking.wedding,
    title: `Hall booking ${booking.status}`,
    message: `A hall booking was marked ${booking.status} by an administrator.`,
    type: booking.status === 'cancelled' ? 'booking_rejected' : 'booking_confirmed',
  });
  await syncWeddingTimelineSafe(booking.wedding);
}

async function updateAppointmentStatus(id, nextStatus, adminUser) {
  const booking = await Appointment.findById(id).populate('listing', 'name');
  if (!booking) throw createHttpError('Appointment not found', { statusCode: 404 });
  const oldStatus = booking.status;

  const transitions = {
    confirmed: ['pending'],
    in_progress: ['confirmed'],
    completed: ['confirmed', 'in_progress'],
    cancelled: ['pending', 'confirmed', 'in_progress'],
  };
  if (!(transitions[nextStatus] || []).includes(booking.status)) {
    throw createHttpError(`Cannot move appointment from ${booking.status} to ${nextStatus}`, { statusCode: 409 });
  }

  if (nextStatus === 'confirmed') {
    const clash = await Appointment.findOne({
      _id: { $ne: booking._id },
      listing: booking.listing,
      resourceKey: booking.resourceKey,
      status: { $in: ['pending', 'confirmed'] },
      startDateTime: { $lt: booking.endDateTime },
      endDateTime: { $gt: booking.startDateTime },
    });
    if (clash) throw createHttpError('This appointment slot conflicts with another booking', { statusCode: 409 });
  }

  booking.status = nextStatus;
  await booking.save();
  const orderStatus = nextStatus === 'cancelled' ? 'cancelled' : nextStatus;
  await Order.updateMany({ appointment: booking._id }, { $set: { status: orderStatus } });

  await recordHistory({
    source: 'appointment',
    bookingId: booking._id,
    wedding: booking.wedding,
    action: `status_${nextStatus}`,
    oldStatus,
    newStatus: nextStatus,
    performedBy: adminUser._id,
  });
  await notifyWeddingParties({
    customerId: booking.customer,
    vendorId: booking.vendor,
    weddingId: booking.wedding,
    title: `Appointment ${nextStatus}`,
    message: `${booking.listing?.name || 'Appointment'} was marked ${nextStatus} by an administrator.`,
    type: nextStatus === 'cancelled' ? 'booking_rejected' : 'booking_confirmed',
  });
  await syncWeddingTimelineSafe(booking.wedding);
}

async function updateRentalStatus(id, nextStatus, adminUser) {
  const booking = await RentalBooking.findById(id).populate('listing', 'name');
  if (!booking) throw createHttpError('Rental booking not found', { statusCode: 404 });
  const oldStatus = booking.status;

  const transitions = {
    confirmed: ['pending'],
    in_progress: ['confirmed'],
    completed: ['confirmed', 'in_progress'],
    cancelled: ['pending', 'confirmed', 'in_progress'],
  };
  if (!(transitions[nextStatus] || []).includes(booking.status)) {
    throw createHttpError(`Cannot move rental from ${booking.status} to ${nextStatus}`, { statusCode: 409 });
  }

  booking.status = nextStatus;
  await booking.save();
  const orderStatus = nextStatus === 'cancelled' ? 'cancelled' : nextStatus;
  await Order.updateMany({ rental: booking._id }, { $set: { status: orderStatus } });

  await recordHistory({
    source: 'rental',
    bookingId: booking._id,
    wedding: booking.wedding,
    action: `status_${nextStatus}`,
    oldStatus,
    newStatus: nextStatus,
    performedBy: adminUser._id,
  });
  await notifyWeddingParties({
    customerId: booking.customer,
    vendorId: booking.vendor,
    weddingId: booking.wedding,
    title: `Rental ${nextStatus}`,
    message: `${booking.listing?.name || 'Rental'} was marked ${nextStatus} by an administrator.`,
    type: nextStatus === 'cancelled' ? 'booking_rejected' : 'booking_confirmed',
  });
  await syncWeddingTimelineSafe(booking.wedding);
}

async function updateLegacyStatus(id, nextStatus, adminUser) {
  const booking = await Booking.findById(id);
  if (!booking) throw createHttpError('Booking not found', { statusCode: 404 });
  const oldStatus = booking.status;
  const map = {
    confirmed: 'accepted',
    cancelled: 'cancelled',
    completed: 'completed',
    in_progress: null,
  };
  const mapped = map[nextStatus];
  if (!mapped) throw createHttpError('Invalid status for this booking type', { statusCode: 409 });
  booking.status = mapped;
  await booking.save();
  await recordHistory({
    source: 'legacy',
    bookingId: booking._id,
    wedding: booking.wedding,
    action: `status_${nextStatus}`,
    oldStatus,
    newStatus: mapped,
    performedBy: adminUser._id,
  });
  await notifyWeddingParties({
    customerId: booking.customer,
    vendorId: booking.vendor,
    weddingId: booking.wedding,
    title: `Booking ${mapped}`,
    message: `${booking.serviceName} was marked ${mapped} by an administrator.`,
    type: mapped === 'cancelled' ? 'booking_rejected' : 'booking_confirmed',
  });
}
