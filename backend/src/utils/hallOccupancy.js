import { DEFAULT_HALL_SLOTS, QUOTE_HALL_SLOTS } from '../models/HallSlot.js';
import HallBooking from '../models/HallBooking.js';
import HallSlotLock from '../models/HallSlotLock.js';

export const HOLD_MINUTES = 10;
export const BLOCKING_STATUSES = ['pending', 'held', 'confirmed'];

export function parseDateTime(dateStr, timeStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hours, minutes] = timeStr.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function occupancyWindow(startDateTime, endDateTime, slot) {
  const setup = Number(slot.setupMinutes || 0);
  const cleanup = Number(slot.cleanupMinutes || 0);
  const buffer = Number(slot.bufferMinutes || 0);
  return {
    occupancyStart: new Date(startDateTime.getTime() - setup * 60_000),
    occupancyEnd: new Date(endDateTime.getTime() + (cleanup + buffer) * 60_000),
  };
}

export function slotSchedule(dateStr, slot) {
  const startDateTime = parseDateTime(dateStr, slot.startTime);
  let endDateTime = parseDateTime(dateStr, slot.endTime);
  if (slot.overnight || endDateTime <= startDateTime) {
    endDateTime = addDays(endDateTime, 1);
  }
  const { occupancyStart, occupancyEnd } = occupancyWindow(startDateTime, endDateTime, slot);
  return { startDateTime, endDateTime, occupancyStart, occupancyEnd };
}

export function lockKeysForSlot(slotType) {
  if (slotType === 'morning') return ['morning'];
  if (slotType === 'evening') return ['evening'];
  if (slotType === 'full_day') return ['morning', 'evening', 'full_day'];
  return [slotType];
}

export function blocksSlot(bookingSlotType, targetSlotType) {
  if (bookingSlotType === 'full_day') return true;
  if (targetSlotType === 'full_day') return bookingSlotType === 'morning' || bookingSlotType === 'evening';
  return bookingSlotType === targetSlotType;
}

export function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

export function defaultSlots() {
  return DEFAULT_HALL_SLOTS.map((slot) => ({ ...slot }));
}

export function quoteSlots() {
  return QUOTE_HALL_SLOTS.map((slot) => ({ ...slot }));
}

export async function expireStaleHolds() {
  const now = new Date();
  const expired = await HallBooking.find({ status: 'held', holdExpiresAt: { $lte: now } }).select('_id');
  const ids = expired.map((item) => item._id);
  if (ids.length) {
    await HallBooking.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } });
    await HallSlotLock.deleteMany({ booking: { $in: ids } });
  }
  await HallSlotLock.deleteMany({ expiresAt: { $lte: now } });
  return ids.length;
}

export async function findOverlappingBookings(hallId, occupancyStart, occupancyEnd, excludeId) {
  const filter = {
    hall: hallId,
    status: { $in: BLOCKING_STATUSES },
    occupancyStart: { $lt: occupancyEnd },
    occupancyEnd: { $gt: occupancyStart },
  };
  if (excludeId) filter._id = { $ne: excludeId };
  const bookings = await HallBooking.find(filter);
  const now = new Date();
  return bookings.filter((booking) => booking.status !== 'held' || (booking.holdExpiresAt && booking.holdExpiresAt > now));
}

export async function acquireSlotLocks({ hallId, date, slotType, expiresAt, bookingId = null }) {
  const keys = lockKeysForSlot(slotType);
  const created = [];
  try {
    for (const slotKey of keys) {
      const lock = await HallSlotLock.create({
        hall: hallId,
        date,
        slotKey,
        booking: bookingId,
        expiresAt,
      });
      created.push(lock);
    }
    return created;
  } catch (error) {
    if (created.length) {
      await HallSlotLock.deleteMany({ _id: { $in: created.map((lock) => lock._id) } });
    }
    if (error?.code === 11000) {
      const conflict = new Error('This hall slot is no longer available');
      conflict.statusCode = 409;
      throw conflict;
    }
    throw error;
  }
}

export async function releaseLocks(bookingId) {
  await HallSlotLock.deleteMany({ booking: bookingId });
}
