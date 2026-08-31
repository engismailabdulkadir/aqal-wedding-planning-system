import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Conversation from '../models/Conversation.js';
import Guest from '../models/Guest.js';
import HallBooking from '../models/HallBooking.js';
import Invitation from '../models/Invitation.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Task from '../models/Task.js';
import Wedding from '../models/Wedding.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { computeWeddingBudget } from '../utils/budgetTotals.js';
import { currentHallBooking } from '../utils/hallReplacement.js';
import { resolveWeddingForCustomerEdit } from '../utils/ownedWedding.js';
import { loadAccessibleWedding } from '../utils/weddingAccess.js';
import {
  computeOverviewFromRecords,
  computeWeddingOverview,
  syncWeddingTimeline,
  withTimelineDisplay,
} from '../utils/workspaceOverview.js';

const BRIDE = ['bride_dress', 'bride_shoes', 'accessories', 'bridal_salon', 'makeup', 'hair', 'bouquet'];
const GROOM = ['groom_attire', 'groom_shoes', 'groom_salon'];
const SERVICES = ['flowers', 'decoration', 'catering', 'photography', 'videography', 'cake', 'transportation', 'entertainment', 'invitation', 'accommodation', 'equipment', 'other'];

const weddingPopulate = [
  { path: 'planner', select: 'firstName lastName email phone' },
  { path: 'selectedVenue', select: 'name city district address coverImage images imageIsPlaceholder imageSource' },
  { path: 'selectedHall', select: 'hallName capacity minimumCapacity facilities description venue' },
];

const hallPopulate = [
  { path: 'venue', select: 'name city district address coverImage images imageIsPlaceholder imageSource' },
  { path: 'hall', select: 'hallName capacity minimumCapacity facilities parking kitchen stage description' },
  { path: 'vendor', select: 'firstName lastName' },
];

const selectionPopulate = [
  { path: 'listing', select: 'name listingType description city available active category availabilityType metadata images price' },
  { path: 'vendor', select: 'firstName lastName' },
  { path: 'listing', populate: { path: 'vendorProfile', select: 'businessName' } },
];

const orderPopulate = [
  { path: 'vendor', select: 'firstName lastName' },
  { path: 'service', select: 'name category' },
];

function groupSelections(items, categories) {
  return items.filter((item) => categories.includes(item.category) && !['cancelled', 'rejected'].includes(item.status));
}

function plannerSnapshot(wedding, tasks, overview) {
  if (!wedding.planner) {
    return {
      assigned: false,
      name: null,
      email: null,
      phone: '',
      status: 'unassigned',
      weddingProgress: overview.tasksPercentage,
      plannerTasks: [],
      upcomingDeadlines: [],
      vendorCoordination: {
        confirmed: overview.confirmedVendors,
        pending: overview.pendingVendors,
        confirmedBookings: overview.confirmedBookings,
        pendingBookings: overview.pendingBookings,
      },
      message: 'An administrator assigns wedding planners. You can view planner details here once assigned.',
    };
  }
  const plannerId = String(wedding.planner._id || wedding.planner);
  const plannerTasks = tasks.filter((task) => task.createdBy && String(task.createdBy) === plannerId);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingDeadlines = tasks
    .filter((task) => task.status !== 'completed' && task.dueDate && new Date(task.dueDate) >= startOfToday)
    .sort((left, right) => new Date(left.dueDate) - new Date(right.dueDate))
    .slice(0, 6);
  return {
    assigned: true,
    name: `${wedding.planner.firstName} ${wedding.planner.lastName}`.trim(),
    email: wedding.planner.email,
    phone: wedding.planner.phone || '',
    status: 'assigned',
    weddingProgress: overview.tasksPercentage,
    plannerTasks,
    upcomingDeadlines,
    vendorCoordination: {
      confirmed: overview.confirmedVendors,
      pending: overview.pendingVendors,
      confirmedBookings: overview.confirmedBookings,
      pendingBookings: overview.pendingBookings,
    },
  };
}

export const getWeddingOverview = asyncHandler(async (req, res) => {
  req.headers['x-wedding-id'] = String(req.params.id);
  const wedding = await loadAccessibleWedding(req, res, { required: false });
  if (!wedding) return res.json({ success: true, overview: null });
  if (String(wedding._id) !== String(req.params.id)) {
    res.status(404);
    throw new Error('Wedding not found');
  }
  await syncWeddingTimeline(wedding._id);
  const overview = await computeWeddingOverview(wedding);
  res.json({ success: true, overview });
});

export const getWeddingManagement = asyncHandler(async (req, res) => {
  const access = await resolveWeddingForCustomerEdit(req, res, { weddingId: req.params.id });
  const wedding = await Wedding.findById(access._id).populate(weddingPopulate);
  if (!wedding) {
    res.status(404);
    throw new Error('Wedding not found');
  }

  const timelineEvents = withTimelineDisplay(await syncWeddingTimeline(wedding._id));

  const [
    currentHall,
    hallBookings,
    selections,
    guests,
    tasks,
    invitations,
    orders,
    payments,
    vendorBookings,
    conversations,
  ] = await Promise.all([
    currentHallBooking(wedding._id),
    HallBooking.find({ wedding: wedding._id }).populate(hallPopulate).sort({ createdAt: -1 }),
    WeddingSelection.find({ wedding: wedding._id }).populate(selectionPopulate).sort({ createdAt: -1 }),
    Guest.find({ wedding: wedding._id }).sort({ createdAt: -1 }),
    Task.find({ wedding: wedding._id }).populate('createdBy', 'firstName lastName role').sort({ dueDate: 1, createdAt: -1 }),
    Invitation.find({ wedding: wedding._id }).populate('guest', 'firstName lastName invitationStatus rsvpStatus').sort({ createdAt: -1 }),
    Order.find({ wedding: wedding._id }).populate(orderPopulate).sort({ createdAt: -1 }),
    Payment.find({ wedding: wedding._id }).sort({ createdAt: -1 }),
    Booking.find({ wedding: wedding._id }).populate('vendor', 'firstName lastName').sort({ createdAt: -1 }),
    Conversation.find({ wedding: wedding._id })
      .populate('participants', 'firstName lastName role')
      .populate('order', 'itemName')
      .sort({ lastMessageAt: -1, updatedAt: -1 }),
  ]);

  const budget = await computeWeddingBudget(wedding);
  const overview = computeOverviewFromRecords({
    wedding,
    budget,
    halls: hallBookings,
    orders,
    guests,
    tasks,
    events: timelineEvents,
    invitations,
    selections,
    legacyBookings: vendorBookings,
  });

  const guestSummary = guests.reduce((summary, guest) => {
    summary.totalGuests += 1;
    if (guest.rsvpStatus === 'accepted') {
      summary.accepted += 1;
      summary.expectedAttendees += guest.numberAttending || 1;
    }
    if (guest.rsvpStatus === 'pending') summary.pending += 1;
    if (guest.rsvpStatus === 'declined') summary.declined += 1;
    if (guest.invitationStatus === 'sent') summary.invitationsSent += 1;
    if (guest.invitationStatus === 'viewed') summary.invitationsViewed += 1;
    return summary;
  }, {
    totalGuests: 0, accepted: 0, pending: 0, declined: 0, expectedAttendees: 0,
    invitationsSent: 0, invitationsViewed: 0, expectedGuests: Number(wedding.expectedGuests || 0),
  });

  const completedTasks = tasks.filter((task) => task.status === 'completed').length;
  const successfulPayments = payments.filter((payment) => ['successful', 'paid'].includes(payment.status));

  res.json({
    success: true,
    wedding,
    overview,
    hall: {
      current: currentHall,
      bookings: hallBookings,
    },
    bride: groupSelections(selections, BRIDE),
    groom: groupSelections(selections, GROOM),
    services: groupSelections(selections, SERVICES),
    selections,
    planner: plannerSnapshot(wedding, tasks, overview),
    guests: { summary: guestSummary, count: guests.length, items: guests },
    tasks: {
      summary: {
        total: tasks.length,
        completed: completedTasks,
        open: tasks.length - completedTasks,
        percentage: overview.tasksPercentage,
      },
      items: tasks,
    },
    timeline: { count: timelineEvents.length, events: timelineEvents },
    invitations: {
      summary: {
        total: invitations.length,
        sent: invitations.filter((item) => ['sent', 'opened', 'responded'].includes(item.status)).length,
      },
      items: invitations,
    },
    budget: {
      totalBudget: budget.totalBudget,
      totalPlannedCost: budget.totalPlannedCost,
      totalPaid: budget.totalPaid,
      totalAmountDue: budget.totalAmountDue,
      remainingBudget: budget.remainingBudget,
      overBudget: budget.overBudget,
    },
    bookings: {
      hall: hallBookings,
      vendors: vendorBookings,
      orders,
    },
    payments: {
      records: payments,
      successful: successfulPayments,
      summary: {
        totalPaid: budget.totalPaid,
        totalDue: budget.totalAmountDue,
        count: payments.length,
      },
    },
    conversations,
    links: {
      guests: '/guests',
      tasks: '/tasks',
      timeline: '/timeline',
      invitations: '/invitations',
      budget: '/budget',
      bookings: '/bookings/center',
      payments: '/payments',
      messages: '/messages',
    },
  });
});
