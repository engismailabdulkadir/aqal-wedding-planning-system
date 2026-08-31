import Appointment from '../models/Appointment.js';
import Hall from '../models/Hall.js';
import HallBooking from '../models/HallBooking.js';
import RentalBooking from '../models/RentalBooking.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { computeWeddingBudget } from './budgetTotals.js';
import { currentHallBooking, previewHallChange } from './hallReplacement.js';

export function dateKey(value) {
  if (!value) return '';
  const raw = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function throwCoded(statusCode, code, message, details) {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.code = code;
  err.details = details;
  throw err;
}

export async function analyzeDateDependentServices(wedding, newDate) {
  const date = dateKey(newDate);
  const warnings = [];
  const [appointments, rentals, selections] = await Promise.all([
    Appointment.find({ wedding: wedding._id, status: { $in: ['pending', 'confirmed'] } }).populate('listing', 'name category'),
    RentalBooking.find({ wedding: wedding._id, status: { $in: ['pending', 'confirmed'] } }).populate('listing', 'name category'),
    WeddingSelection.find({
      wedding: wedding._id,
      status: { $nin: ['cancelled', 'rejected'] },
    }).populate('listing', 'name category availabilityType metadata'),
  ]);

  const mismatchedAppointments = appointments.filter((item) => item.date !== date);
  if (mismatchedAppointments.length) {
    warnings.push({
      code: 'DATE_CHANGE_APPOINTMENTS',
      message: 'Salon and appointment bookings still sit on the previous wedding date. They were not moved automatically.',
      details: {
        newDate: date,
        items: mismatchedAppointments.map((item) => ({
          id: item._id,
          name: item.listing?.name,
          category: item.listing?.category,
          date: item.date,
        })),
      },
    });
  }

  const mismatchedRentals = rentals.filter((item) => {
    const start = dateKey(item.rentalStart);
    const end = dateKey(item.rentalEnd);
    return start !== date && end !== date;
  });
  if (mismatchedRentals.length) {
    warnings.push({
      code: 'DATE_CHANGE_RENTALS',
      message: 'Dress, suit, or other rental periods still cover the previous date. Confirm inventory for the new date before keeping them.',
      details: {
        newDate: date,
        items: mismatchedRentals.map((item) => ({
          id: item._id,
          name: item.listing?.name,
          category: item.listing?.category,
          rentalStart: item.rentalStart,
          rentalEnd: item.rentalEnd,
        })),
      },
    });
  }

  const dateSensitive = selections.filter((item) => item.eventDate && dateKey(item.eventDate) !== date);
  if (dateSensitive.length) {
    warnings.push({
      code: 'DATE_CHANGE_SERVICES',
      message: 'Photography, catering, transport, and other date-dependent services were not silently kept as available. Review each booking.',
      details: {
        newDate: date,
        items: dateSensitive.map((item) => ({
          selectionId: item._id,
          itemName: item.itemName,
          category: item.category,
          eventDate: item.eventDate,
        })),
      },
    });
  }

  return warnings;
}

export async function analyzeGuestServiceCapacity(wedding, expectedGuests) {
  const warnings = [];
  const guests = Number(expectedGuests || 0);
  const selections = await WeddingSelection.find({
    wedding: wedding._id,
    category: { $in: ['catering', 'transportation'] },
    status: { $nin: ['cancelled', 'rejected'] },
  }).populate('listing', 'name category metadata');

  for (const selection of selections) {
    const max = Number(selection.listing?.metadata?.maximumGuests || 0);
    const vehicles = Number(selection.listing?.metadata?.vehicleCount || selection.listing?.metadata?.capacity || 0);
    if (selection.category === 'catering' && max && guests > max) {
      warnings.push({
        code: 'CATERING_CAPACITY',
        message: `${selection.itemName} cannot serve ${guests} guests (maximum ${max}).`,
        details: { selectionId: selection._id, itemName: selection.itemName, expectedGuests: guests, maximumGuests: max },
      });
    }
    if (selection.category === 'transportation' && vehicles && guests > vehicles) {
      warnings.push({
        code: 'TRANSPORT_CAPACITY',
        message: `${selection.itemName} may not cover ${guests} guests.`,
        details: { selectionId: selection._id, itemName: selection.itemName, expectedGuests: guests, capacity: vehicles },
      });
    }
  }
  return warnings;
}

export async function previewWeddingDateChange(wedding, nextDate) {
  const date = dateKey(nextDate);
  const booking = await currentHallBooking(wedding._id);
  const serviceWarnings = await analyzeDateDependentServices(wedding, date);
  if (!booking) {
    return { booking: null, available: true, serviceWarnings };
  }
  const hall = await Hall.findById(booking.hall._id || booking.hall).populate('venue', 'name city');
  try {
    const preview = await previewHallChange({
      wedding,
      currentBooking: booking,
      hall,
      date,
      slotType: booking.slotType,
      allowOverBudget: true,
    });
    return { booking, hall, available: true, preview, serviceWarnings };
  } catch (error) {
    if (error.code === 'HALL_UNCHANGED') {
      return { booking, hall, available: true, unchanged: true, serviceWarnings };
    }
    return { booking, hall, available: false, error, serviceWarnings };
  }
}

export async function analyzeWeddingUpdateImpact(wedding, updates, previous) {
  const warnings = [];

  const nextGuests = updates.expectedGuests ?? previous.expectedGuests;
  if (updates.expectedGuests !== undefined && Number(updates.expectedGuests) !== Number(previous.expectedGuests)) {
    const bookings = await HallBooking.find({
      wedding: wedding._id,
      status: { $in: ['held', 'pending', 'confirmed'] },
    }).populate('hall', 'hallName capacity minimumCapacity');

    for (const booking of bookings) {
      const capacity = Number(booking.hall?.capacity || 0);
      if (capacity && Number(nextGuests) > capacity) {
        warnings.push({
          code: 'HALL_CAPACITY_EXCEEDED',
          message: `Your current Hall cannot accommodate the updated guest count.`,
          details: {
            bookingId: booking._id,
            hallName: booking.hall.hallName,
            hallId: booking.hall._id,
            expectedGuests: Number(nextGuests),
            hallCapacity: capacity,
            recovery: ['choose_another_hall', 'reduce_guest_count'],
          },
        });
      }
    }

    if (wedding.selectedHall) {
      const hall = await Hall.findById(wedding.selectedHall).select('hallName capacity minimumCapacity');
      if (hall && Number(nextGuests) > Number(hall.capacity)) {
        warnings.push({
          code: 'SELECTED_HALL_TOO_SMALL',
          message: `Your current Hall cannot accommodate the updated guest count.`,
          details: {
            hallName: hall.hallName,
            hallId: hall._id,
            expectedGuests: Number(nextGuests),
            hallCapacity: hall.capacity,
            recovery: ['choose_another_hall', 'reduce_guest_count'],
          },
        });
      }
    }

    warnings.push(...await analyzeGuestServiceCapacity(wedding, nextGuests));
  }

  const nextDate = updates.weddingDate ?? previous.weddingDate;
  if (updates.weddingDate !== undefined && dateKey(nextDate) !== dateKey(previous.weddingDate)) {
    const datePreview = await previewWeddingDateChange(wedding, nextDate);
    if (!datePreview.available) {
      const hallName = datePreview.hall?.hallName || datePreview.booking?.hall?.hallName;
      warnings.push({
        code: 'DATE_HALL_UNAVAILABLE',
        message: `Your current Hall is not available on ${dateKey(nextDate)}.`,
        details: {
          newDate: dateKey(nextDate),
          hallName,
          hallId: datePreview.hall?._id,
          slotType: datePreview.booking?.slotType,
          reason: datePreview.error?.code,
          recovery: ['choose_another_hall', 'keep_current_date'],
        },
      });
    } else if (datePreview.booking && !datePreview.unchanged) {
      warnings.push({
        code: 'DATE_RESCHEDULE_REQUIRED',
        message: 'Confirm this date change to revalidate and move the current hall booking.',
        details: {
          newDate: dateKey(nextDate),
          preview: datePreview.preview?.summary || null,
        },
      });
    }
    warnings.push(...(datePreview.serviceWarnings || []));
  }

  if (updates.estimatedBudget !== undefined && Number(updates.estimatedBudget) !== Number(previous.estimatedBudget)) {
    const computed = await computeWeddingBudget({
      ...wedding.toObject(),
      estimatedBudget: Number(updates.estimatedBudget),
    });
    if (computed.overBudget) {
      warnings.push({
        code: 'BUDGET_NOW_INSUFFICIENT',
        message: `Your current wedding selections exceed the new budget by $${Math.abs(computed.remainingBudget).toFixed(2)}.`,
        details: {
          totalBudget: computed.totalBudget,
          totalPlannedCost: computed.totalPlannedCost,
          totalPaid: computed.totalPaid,
          totalAmountDue: computed.totalAmountDue,
          overBy: Math.abs(computed.remainingBudget),
          remainingBudget: computed.remainingBudget,
        },
      });
    }
  }

  if (updates.city !== undefined && updates.city !== previous.city) {
    const selections = await WeddingSelection.find({
      wedding: wedding._id,
      status: { $nin: ['cancelled', 'rejected'] },
    }).populate('listing', 'name city');

    const mismatched = selections.filter(
      (selection) => selection.listing?.city && selection.listing.city !== updates.city,
    );
    if (mismatched.length) {
      warnings.push({
        code: 'CITY_MISMATCH',
        message: 'Some selected services may not serve your new city.',
        details: {
          newCity: updates.city,
          services: mismatched.map((selection) => ({
            selectionId: selection._id,
            itemName: selection.itemName,
            serviceCity: selection.listing?.city,
          })),
        },
      });
    }
  }

  return warnings;
}

export function blockingUpdateError(warnings) {
  const capacity = warnings.find((item) => item.code === 'HALL_CAPACITY_EXCEEDED' || item.code === 'SELECTED_HALL_TOO_SMALL');
  if (capacity) {
    return throwCoded(422, 'HALL_CAPACITY_EXCEEDED', capacity.message, capacity.details);
  }
  const dateHall = warnings.find((item) => item.code === 'DATE_HALL_UNAVAILABLE');
  if (dateHall) {
    return throwCoded(422, 'DATE_HALL_UNAVAILABLE', dateHall.message, dateHall.details);
  }
  return null;
}
