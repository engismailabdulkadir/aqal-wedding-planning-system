import asyncHandler from 'express-async-handler';
import Booking from '../models/Booking.js';
import Guest from '../models/Guest.js';
import HallBooking from '../models/HallBooking.js';
import Invitation from '../models/Invitation.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Task from '../models/Task.js';
import TimelineEvent from '../models/TimelineEvent.js';
import User from '../models/User.js';
import Venue from '../models/Venue.js';
import Hall from '../models/Hall.js';
import Wedding from '../models/Wedding.js';
import WeddingListing from '../models/WeddingListing.js';
import { computeWeddingBudget } from '../utils/budgetTotals.js';
import { isSuccessfulStatus } from '../utils/paymentSettlement.js';
import { loadAccessibleWedding } from '../utils/weddingAccess.js';
import { computeBookingStats } from '../utils/workspaceOverview.js';

function guestStats(guests) {
  return {
    expected: guests.length,
    added: guests.length,
    accepted: guests.filter((g) => g.rsvpStatus === 'accepted').length,
    pending: guests.filter((g) => g.rsvpStatus === 'pending').length,
    declined: guests.filter((g) => g.rsvpStatus === 'declined').length,
    expectedAttendees: guests.filter((g) => g.rsvpStatus === 'accepted').reduce((n, g) => n + (g.numberAttending || 1), 0),
  };
}

function taskStats(tasks) {
  const now = new Date();
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return {
    total: tasks.length,
    completed,
    pending: tasks.filter((t) => t.status === 'pending' || t.status === 'todo').length,
    inProgress: tasks.filter((t) => t.status === 'in_progress').length,
    overdue: tasks.filter((t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < now).length,
    completionPercentage: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}

async function customerReport(req, res) {
  const weddingDocument = await loadAccessibleWedding(req, res, { required: false });
  if (!weddingDocument) return res.json({ success: true, report: null });
  const wedding = weddingDocument.toObject();
  const [budget, guests, tasks, orders, hallBookings, invitations, payments, legacyBookings] = await Promise.all([
    computeWeddingBudget(weddingDocument),
    Guest.find({ wedding: wedding._id }).lean(),
    Task.find({ wedding: wedding._id }).lean(),
    Order.find({ wedding: wedding._id }).lean(),
    HallBooking.find({ wedding: wedding._id }).lean(),
    Invitation.find({ wedding: wedding._id }).lean(),
    Payment.find({ wedding: wedding._id }).lean(),
    Booking.find({ wedding: wedding._id }).lean(),
  ]);
  const paidPayments = payments.filter((p) => isSuccessfulStatus(p.status) && p.paymentType !== 'refund');
  const bookingStats = computeBookingStats({ halls: hallBookings, orders, legacyBookings });
  res.json({
    success: true,
    report: {
      wedding,
      budget: {
        estimated: budget.estimatedBudget,
        planned: budget.totalPlannedCost,
        spent: budget.totalPaid,
        remaining: budget.remainingBudget,
        outstanding: budget.outstandingPayments,
        categories: budget.categories.map((c) => ({ ...c, difference: c.planned - c.paid })),
      },
      guests: { ...guestStats(guests), expected: wedding.expectedGuests, added: guests.length },
      tasks: taskStats(tasks),
      services: {
        selections: orders.length,
        confirmed: orders.filter((o) => ['confirmed', 'in_progress', 'completed'].includes(o.status)).length,
        pending: orders.filter((o) => o.status === 'pending').length,
      },
      bookings: {
        total: bookingStats.confirmedBookings + bookingStats.pendingBookings,
        pending: bookingStats.pendingBookings,
        accepted: bookingStats.confirmedBookings,
        rejected: hallBookings.filter((b) => b.status === 'cancelled').length + legacyBookings.filter((b) => b.status === 'rejected').length,
        completed: bookingStats.completedBookings,
        confirmedVendors: bookingStats.confirmedVendors,
      },
      payments: {
        count: paidPayments.length,
        totalPaid: paidPayments.reduce((n, p) => n + p.amount, 0),
        outstanding: budget.outstandingPayments,
      },
      invitations: {
        total: invitations.length,
        sent: invitations.filter((i) => ['sent', 'opened', 'responded'].includes(i.status)).length,
        responded: invitations.filter((i) => i.status === 'responded').length,
      },
    },
  });
}

async function plannerReport(req, res) {
  const weddings = await Wedding.find({ planner: req.user._id });
  const ids = weddings.map((w) => w._id);
  const [tasks, orders, hallBookings, timeline] = await Promise.all([
    Task.find({ wedding: { $in: ids } }),
    Order.find({ wedding: { $in: ids } }),
    HallBooking.find({ wedding: { $in: ids } }),
    TimelineEvent.find({ wedding: { $in: ids } }),
  ]);
  res.json({
    success: true,
    report: {
      assignedWeddings: weddings.length,
      taskCompletion: taskStats(tasks),
      timelineStatus: {
        total: timeline.length,
        completed: timeline.filter((t) => t.status === 'completed').length,
        upcoming: timeline.filter((t) => t.status === 'upcoming').length,
      },
      vendorStatus: {
        pending: orders.filter((o) => o.status === 'pending').length,
        confirmed: orders.filter((o) => o.status === 'confirmed').length,
        inProgress: orders.filter((o) => o.status === 'in_progress').length,
        completed: orders.filter((o) => o.status === 'completed').length,
      },
      serviceConfirmations: orders.filter((o) => ['confirmed', 'in_progress', 'completed'].includes(o.status)).length,
      hallBookings: {
        held: hallBookings.filter((b) => b.status === 'held').length,
        confirmed: hallBookings.filter((b) => b.status === 'confirmed').length,
      },
      weddings: weddings.map((w) => ({ _id: w._id, weddingName: w.weddingName, weddingDate: w.weddingDate, city: w.city })),
    },
  });
}

async function vendorReport(req, res) {
  const [orders, hallBookings, payments] = await Promise.all([
    Order.find({ vendor: req.user._id }),
    HallBooking.find({ vendor: req.user._id }),
    Payment.find({ vendor: req.user._id }),
  ]);
  const received = payments.filter((p) => isSuccessfulStatus(p.status) && p.paymentType !== 'refund');
  res.json({
    success: true,
    report: {
      bookings: hallBookings.length,
      orders: orders.length,
      completedServices: orders.filter((o) => o.status === 'completed').length,
      revenue: received.reduce((n, p) => n + p.amount, 0),
      payments: received.length,
      byStatus: {
        pending: orders.filter((o) => o.status === 'pending').length,
        confirmed: orders.filter((o) => o.status === 'confirmed').length,
        inProgress: orders.filter((o) => o.status === 'in_progress').length,
        completed: orders.filter((o) => o.status === 'completed').length,
        rejected: orders.filter((o) => o.status === 'rejected').length,
      },
    },
  });
}

async function adminReport(_req, res) {
  const [
    users, customers, planners, vendors, weddings, hallBookings, orders, payments, listings,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'customer' }),
    User.countDocuments({ role: 'planner' }),
    User.countDocuments({ role: 'vendor' }),
    Wedding.countDocuments(),
    HallBooking.find(),
    Order.find(),
    Payment.find(),
    WeddingListing.find({ status: 'active', active: true }),
  ]);
  const successful = payments.filter((p) => isSuccessfulStatus(p.status) && p.paymentType !== 'refund');
  const popularServices = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled', 'rejected'] } } },
    { $group: { _id: '$category', count: { $sum: 1 }, revenue: { $sum: '$amountPaid' } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
  ]);
  const hallUtilization = await HallBooking.aggregate([
    { $match: { status: { $in: ['held', 'confirmed', 'completed'] } } },
    { $group: { _id: '$hall', bookings: { $sum: 1 } } },
    { $sort: { bookings: -1 } },
    { $limit: 8 },
  ]);
  const halls = await Hall.find({ _id: { $in: hallUtilization.map((h) => h._id) } }).populate('venue', 'name');
  const hallMap = Object.fromEntries(halls.map((h) => [String(h._id), `${h.venue?.name || ''} · ${h.hallName}`]));
  const trends = await HallBooking.aggregate([
    { $match: { status: { $in: ['confirmed', 'completed'] } } },
    { $group: { _id: { $substr: ['$bookingDate', 0, 7] }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
    { $limit: 12 },
  ]);
  const vendorPerformance = await Order.aggregate([
    { $match: { status: { $nin: ['cancelled'] } } },
    { $group: { _id: '$vendor', orders: { $sum: 1 }, revenue: { $sum: '$amountPaid' }, completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } } } },
    { $sort: { revenue: -1 } },
    { $limit: 8 },
  ]);

  res.json({
    success: true,
    report: {
      users,
      customers,
      planners,
      vendors,
      weddings,
      bookings: hallBookings.length,
      orders: orders.length,
      payments: successful.length,
      revenue: successful.reduce((n, p) => n + p.amount, 0),
      popularServices,
      hallUtilization: hallUtilization.map((row) => ({ hall: hallMap[String(row._id)] || String(row._id), bookings: row.bookings })),
      vendorPerformance,
      bookingTrends: trends,
      listings: listings.length,
      venues: await Venue.countDocuments({ status: 'active' }),
    },
  });
}

export const getReport = asyncHandler(async (req, res) => {
  if (req.user.role === 'customer') return customerReport(req, res);
  if (req.user.role === 'planner') return plannerReport(req, res);
  if (req.user.role === 'vendor') return vendorReport(req, res);
  if (req.user.role === 'admin') return adminReport(req, res);
  res.status(403);
  throw new Error('Not allowed');
});
