import asyncHandler from 'express-async-handler';
import crypto from 'crypto';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingInvoice from '../models/BookingInvoice.js';
import Payment from '../models/Payment.js';
import VendorProfile from '../models/VendorProfile.js';
import WeddingListing from '../models/WeddingListing.js';
import { getPaymentProvider } from '../payments/provider.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { findAccessibleWeddingIds } from '../utils/weddingMembership.js';
import { isCoupleRole, bookingOwnerFromUserRole } from '../utils/roles.js';
import { notify } from '../utils/notify.js';
import {
  cancelInvoiceForBooking,
  issueInvoiceForBooking,
} from '../utils/bookingInvoiceService.js';
import { applyPaymentResult } from '../utils/paymentSettlement.js';
import {
  assertBookingDateBeforeWedding,
  assertWeddingDateForBooking,
  checkProviderAvailability,
  checkVendorCapacity,
  checkVendorVenueConflict,
} from '../utils/bookingValidation.js';
import {
  assertHallCapacity,
  assertHallSlotAvailable,
  isVenueListing,
  priceForSlot,
} from '../utils/hallSlotAvailability.js';

const customerPopulate = [
  { path: 'vendorProfile', select: 'businessName category city phone email metadata' },
  { path: 'vendor', select: 'firstName lastName' },
  { path: 'bookedBy', select: 'firstName lastName username role' },
  { path: 'customer', select: 'firstName lastName username role' },
  { path: 'invoice', select: 'invoiceNumber amount status issuedAt paidAt currency' },
];

function requireCouple(req, res) {
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Groom or Bride access required');
  }
}

async function assertWeddingForBooking(req, res) {
  const accessibleIds = await findAccessibleWeddingIds(req.user._id);
  if (!accessibleIds.length) {
    res.status(400);
    throw new Error('You must have a wedding to make a booking.');
  }
}

export const checkBookingAvailability = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  await assertWeddingForBooking(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  assertWeddingDateForBooking(wedding, res);

  if (!mongoose.isValidObjectId(req.query.vendorProfile)) {
    res.status(400);
    throw new Error('Invalid vendor');
  }
  const profile = await VendorProfile.findOne({ _id: req.query.vendorProfile, active: true });
  if (!profile) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  const eventDate = req.query.eventDate || req.query.date;
  if (!eventDate) {
    res.status(400);
    throw new Error('Event date is required');
  }
  assertBookingDateBeforeWedding(eventDate, wedding.weddingDate, res);

  const venueConflict = await checkVendorVenueConflict(profile, eventDate);
  if (venueConflict) {
    return res.json({ success: true, available: false, message: venueConflict });
  }

  const capacityError = await checkVendorCapacity(profile, wedding._id, wedding.expectedGuests);
  if (capacityError) {
    return res.json({ success: true, available: false, message: capacityError });
  }

  const availability = await checkProviderAvailability(profile, eventDate);
  res.json({ success: true, ...availability });
});

export const createBooking = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  await assertWeddingForBooking(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  assertWeddingDateForBooking(wedding, res);

  if (req.body.weddingId && String(req.body.weddingId) !== String(wedding._id)) {
    res.status(400);
    throw new Error('Wedding ID does not match your shared wedding');
  }

  if (!mongoose.isValidObjectId(req.body.vendorProfile)) {
    res.status(400);
    throw new Error('Invalid vendor');
  }
  const profile = await VendorProfile.findOne({ _id: req.body.vendorProfile, active: true });
  if (!profile) {
    res.status(404);
    throw new Error('Vendor not found');
  }

  const service = profile.services.id(req.body.serviceId)
    || profile.services.find((item) => item.name === req.body.serviceName);
  const serviceName = service?.name || String(req.body.serviceName || '').trim();
  const amount = service ? service.price : Number(req.body.amount ?? profile.startingPrice);
  const eventDate = req.body.eventDate;

  if (!serviceName || !eventDate || !Number.isFinite(amount) || amount < 0) {
    res.status(400);
    throw new Error('Service, event date, and valid amount are required');
  }

  assertBookingDateBeforeWedding(eventDate, wedding.weddingDate, res);

  const venueConflict = await checkVendorVenueConflict(profile, eventDate);
  if (venueConflict) {
    res.status(409);
    throw new Error(venueConflict);
  }

  const capacityError = await checkVendorCapacity(profile, wedding._id, wedding.expectedGuests);
  if (capacityError) {
    res.status(409);
    throw new Error(capacityError);
  }

  const availability = await checkProviderAvailability(profile, eventDate);
  if (!availability.available) {
    res.status(409);
    throw new Error(availability.message);
  }

  const bookingOwner = bookingOwnerFromUserRole(req.user.role);
  const booking = await Booking.create({
    wedding: wedding._id,
    customer: req.user._id,
    vendor: profile.user,
    vendorProfile: profile._id,
    serviceName,
    eventDate,
    amount,
    customerMessage: String(req.body.customerMessage || req.body.notes || '').trim(),
    status: 'pending',
    isPaid: false,
    bookingOwner,
    bookedBy: req.user._id,
  });

  await notify(profile.user, {
    title: 'New Booking Request',
    message: `New booking request for ${serviceName} on ${new Date(eventDate).toLocaleDateString()}.`,
    type: 'booking_created',
    link: '/vendor/bookings',
    wedding: wedding._id,
  });

  await booking.populate(customerPopulate);
  res.status(201).json({
    success: true,
    booking,
    message: 'Booking request submitted! Waiting for vendor confirmation.',
  });
});

export const createHallBooking = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  await assertWeddingForBooking(req, res);
  const wedding = await resolveOwnedWedding(req, res);

  const listingId = req.body.listingId || req.body.listing;
  const bookingDate = req.body.bookingDate || req.body.eventDate;
  const timeSlot = req.body.timeSlot;

  if (!mongoose.isValidObjectId(listingId) || !bookingDate || !timeSlot) {
    res.status(400);
    throw new Error('Listing ID, booking date, and time slot are required');
  }
  if (!['morning', 'evening', 'full_day'].includes(timeSlot)) {
    res.status(400);
    throw new Error('Invalid time slot');
  }

  const listing = await WeddingListing.findOne({
    _id: listingId,
    active: true,
    available: true,
    status: { $ne: 'archived' },
  });
  if (!listing || !isVenueListing(listing)) {
    res.status(404);
    throw new Error('Hall listing not found or unavailable');
  }

  assertBookingDateBeforeWedding(bookingDate, wedding.weddingDate, res);
  await assertHallSlotAvailable(listing, bookingDate, timeSlot, res);
  await assertHallCapacity(listing, wedding, res);

  const amount = Math.round(priceForSlot(listing, timeSlot) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0) {
    res.status(400);
    throw new Error('Hall price is not configured for this slot');
  }

  const bookingOwner = bookingOwnerFromUserRole(req.user.role);
  const booking = await Booking.create({
    wedding: wedding._id,
    customer: req.user._id,
    vendor: listing.vendor,
    vendorProfile: listing.vendorProfile,
    listing: listing._id,
    serviceName: listing.name,
    eventDate: bookingDate,
    timeSlot,
    quantity: 1,
    amount,
    customerMessage: String(req.body.notes || req.body.customerMessage || '').trim(),
    status: 'pending',
    isPaid: false,
    bookingOwner,
    bookedBy: req.user._id,
  });

  await notify(listing.vendor, {
    title: 'New Booking Request',
    message: `New hall request for ${listing.name} (${timeSlot.replaceAll('_', ' ')}) on ${new Date(bookingDate).toLocaleDateString()}.`,
    type: 'booking_created',
    link: '/vendor/bookings',
    wedding: wedding._id,
  });

  await booking.populate(customerPopulate);
  res.status(201).json({
    success: true,
    booking,
    message: 'Booking request submitted! Waiting for vendor confirmation.',
  });
});

export const listBookings = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res, { required: false });
  const filter = wedding ? { wedding: wedding._id } : { customer: req.user._id };
  const bookings = await Booking.find(filter).populate(customerPopulate).sort({ createdAt: -1 });

  const scope = req.query.scope || 'all';
  let scoped = bookings;
  if (scope === 'mine') {
    scoped = bookings.filter((b) => String(b.bookedBy?._id || b.bookedBy) === String(req.user._id));
  } else if (scope === 'groom') {
    scoped = bookings.filter((b) => b.bookingOwner === 'groom');
  } else if (scope === 'bride') {
    scoped = bookings.filter((b) => b.bookingOwner === 'bride');
  } else if (scope === 'shared') {
    scoped = bookings.filter((b) => b.bookingOwner === 'shared');
  }

  const confirmedVendors = new Set(
    bookings.filter((b) => ['confirmed', 'completed'].includes(b.status)).map((b) => String(b.vendor)),
  ).size;

  res.json({
    success: true,
    bookings: scoped,
    summary: {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === 'pending').length,
      accepted: bookings.filter((b) => b.status === 'accepted').length,
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      completed: bookings.filter((b) => b.status === 'completed').length,
      confirmedVendors,
    },
  });
});

export const getBooking = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error('Invalid booking ID');
  }
  const wedding = await resolveOwnedWedding(req, res);
  const booking = await Booking.findOne({ _id: req.params.id, wedding: wedding._id }).populate(customerPopulate);
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  res.json({ success: true, booking });
});

export const cancelBooking = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  const booking = mongoose.isValidObjectId(req.params.id)
    ? await Booking.findOne({ _id: req.params.id, wedding: wedding._id })
    : null;
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (!['pending', 'accepted'].includes(booking.status)) {
    res.status(409);
    throw new Error('This booking cannot be cancelled');
  }
  booking.status = 'cancelled';
  await booking.save();
  await cancelInvoiceForBooking(booking._id);

  await notify(booking.vendor, {
    title: 'Booking Cancelled',
    message: `A couple cancelled the ${booking.serviceName} booking.`,
    type: 'booking_cancelled',
    link: '/vendor/bookings',
    wedding: wedding._id,
  });

  res.json({ success: true, booking });
});

export const listVendorBookings = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    res.status(403);
    throw new Error('vendor access required');
  }
  const bookings = await Booking.find({ vendor: req.user._id })
    .populate('customer', 'firstName lastName email phone role')
    .populate('bookedBy', 'firstName lastName role username')
    .populate('wedding', 'weddingName weddingDate venue city partner1Name partner2Name')
    .populate('vendorProfile', 'businessName')
    .populate('invoice', 'invoiceNumber amount amountPaid balance paymentStatus status issuedAt paidAt')
    .sort({ createdAt: -1 });
  res.json({ success: true, bookings });
});

export const updateVendorBookingStatus = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    res.status(403);
    throw new Error('vendor access required');
  }
  const allowedStatuses = ['accepted', 'rejected', 'completed'];
  if (!allowedStatuses.includes(req.body.status)) {
    res.status(400);
    throw new Error('Invalid booking status');
  }

  const booking = mongoose.isValidObjectId(req.params.id)
    ? await Booking.findOne({ _id: req.params.id, vendor: req.user._id })
    : null;
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }

  const transitions = {
    pending: ['accepted', 'rejected'],
    confirmed: ['completed'],
  };
  const allowed = transitions[booking.status] || [];
  if (!allowed.includes(req.body.status)) {
    res.status(409);
    throw new Error(
      req.body.status === 'completed' && booking.status === 'accepted'
        ? 'Booking must be paid and confirmed before it can be marked completed'
        : 'Invalid status transition',
    );
  }

  if (req.body.status === 'rejected') {
    const reason = String(req.body.rejectionReason || req.body.vendorMessage || '').trim();
    if (!reason) {
      res.status(400);
      throw new Error('Rejection reason is required');
    }
    booking.rejectionReason = reason;
    booking.vendorMessage = reason;
    booking.status = 'rejected';
    await cancelInvoiceForBooking(booking._id);
  } else if (req.body.status === 'accepted') {
    booking.status = 'accepted';
    if (req.body.vendorMessage !== undefined) {
      booking.vendorMessage = req.body.vendorMessage;
    }
    const invoice = await issueInvoiceForBooking(booking);
    booking.invoice = invoice._id;
  } else if (req.body.status === 'completed') {
    booking.status = 'completed';
    if (req.body.vendorMessage !== undefined) {
      booking.vendorMessage = req.body.vendorMessage;
    }
  }

  await booking.save();

  const notifyUserId = booking.bookedBy || booking.customer;
  if (req.body.status === 'accepted') {
    const invoice = await BookingInvoice.findById(booking.invoice);
    await notify(notifyUserId, {
      title: 'Booking Accepted — Payment Required',
      message: `Your ${booking.serviceName} booking was accepted. Invoice ${invoice?.invoiceNumber || ''} is ready for payment.`,
      type: 'booking_accepted',
      link: '/bookings',
      wedding: booking.wedding,
    });
  } else {
    const title = req.body.status === 'rejected' ? 'Booking Rejected' : 'Booking Completed';
    await notify(notifyUserId, {
      title,
      message: `${booking.serviceName} booking was ${req.body.status}.`,
      type: `booking_${req.body.status}`,
      link: '/bookings',
      wedding: booking.wedding,
    });
  }

  await booking.populate([
    { path: 'invoice', select: 'invoiceNumber amount status issuedAt paidAt currency' },
  ]);
  res.json({ success: true, booking });
});

export const payBooking = asyncHandler(async (req, res) => {
  requireCouple(req, res);
  const wedding = await resolveOwnedWedding(req, res);
  const booking = mongoose.isValidObjectId(req.params.id)
    ? await Booking.findOne({ _id: req.params.id, wedding: wedding._id })
    : null;
  if (!booking) {
    res.status(404);
    throw new Error('Booking not found');
  }
  if (booking.status !== 'accepted') {
    res.status(409);
    throw new Error('Payment is only allowed after the vendor accepts the booking');
  }
  if (booking.isPaid || booking.status === 'confirmed') {
    res.status(409);
    throw new Error('This booking has already been paid');
  }

  const invoice = await BookingInvoice.findOne({ booking: booking._id, status: 'issued' });
  if (!invoice) {
    res.status(409);
    throw new Error('No payable invoice exists for this booking. The vendor must accept it first.');
  }

  const paymentMethod = req.body.paymentMethod || 'test';
  if (!['card', 'mobile_money', 'bank_transfer', 'test'].includes(paymentMethod)) {
    res.status(400);
    throw new Error('Select a valid payment method');
  }

  const reference = `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const payment = await Payment.create({
    customer: req.user._id,
    paidBy: req.user._id,
    wedding: wedding._id,
    vendorBooking: booking._id,
    vendor: booking.vendor,
    amount: invoice.amount,
    currency: invoice.currency || 'USD',
    paymentType: 'full',
    paymentMethod,
    transactionReference: reference,
    receiptNumber: `RCPT-${reference}`,
    status: 'pending',
    invoiceId: invoice.invoiceNumber,
  });

  const result = await getPaymentProvider().charge({
    amount: invoice.amount,
    paymentMethod,
    reference,
  });
  await applyPaymentResult(payment, result);

  const updatedBooking = await Booking.findById(booking._id).populate(customerPopulate);
  const updatedInvoice = await BookingInvoice.findById(invoice._id);

  res.json({
    success: true,
    booking: updatedBooking,
    invoice: updatedInvoice,
    payment,
    message: updatedBooking?.status === 'confirmed'
      ? 'Payment recorded. Booking is now confirmed.'
      : 'Payment submitted.',
  });
});
