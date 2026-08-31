import Guest from '../models/Guest.js';
import Booking from '../models/Booking.js';
import HallBooking from '../models/HallBooking.js';

const ACTIVE_BOOKING_STATUSES = ['pending', 'accepted', 'confirmed'];

export function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function assertWeddingDateForBooking(wedding, res) {
  if (!wedding?.weddingDate) {
    res.status(400);
    throw new Error('Please specify your wedding date before making bookings.');
  }
}

export function assertBookingDateBeforeWedding(eventDate, weddingDate, res) {
  assertBookingDateNotInPast(eventDate, res);
  const bookingDay = new Date(eventDate);
  const weddingDay = new Date(weddingDate);
  bookingDay.setHours(0, 0, 0, 0);
  weddingDay.setHours(23, 59, 59, 999);
  if (bookingDay > weddingDay) {
    res.status(400);
    throw new Error('Booking date cannot be after the wedding date.');
  }
}

export function assertBookingDateNotInPast(eventDate, res) {
  const bookingDay = new Date(eventDate);
  if (Number.isNaN(bookingDay.getTime())) {
    res.status(400);
    throw new Error('Invalid booking date.');
  }
  bookingDay.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDay < today) {
    res.status(400);
    throw new Error('Booking date cannot be in the past.');
  }
}

export async function totalWeddingGuestCount(weddingId, fallback = 0) {
  const guests = await Guest.find({ wedding: weddingId });
  if (!guests.length) return fallback;
  return guests.reduce((sum, guest) => sum + (guest.numberAttending || 1), 0);
}

export async function checkVendorVenueConflict(vendorProfile, eventDate) {
  const isVenue = vendorProfile.category === 'venue' || vendorProfile.metadata?.businessType === 'venue';
  if (!isVenue) return null;
  const dayStart = new Date(eventDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const conflict = await Booking.findOne({
    vendorProfile: vendorProfile._id,
    eventDate: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
  if (conflict) {
    return 'This venue is already booked for the selected date. Please choose another date.';
  }

  const hallConflict = await HallBooking.findOne({
    vendor: vendorProfile.user,
    eventDate: { $gte: dayStart, $lt: dayEnd },
    status: { $in: ['pending', 'held', 'confirmed'] },
  });
  if (hallConflict) {
    return 'This venue is already booked for the selected date. Please choose another date.';
  }
  return null;
}

export async function checkVendorCapacity(vendorProfile, weddingId, weddingExpectedGuests) {
  const isVenue = vendorProfile.category === 'venue' || vendorProfile.metadata?.businessType === 'venue';
  if (!isVenue) return null;
  const venueCapacity = Number(vendorProfile.metadata?.venueCapacity || vendorProfile.metadata?.capacity || 0);
  if (!venueCapacity || venueCapacity <= 0) return null;

  const guestCount = await totalWeddingGuestCount(weddingId, weddingExpectedGuests || 0);
  if (guestCount > venueCapacity) {
    return `This venue can accommodate up to ${venueCapacity} guests, but your wedding has ${guestCount} guests. Please choose a larger venue.`;
  }
  return null;
}

export async function checkProviderAvailability(vendorProfile, eventDate) {
  const meta = vendorProfile.metadata || {};
  const blockedDates = [
    ...(meta.blockedDates || []),
    ...(meta.closedDates || []),
    ...(meta.fullyBookedDates || []),
  ];
  const day = dateKey(eventDate);
  if (blockedDates.includes(day)) {
    return { available: false, message: 'This date is not available. Please choose another date.' };
  }

  const closedDays = meta.closedDays || [];
  const weekday = new Date(eventDate).getDay();
  if (closedDays.includes(weekday)) {
    return { available: false, message: 'This date is not available. Please choose another date.' };
  }

  const maxPerDay = Number(meta.maxBookingsPerDay || 0);
  if (maxPerDay > 0) {
    const dayStart = new Date(eventDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const count = await Booking.countDocuments({
      vendorProfile: vendorProfile._id,
      eventDate: { $gte: dayStart, $lt: dayEnd },
      status: { $in: ACTIVE_BOOKING_STATUSES },
    });
    if (count >= maxPerDay) {
      return { available: false, message: 'This date is not available. Please choose another date.' };
    }
  }

  return { available: true, message: 'Available ✓ You can proceed to request this booking.' };
}
