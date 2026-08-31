import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';

const CONFLICT_STATUSES = ['pending', 'accepted', 'confirmed'];

export function blocksSlot(existingSlot, requestedSlot) {
  const existing = existingSlot || 'full_day';
  const requested = requestedSlot || 'full_day';
  if (existing === 'full_day') return true;
  if (requested === 'full_day') return existing === 'morning' || existing === 'evening';
  return existing === requested;
}

export function isVenueListing(listing) {
  return listing.category === 'venue' || listing.category === 'hall';
}

export function hallPrices(listing) {
  const meta = listing.metadata || {};
  const morning = Number(meta.morningPrice ?? 0);
  const evening = Number(meta.eveningPrice ?? 0);
  const fullDay = morning + evening;
  return { morning, evening, fullDay };
}

export function priceForSlot(listing, slot) {
  const { morning, evening, fullDay } = hallPrices(listing);
  if (slot === 'morning') return morning;
  if (slot === 'evening') return evening;
  if (slot === 'full_day') return fullDay;
  return Number(listing.discountPrice ?? listing.price ?? 0);
}

function dayRange(dateValue) {
  const day = new Date(dateValue);
  day.setHours(0, 0, 0, 0);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);
  return { start: day, end: next };
}

export async function getHallBookedSlots(listingId, dateValue) {
  const { start, end } = dayRange(dateValue);
  const bookings = await Booking.find({
    listing: listingId,
    eventDate: { $gte: start, $lt: end },
    status: { $in: CONFLICT_STATUSES },
  }).select('timeSlot status');

  const slots = { morning: false, evening: false, full_day: false };
  for (const booking of bookings) {
    const slot = booking.timeSlot || 'full_day';
    if (slot === 'morning') slots.morning = true;
    if (slot === 'evening') slots.evening = true;
    if (slot === 'full_day') slots.full_day = true;
  }
  if (slots.morning && slots.evening) slots.full_day = true;
  if (slots.full_day) {
    slots.morning = true;
    slots.evening = true;
  }
  return slots;
}

export function slotAvailabilityFromBooked(booked) {
  return {
    morning: !booked.morning && !booked.full_day,
    evening: !booked.evening && !booked.full_day,
    full_day: !booked.full_day && !booked.morning && !booked.evening,
  };
}

export async function assertHallSlotAvailable(listing, dateValue, slot, res) {
  const { start, end } = dayRange(dateValue);
  const bookings = await Booking.find({
    listing: listing._id,
    eventDate: { $gte: start, $lt: end },
    status: { $in: CONFLICT_STATUSES },
  }).select('timeSlot status');

  for (const booking of bookings) {
    if (blocksSlot(booking.timeSlot, slot)) {
      res.status(409);
      throw new Error('This hall slot is unavailable for the selected date.');
    }
  }
}

export async function totalWeddingGuests(weddingId, fallback = 0) {
  const guests = await Guest.find({ wedding: weddingId });
  if (!guests.length) return fallback;
  return guests.reduce((sum, guest) => sum + (guest.numberAttending || 1), 0);
}

export async function assertHallCapacity(listing, wedding, res) {
  const capacity = listing.metadata?.capacity;
  if (capacity == null || capacity === '') return;
  const cap = Number(capacity);
  if (!Number.isFinite(cap) || cap <= 0) return;

  const guestCount = await totalWeddingGuests(wedding._id, wedding.expectedGuests || 0);
  if (guestCount > cap) {
    res.status(409);
    throw new Error(`This Hall supports up to ${cap} guests.`);
  }
}
