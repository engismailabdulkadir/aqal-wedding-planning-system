import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import Order from '../models/Order.js';
import RentalBooking from '../models/RentalBooking.js';
import WeddingListing from '../models/WeddingListing.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { overlaps, parseDateTime } from '../utils/hallOccupancy.js';

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60_000);
}

function generateSlots(date, startTime, endTime, durationMinutes) {
  const slots = [];
  let cursor = parseDateTime(date, startTime);
  const closing = parseDateTime(date, endTime);
  if (closing <= cursor) closing.setDate(closing.getDate() + 1);
  while (addMinutes(cursor, durationMinutes) <= closing) {
    slots.push({
      start: new Date(cursor),
      end: addMinutes(cursor, durationMinutes),
      label: cursor.toTimeString().slice(0, 5),
    });
    cursor = addMinutes(cursor, durationMinutes);
  }
  return slots;
}

export const getListingAvailability = asyncHandler(async (req, res) => {
  const listing = mongoose.isValidObjectId(req.params.id) ? await WeddingListing.findById(req.params.id) : null;
  if (!listing || !listing.active) {
    res.status(404);
    throw new Error('Service not found');
  }
  const date = String(req.query.date || '');
  const type = listing.availabilityType || 'none';
  const blockedDates = listing.metadata?.blockedDates || [];
  if (date && blockedDates.includes(date)) {
    return res.json({
      success: true,
      availabilityType: type,
      date,
      available: false,
      reason: 'blocked',
      slots: [],
    });
  }

  if (type === 'appointment') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400);
      throw new Error('Provide date as YYYY-MM-DD');
    }
    const meta = listing.metadata || {};
    const duration = Number(meta.durationMinutes || 60);
    const hours = meta.workingHours || { start: '08:00', end: '18:00' };
    const resourceKey = req.query.resource || meta.defaultResource || 'default';
    const generated = generateSlots(date, hours.start, hours.end, duration);
    const booked = await Appointment.find({
      listing: listing._id,
      resourceKey,
      date,
      status: { $in: ['pending', 'confirmed'] },
    });
    const slots = generated.map((slot) => {
      const taken = booked.some((item) => overlaps(slot.start, slot.end, item.startDateTime, item.endDateTime));
      return { time: slot.label, start: slot.start, end: slot.end, available: !taken, status: taken ? 'booked' : 'available' };
    });
    return res.json({ success: true, availabilityType: type, date, durationMinutes: duration, slots });
  }

  if (type === 'rental_period' || type === 'inventory') {
    const start = req.query.start ? new Date(req.query.start) : (date ? parseDateTime(date, '00:00') : null);
    const end = req.query.end ? new Date(req.query.end) : (start ? addMinutes(start, 24 * 60) : null);
    const quantity = listing.quantity || 1;
    let reserved = 0;
    if (start && end) {
      const rentals = await RentalBooking.find({
        listing: listing._id,
        status: { $in: ['pending', 'confirmed'] },
        rentalStart: { $lt: end },
        rentalEnd: { $gt: start },
      });
      reserved = rentals.reduce((sum, item) => sum + item.quantity, 0);
    }
    return res.json({
      success: true,
      availabilityType: type,
      quantity,
      reserved,
      remaining: Math.max(0, quantity - reserved),
      available: quantity - reserved > 0,
    });
  }

  res.json({ success: true, availabilityType: type, available: listing.available });
});

export const createAppointment = asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    res.status(403);
    throw new Error('Customer access required');
  }
  const wedding = await resolveOwnedWedding(req, res);
  const listing = mongoose.isValidObjectId(req.body.listing)
    ? await WeddingListing.findOne({ _id: req.body.listing, active: true, available: true })
    : null;
  if (!listing) {
    res.status(404);
    throw new Error('Service not found');
  }
  const date = String(req.body.date || '');
  const time = String(req.body.time || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    res.status(400);
    throw new Error('Date and time are required');
  }
  const duration = Number(listing.metadata?.durationMinutes || req.body.durationMinutes || 60);
  const startDateTime = parseDateTime(date, time);
  const endDateTime = addMinutes(startDateTime, duration);
  const resourceKey = req.body.resourceKey || listing.metadata?.defaultResource || 'default';
  const conflict = await Appointment.findOne({
    listing: listing._id,
    resourceKey,
    status: { $in: ['pending', 'confirmed'] },
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
  });
  if (conflict) {
    res.status(409);
    throw new Error('This appointment time is already booked');
  }
  const price = listing.discountPrice ?? listing.price;
  let appointment;
  try {
    appointment = await Appointment.create({
      customer: req.user._id,
      wedding: wedding._id,
      vendor: listing.vendor,
      listing: listing._id,
      resourceKey,
      date,
      startDateTime,
      endDateTime,
      durationMinutes: duration,
      price,
      status: 'pending',
      notes: req.body.notes,
    });
  } catch (error) {
    if (error?.code === 11000) {
      res.status(409);
      throw new Error('This appointment time is already booked');
    }
    throw error;
  }
  await Order.create({
    customer: req.user._id,
    wedding: wedding._id,
    vendor: listing.vendor,
    service: listing._id,
    appointment: appointment._id,
    category: listing.category,
    itemName: listing.name,
    quantity: 1,
    amount: price,
    amountPaid: 0,
    balance: price,
    status: 'pending',
    paymentStatus: 'unpaid',
    eventDate: startDateTime,
  });
  res.status(201).json({ success: true, appointment });
});

export const createRental = asyncHandler(async (req, res) => {
  if (req.user.role !== 'customer') {
    res.status(403);
    throw new Error('Customer access required');
  }
  const wedding = await resolveOwnedWedding(req, res);
  const listing = mongoose.isValidObjectId(req.body.listing)
    ? await WeddingListing.findOne({ _id: req.body.listing, active: true, available: true })
    : null;
  if (!listing) {
    res.status(404);
    throw new Error('Service not found');
  }
  const rentalStart = new Date(req.body.rentalStart);
  const rentalEnd = new Date(req.body.rentalEnd);
  const quantity = Number(req.body.quantity || 1);
  if (Number.isNaN(rentalStart.getTime()) || Number.isNaN(rentalEnd.getTime()) || rentalEnd <= rentalStart) {
    res.status(400);
    throw new Error('Provide a valid rental period');
  }
  if (!Number.isInteger(quantity) || quantity < 1) {
    res.status(400);
    throw new Error('Invalid quantity');
  }
  const existing = await RentalBooking.find({
    listing: listing._id,
    status: { $in: ['pending', 'confirmed'] },
    rentalStart: { $lt: rentalEnd },
    rentalEnd: { $gt: rentalStart },
  });
  const reserved = existing.reduce((sum, item) => sum + item.quantity, 0);
  const stock = listing.quantity || 1;
  if (reserved + quantity > stock) {
    res.status(409);
    throw new Error('This item is not available for the selected dates');
  }
  const unit = listing.metadata?.rentalOrPurchase === 'purchase'
    ? (listing.metadata?.purchasePrice ?? listing.price)
    : (listing.metadata?.rentalPrice ?? listing.discountPrice ?? listing.price);
  const price = unit * quantity;
  const rental = await RentalBooking.create({
    customer: req.user._id,
    wedding: wedding._id,
    vendor: listing.vendor,
    listing: listing._id,
    rentalStart,
    rentalEnd,
    quantity,
    price,
    status: 'pending',
    notes: req.body.notes,
  });
  await Order.create({
    customer: req.user._id,
    wedding: wedding._id,
    vendor: listing.vendor,
    service: listing._id,
    rental: rental._id,
    category: listing.category,
    itemName: listing.name,
    quantity,
    amount: price,
    amountPaid: 0,
    balance: price,
    status: 'pending',
    paymentStatus: 'unpaid',
    eventDate: rentalStart,
  });
  res.status(201).json({ success: true, rental });
});
