import Hall from '../models/Hall.js';
import HallBooking from '../models/HallBooking.js';
import HallSlot from '../models/HallSlot.js';
import HallSlotLock from '../models/HallSlotLock.js';
import Order from '../models/Order.js';
import { evaluateBudgetCommitment } from './budgetValidation.js';
import { validateHallCapacity } from './hallValidation.js';
import {
  acquireSlotLocks,
  blocksSlot,
  defaultSlots,
  expireStaleHolds,
  findOverlappingBookings,
  HOLD_MINUTES,
  quoteSlots,
  releaseLocks,
  slotSchedule,
} from './hallOccupancy.js';

const ACTIVE = ['held', 'pending', 'confirmed'];

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export async function slotsForHall(hallId, hallDoc = null) {
  const configured = await HallSlot.find({ hall: hallId, active: true }).lean();
  if (configured.length) return configured;
  const hall = hallDoc || await Hall.findById(hallId).select('vendor priceStatus').lean();
  if (!hall?.vendor || hall?.priceStatus === 'quote_required') return quoteSlots();
  return defaultSlots();
}

export async function assertSlotAvailable({ hallId, date, slotType, excludeBookingId = null }) {
  await expireStaleHolds();
  const slots = await slotsForHall(hallId);
  const slot = slots.find((item) => item.slotType === slotType);
  if (!slot) {
    const err = new Error('Invalid slot for this hall');
    err.statusCode = 400;
    err.code = 'INVALID_SLOT';
    throw err;
  }
  const schedule = slotSchedule(date, slot);
  const overlapping = await findOverlappingBookings(hallId, schedule.occupancyStart, schedule.occupancyEnd, excludeBookingId);
  const slotConflict = overlapping.some((booking) => blocksSlot(booking.slotType, slotType));
  if (slotConflict) {
    const err = new Error('This hall slot is no longer available');
    err.statusCode = 409;
    err.code = 'HALL_SLOT_UNAVAILABLE';
    err.details = { hallId, date, slotType };
    throw err;
  }
  if (slotType === 'full_day') {
    const extraLocks = await HallSlotLock.find({
      hall: hallId,
      date,
      slotKey: { $in: ['morning', 'evening'] },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date() } }],
    });
    const blocking = extraLocks.filter((lock) => !excludeBookingId || String(lock.booking) !== String(excludeBookingId));
    if (blocking.length) {
      const err = new Error('This hall slot is no longer available');
      err.statusCode = 409;
      err.code = 'HALL_SLOT_UNAVAILABLE';
      throw err;
    }
  }
  return { slot, schedule };
}

export async function currentHallBooking(weddingId) {
  return HallBooking.findOne({
    wedding: weddingId,
    status: { $in: ACTIVE },
  }).populate([
    { path: 'venue', select: 'name city district address' },
    { path: 'hall', select: 'hallName capacity minimumCapacity facilities parking kitchen stage' },
    { path: 'vendor', select: 'firstName lastName' },
  ]).sort({ createdAt: -1 });
}

function venueIdOf(hall) {
  return hall.venue?._id || hall.venue;
}

export async function previewHallChange({
  wedding,
  currentBooking,
  hall,
  date,
  slotType,
  allowOverBudget = false,
}) {
  validateHallCapacity(wedding, hall);
  const excludeId = currentBooking?._id || null;
  const { slot, schedule } = await assertSlotAvailable({
    hallId: hall._id,
    date,
    slotType,
    excludeBookingId: excludeId,
  });

  const sameHall = currentBooking && String(currentBooking.hall._id || currentBooking.hall) === String(hall._id);
  const sameSlot = currentBooking?.slotType === slotType;
  const sameDate = currentBooking?.bookingDate === date;
  if (sameHall && sameSlot && sameDate) {
    const err = new Error('This is already your current hall booking');
    err.statusCode = 409;
    err.code = 'HALL_UNCHANGED';
    throw err;
  }

  const oldCommitted = currentBooking && ['confirmed', 'completed'].includes(currentBooking.status);
  const additionalCost = oldCommitted
    ? roundMoney(slot.price - Number(currentBooking.basePrice || 0))
    : roundMoney(slot.price);
  const budget = await evaluateBudgetCommitment(wedding, Math.max(0, additionalCost), { allowOverBudget, category: 'hall' });

  const amountPaid = roundMoney(currentBooking?.amountPaid || 0);
  const mode = sameHall ? 'in_place' : 'replace';
  const newAmountDue = mode === 'in_place'
    ? roundMoney(Math.max(0, slot.price - amountPaid))
    : roundMoney(slot.price);

  return {
    mode,
    budget,
    slot,
    schedule,
    summary: {
      current: currentBooking ? {
        bookingId: currentBooking._id,
        venueName: currentBooking.venue?.name,
        hallName: currentBooking.hall?.hallName,
        hallId: currentBooking.hall?._id || currentBooking.hall,
        slotType: currentBooking.slotType,
        date: currentBooking.bookingDate,
        price: currentBooking.basePrice,
        amountPaid,
        amountDue: roundMoney(Math.max(0, Number(currentBooking.basePrice) - amountPaid)),
        paymentStatus: currentBooking.paymentStatus,
        status: currentBooking.status,
      } : null,
      next: {
        venueId: venueIdOf(hall),
        venueName: hall.venue?.name,
        hallId: hall._id,
        hallName: hall.hallName,
        capacity: hall.capacity,
        slotType,
        date,
        price: slot.price,
        depositRequired: slot.deposit,
      },
      mode,
      paymentAlreadyMade: amountPaid,
      newAmountDue,
      priceDelta: additionalCost,
      paymentsPreserved: true,
      oldHallReleasedAfterConfirm: mode === 'replace',
    },
  };
}

async function rollbackReplacement(booking) {
  if (!booking?._id) return;
  booking.status = 'cancelled';
  await booking.save().catch(() => {});
  await releaseLocks(booking._id).catch(() => {});
  await Order.updateMany({ booking: booking._id, status: { $in: ['pending', 'confirmed'] } }, { $set: { status: 'cancelled' } }).catch(() => {});
}

export async function applyHallChange({
  wedding,
  customerId,
  currentBooking,
  hall,
  date,
  slotType,
  allowOverBudget = false,
}) {
  const preview = await previewHallChange({
    wedding,
    currentBooking,
    hall,
    date,
    slotType,
    allowOverBudget,
  });
  const { mode, slot, schedule, summary } = preview;
  const venueId = venueIdOf(hall);

  if (mode === 'in_place') {
    const previous = {
      venue: currentBooking.venue,
      hall: currentBooking.hall,
      vendor: currentBooking.vendor,
      bookingDate: currentBooking.bookingDate,
      slotType: currentBooking.slotType,
      startDateTime: currentBooking.startDateTime,
      endDateTime: currentBooking.endDateTime,
      occupancyStart: currentBooking.occupancyStart,
      occupancyEnd: currentBooking.occupancyEnd,
      basePrice: currentBooking.basePrice,
      depositRequired: currentBooking.depositRequired,
      balance: currentBooking.balance,
      paymentStatus: currentBooking.paymentStatus,
      holdExpiresAt: currentBooking.holdExpiresAt,
    };
    await releaseLocks(currentBooking._id);
    let locks;
    try {
      locks = await acquireSlotLocks({
        hallId: hall._id,
        date,
        slotType,
        expiresAt: currentBooking.status === 'held' ? new Date(Date.now() + HOLD_MINUTES * 60_000) : null,
        bookingId: currentBooking._id,
      });
    } catch (error) {
      try {
        await acquireSlotLocks({
          hallId: previous.hall._id || previous.hall,
          date: previous.bookingDate,
          slotType: previous.slotType,
          expiresAt: currentBooking.status === 'held' ? previous.holdExpiresAt : null,
          bookingId: currentBooking._id,
        });
      } catch {
        /* original locks may still exist if release failed partway */
      }
      throw error;
    }

    currentBooking.venue = venueId;
    currentBooking.hall = hall._id;
    currentBooking.vendor = hall.vendor;
    currentBooking.bookingDate = date;
    currentBooking.slotType = slotType;
    currentBooking.startDateTime = schedule.startDateTime;
    currentBooking.endDateTime = schedule.endDateTime;
    currentBooking.occupancyStart = schedule.occupancyStart;
    currentBooking.occupancyEnd = schedule.occupancyEnd;
    currentBooking.basePrice = slot.price;
    currentBooking.depositRequired = slot.deposit;
    currentBooking.balance = Math.max(0, slot.price - Number(currentBooking.amountPaid || 0));
    if (currentBooking.balance <= 0 && currentBooking.amountPaid > 0) currentBooking.paymentStatus = 'paid';
    else if (currentBooking.amountPaid > 0) currentBooking.paymentStatus = 'partially_paid';
    if (currentBooking.status === 'held') currentBooking.holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
    await currentBooking.save();
    await HallSlotLock.updateMany({ _id: { $in: locks.map((lock) => lock._id) } }, { $set: { booking: currentBooking._id } });
    await Order.updateMany(
      { booking: currentBooking._id, status: { $nin: ['cancelled', 'rejected'] } },
      {
        $set: {
          itemName: `${hall.hallName} (${slot.name})`,
          amount: slot.price,
          depositRequired: slot.deposit,
          balance: currentBooking.balance,
          eventDate: schedule.startDateTime,
        },
      },
    );
    wedding.selectedVenue = venueId;
    wedding.selectedHall = hall._id;
    wedding.selectedSlot = slotType;
    wedding.weddingDate = schedule.startDateTime;
    await wedding.save();
    return { booking: currentBooking, releasedBooking: null, summary };
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_MINUTES * 60_000);
  const locks = await acquireSlotLocks({
    hallId: hall._id,
    date,
    slotType,
    expiresAt: holdExpiresAt,
  });

  let booking;
  try {
    booking = await HallBooking.create({
      customer: customerId,
      wedding: wedding._id,
      venue: venueId,
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
      notes: currentBooking ? `Replacement for booking ${currentBooking._id}` : '',
    });
    await HallSlotLock.updateMany({ _id: { $in: locks.map((lock) => lock._id) } }, { $set: { booking: booking._id } });
    await Order.create({
      customer: customerId,
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
  } catch (error) {
    await HallSlotLock.deleteMany({ _id: { $in: locks.map((lock) => lock._id) } });
    throw error;
  }

  try {
    wedding.selectedVenue = venueId;
    wedding.selectedHall = hall._id;
    wedding.selectedSlot = slotType;
    wedding.weddingDate = schedule.startDateTime;
    await wedding.save();
  } catch (error) {
    await rollbackReplacement(booking);
    throw error;
  }

  if (currentBooking) {
    try {
      currentBooking.status = 'cancelled';
      currentBooking.notes = [currentBooking.notes, `Replaced by booking ${booking._id}`].filter(Boolean).join(' · ');
      await currentBooking.save();
      await releaseLocks(currentBooking._id);
      await Order.updateMany(
        { booking: currentBooking._id, status: { $in: ['pending', 'confirmed'] } },
        { $set: { status: 'cancelled' } },
      );
    } catch {
      /* Replacement already saved on the wedding; keep the new hall even if old release is delayed. */
    }
  }

  return { booking, releasedBooking: currentBooking || null, summary };
}
