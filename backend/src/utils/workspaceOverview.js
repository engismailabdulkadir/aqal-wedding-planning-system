import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import HallBooking from '../models/HallBooking.js';
import Invitation from '../models/Invitation.js';
import Order from '../models/Order.js';
import Task from '../models/Task.js';
import TimelineEvent from '../models/TimelineEvent.js';
import Wedding from '../models/Wedding.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { computeWeddingBudget } from './budgetTotals.js';
import { ensureDefaultTimeline } from './defaultTimeline.js';

const ACTIVE_HALL = ['held', 'pending', 'confirmed'];
const CONFIRMED_HALL = ['confirmed', 'completed'];
const PENDING_HALL = ['held', 'pending'];
const CONFIRMED_ORDER = ['confirmed', 'in_progress', 'completed'];
const CONFIRMED_SELECTION = ['confirmed', 'paid', 'fulfilled', 'completed'];
const LEGACY_CONFIRMED = ['accepted', 'completed'];

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function daysRemaining(weddingDate, now = new Date()) {
  if (!weddingDate) return null;
  return Math.round((startOfDay(weddingDate) - startOfDay(now)) / 86400000);
}

export function displayTimelineStatus(status, dueDate, now = new Date()) {
  if (status === 'completed' || status === 'skipped') return status;
  if (dueDate && startOfDay(dueDate) < startOfDay(now)) return 'overdue';
  return status || 'upcoming';
}

export function withTimelineDisplay(events, now = new Date()) {
  return events.map((event) => {
    const json = event.toObject ? event.toObject() : event;
    return { ...json, displayStatus: displayTimelineStatus(json.status, json.dueDate, now) };
  });
}

function activeSelection(item) {
  return !['cancelled', 'rejected'].includes(item.status);
}

function selectionState(items, categories, orders = []) {
  const matches = items.filter((item) => categories.includes(item.category) && activeSelection(item));
  const matchingOrders = orders.filter((item) => categories.includes(item.category) && !['cancelled', 'rejected'].includes(item.status));
  if (!matches.length && !matchingOrders.length) return 'upcoming';
  if (
    matches.some((item) => CONFIRMED_SELECTION.includes(item.status) || item.paymentStatus === 'paid')
    || matchingOrders.some((item) => CONFIRMED_ORDER.includes(item.status))
  ) {
    return 'completed';
  }
  return 'in_progress';
}

function isGuestInvited(guest, invitations) {
  if (guest.rsvpStatus !== 'pending') return true;
  if (['sent', 'viewed'].includes(guest.invitationStatus)) return true;
  return invitations.some((invitation) => (
    String(invitation.guest) === String(guest._id)
    && ['sent', 'opened', 'responded'].includes(invitation.status)
  ));
}

export function computeBookingStats({ halls = [], orders = [], legacyBookings = [] } = {}) {
  const confirmedHalls = halls.filter((item) => CONFIRMED_HALL.includes(item.status));
  const pendingHalls = halls.filter((item) => PENDING_HALL.includes(item.status));
  const completedHalls = halls.filter((item) => item.status === 'completed');
  const serviceOrders = orders.filter((item) => !item.booking && !['cancelled', 'rejected'].includes(item.status));
  const confirmedServices = serviceOrders.filter((item) => CONFIRMED_ORDER.includes(item.status));
  const pendingServices = serviceOrders.filter((item) => item.status === 'pending');
  const completedServices = serviceOrders.filter((item) => item.status === 'completed');
  const legacyConfirmed = legacyBookings.filter((item) => LEGACY_CONFIRMED.includes(item.status));
  const legacyPending = legacyBookings.filter((item) => item.status === 'pending');
  const legacyCompleted = legacyBookings.filter((item) => item.status === 'completed');

  const confirmedVendorIds = new Set([
    ...confirmedHalls.map((item) => String(item.vendor || '')),
    ...confirmedServices.map((item) => String(item.vendor || '')),
    ...legacyConfirmed.map((item) => String(item.vendor || '')),
  ].filter(Boolean));
  const pendingVendorIds = new Set([
    ...pendingHalls.map((item) => String(item.vendor || '')),
    ...pendingServices.map((item) => String(item.vendor || '')),
    ...legacyPending.map((item) => String(item.vendor || '')),
  ].filter(Boolean));

  return {
    confirmedBookings: confirmedHalls.length + confirmedServices.length + legacyConfirmed.length,
    pendingBookings: pendingHalls.length + pendingServices.length + legacyPending.length,
    completedBookings: completedHalls.length + completedServices.length + legacyCompleted.length,
    confirmedVendors: confirmedVendorIds.size,
    pendingVendors: pendingVendorIds.size,
  };
}

export async function syncWeddingTimeline(weddingId) {
  if (!weddingId) return [];
  const wedding = await Wedding.findById(weddingId);
  if (!wedding) return [];
  await ensureDefaultTimeline(wedding);

  const [halls, selections, orders, guests, invitations, budget, events] = await Promise.all([
    HallBooking.find({ wedding: wedding._id, status: { $in: ACTIVE_HALL } }),
    WeddingSelection.find({ wedding: wedding._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Order.find({ wedding: wedding._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Guest.find({ wedding: wedding._id }),
    Invitation.find({ wedding: wedding._id }),
    computeWeddingBudget(wedding),
    TimelineEvent.find({ wedding: wedding._id }),
  ]);

  const confirmedHall = halls.some((item) => CONFIRMED_HALL.includes(item.status));
  const heldHall = halls.some((item) => PENDING_HALL.includes(item.status));
  const sentInvites = invitations.filter((item) => ['sent', 'opened', 'responded'].includes(item.status)).length;
  const allInvited = guests.length > 0 && guests.every((guest) => isGuestInvited(guest, invitations));

  const desired = {
    book_hall: confirmedHall ? 'completed' : heldHall ? 'in_progress' : 'upcoming',
    choose_bride_dress: selectionState(selections, ['bride_dress'], orders),
    choose_groom_suit: selectionState(selections, ['groom_attire'], orders),
    confirm_catering: selectionState(selections, ['catering'], orders),
    confirm_photographer: selectionState(selections, ['photography', 'videography'], orders),
    send_invitations: guests.length && allInvited ? 'completed' : sentInvites > 0 ? 'in_progress' : 'upcoming',
    final_guest_count: guests.length >= Number(wedding.expectedGuests || 0) && guests.length > 0
      ? 'completed'
      : guests.length > 0 ? 'in_progress' : 'upcoming',
    final_payment: Number(budget.totalPlannedCost) > 0 && Number(budget.totalAmountDue) <= 0
      ? 'completed'
      : Number(budget.totalPaid) > 0 || Number(budget.totalAmountDue) > 0
        ? (Number(budget.totalPaid) > 0 ? 'in_progress' : 'upcoming')
        : 'upcoming',
    wedding_day: daysRemaining(wedding.weddingDate) <= 0 ? 'completed' : 'upcoming',
  };

  for (const event of events) {
    if (event.status === 'skipped') continue;
    const next = desired[event.key];
    if (!next || event.status === next) continue;
    event.status = next;
    await event.save();
  }

  return TimelineEvent.find({ wedding: wedding._id }).sort({ sortOrder: 1, dueDate: 1 });
}

export async function syncWeddingTimelineSafe(weddingId) {
  try {
    return await syncWeddingTimeline(weddingId);
  } catch (error) {
    console.error('Wedding timeline sync failed:', error.message);
    return [];
  }
}

export function computeOverviewFromRecords({
  wedding,
  budget,
  halls = [],
  orders = [],
  guests = [],
  tasks = [],
  events = [],
  invitations = [],
  selections = [],
  legacyBookings = [],
} = {}) {
  const stats = computeBookingStats({ halls, orders, legacyBookings });
  const completedTasks = tasks.filter((item) => item.status === 'completed').length;
  const upcoming = withTimelineDisplay(events).filter((item) => !['completed', 'skipped'].includes(item.displayStatus));
  const planner = wedding.planner && typeof wedding.planner === 'object' ? wedding.planner : null;

  return {
    weddingDate: wedding.weddingDate,
    daysRemaining: daysRemaining(wedding.weddingDate),
    venueName: wedding.selectedVenue?.name || wedding.venue || null,
    hallName: wedding.selectedHall?.hallName || null,
    slot: wedding.selectedSlot || null,
    plannerName: planner ? `${planner.firstName || ''} ${planner.lastName || ''}`.trim() : null,
    plannerAssigned: Boolean(wedding.planner),
    totalBudget: budget.totalBudget,
    plannedCost: budget.totalPlannedCost,
    totalPaid: budget.totalPaid,
    amountDue: budget.totalAmountDue,
    remainingBudget: budget.remainingBudget,
    guestsAdded: guests.length,
    expectedGuests: Number(wedding.expectedGuests || 0),
    tasksCompleted: completedTasks,
    tasksTotal: tasks.length,
    tasksPercentage: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
    confirmedVendors: stats.confirmedVendors,
    pendingVendors: stats.pendingVendors,
    confirmedBookings: stats.confirmedBookings,
    pendingBookings: stats.pendingBookings,
    completedBookings: stats.completedBookings,
    invitationsSent: invitations.filter((item) => ['sent', 'opened', 'responded'].includes(item.status)).length,
    selectionsCount: selections.filter(activeSelection).length,
    upcomingTimeline: upcoming.slice(0, 5).map((item) => ({
      _id: item._id,
      title: item.title,
      status: item.displayStatus,
      dueDate: item.dueDate,
    })),
  };
}

const weddingPopulate = [
  { path: 'planner', select: 'firstName lastName email phone' },
  { path: 'selectedVenue', select: 'name city' },
  { path: 'selectedHall', select: 'hallName capacity' },
];

export async function computeWeddingOverview(weddingOrId) {
  const id = weddingOrId?._id || weddingOrId;
  const wedding = await Wedding.findById(id).populate(weddingPopulate);
  if (!wedding) return null;

  const [budget, halls, orders, guests, tasks, events, invitations, selections, legacyBookings] = await Promise.all([
    computeWeddingBudget(wedding),
    HallBooking.find({ wedding: wedding._id }),
    Order.find({ wedding: wedding._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Guest.find({ wedding: wedding._id }),
    Task.find({ wedding: wedding._id }),
    TimelineEvent.find({ wedding: wedding._id }).sort({ sortOrder: 1, dueDate: 1 }),
    Invitation.find({ wedding: wedding._id }),
    WeddingSelection.find({ wedding: wedding._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Booking.find({ wedding: wedding._id }),
  ]);

  return computeOverviewFromRecords({
    wedding,
    budget,
    halls,
    orders,
    guests,
    tasks,
    events,
    invitations,
    selections,
    legacyBookings,
  });
}
