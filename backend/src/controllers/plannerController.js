import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Guest from '../models/Guest.js';
import HallBooking from '../models/HallBooking.js';
import Invitation from '../models/Invitation.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import Task from '../models/Task.js';
import User from '../models/User.js';
import Wedding from '../models/Wedding.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { computeWeddingBudget } from '../utils/budgetTotals.js';
import { notify } from '../utils/notify.js';
import {
  computeOverviewFromRecords,
  syncWeddingTimeline,
  withTimelineDisplay,
} from '../utils/workspaceOverview.js';

async function assignedWedding(req, res, id) {
  const wedding = mongoose.isValidObjectId(id)
    ? await Wedding.findOne({ _id: id, planner: req.user._id })
      .populate('customer', 'firstName lastName email phone')
      .populate('planner', 'firstName lastName email phone')
      .populate('selectedVenue')
      .populate('selectedHall')
    : null;
  if (!wedding) {
    res.status(404);
    throw new Error('Assigned wedding not found');
  }
  return wedding;
}

export const getPlannerDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const weddings = await Wedding.find({ planner: req.user._id }).populate('customer', 'firstName lastName email');
  const weddingIds = weddings.map((wedding) => wedding._id);
  const [tasks, orders, hallBookings] = await Promise.all([
    Task.find({ wedding: { $in: weddingIds } }),
    Order.find({ wedding: { $in: weddingIds } }),
    HallBooking.find({ wedding: { $in: weddingIds } }),
  ]);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  res.json({
    success: true,
    summary: {
      assignedWeddings: weddings.length,
      upcomingWeddings: weddings.filter((w) => new Date(w.weddingDate) >= now && w.status !== 'cancelled').length,
      weddingsThisWeek: weddings.filter((w) => new Date(w.weddingDate) >= now && new Date(w.weddingDate) <= weekAhead).length,
      weddingsThisMonth: weddings.filter((w) => new Date(w.weddingDate) >= now && new Date(w.weddingDate) <= monthAhead).length,
      pendingTasks: tasks.filter((t) => t.status === 'pending' || t.status === 'todo').length,
      overdueTasks: tasks.filter((t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) < startOfToday).length,
      upcomingDeadlines: tasks.filter((t) => t.status !== 'completed' && t.dueDate && new Date(t.dueDate) >= startOfToday && new Date(t.dueDate) <= weekAhead).length,
      vendorConfirmations: orders.filter((o) => ['confirmed', 'in_progress', 'completed'].includes(o.status)).length,
      pendingVendorConfirmations: orders.filter((o) => o.status === 'pending').length,
      hallBookingStatus: {
        held: hallBookings.filter((b) => b.status === 'held').length,
        confirmed: hallBookings.filter((b) => b.status === 'confirmed').length,
        pending: hallBookings.filter((b) => b.status === 'pending').length,
      },
      serviceStatus: {
        pending: orders.filter((o) => o.status === 'pending').length,
        confirmed: orders.filter((o) => o.status === 'confirmed').length,
        inProgress: orders.filter((o) => o.status === 'in_progress').length,
        completed: orders.filter((o) => o.status === 'completed').length,
      },
      servicesPending: orders.filter((o) => o.status === 'pending').length,
    },
    weddings,
  });
});

export const getAssignedWeddings = asyncHandler(async (req, res) => {
  const weddings = await Wedding.find({ planner: req.user._id })
    .populate('customer', 'firstName lastName email phone')
    .populate('selectedVenue', 'name city')
    .populate('selectedHall', 'hallName')
    .sort({ weddingDate: 1 });
  res.json({ success: true, count: weddings.length, weddings });
});

export const getAssignedWedding = asyncHandler(async (req, res) => {
  const wedding = await assignedWedding(req, res, req.params.id);
  const timelineEvents = withTimelineDisplay(await syncWeddingTimeline(wedding._id));
  const [budget, guests, tasks, selections, orders, hallBookings, invitations, payments] = await Promise.all([
    computeWeddingBudget(wedding),
    Guest.find({ wedding: wedding._id }),
    Task.find({ wedding: wedding._id })
      .populate('createdBy', 'firstName lastName role')
      .populate('assignedTo', 'firstName lastName role')
      .populate('vendor', 'firstName lastName role'),
    WeddingSelection.find({ wedding: wedding._id, status: { $nin: ['cancelled'] } }).populate('vendor', 'firstName lastName'),
    Order.find({ wedding: wedding._id }).populate('vendor', 'firstName lastName'),
    HallBooking.find({ wedding: wedding._id }).populate('venue', 'name').populate('hall', 'hallName').populate('vendor', 'firstName lastName'),
    Invitation.find({ wedding: wedding._id }).populate('guest', 'firstName lastName rsvpStatus invitationStatus'),
    Payment.find({ wedding: wedding._id }).select('amount paymentType status paidAt transactionReference order booking'),
  ]);
  const overview = computeOverviewFromRecords({
    wedding,
    budget,
    halls: hallBookings,
    orders,
    guests,
    tasks,
    events: timelineEvents,
    selections,
  });
  const BRIDE = ['bride_dress', 'bride_shoes', 'accessories', 'bridal_salon', 'makeup', 'hair', 'bouquet'];
  const GROOM = ['groom_attire', 'groom_shoes', 'groom_salon'];
  res.json({
    success: true,
    wedding,
    overview,
    bride: selections.filter((item) => BRIDE.includes(item.category)),
    groom: selections.filter((item) => GROOM.includes(item.category)),
    budget: {
      planned: budget.totalPlannedCost,
      spent: budget.totalPaid,
      totalPaid: budget.totalPaid,
      outstanding: budget.outstandingPayments,
      remaining: budget.remainingBudget,
      categories: budget.categories,
      items: budget.items,
    },
    guests: {
      total: guests.length,
      expected: Number(wedding.expectedGuests || 0),
      accepted: guests.filter((x) => x.rsvpStatus === 'accepted').length,
      pending: guests.filter((x) => x.rsvpStatus === 'pending').length,
      declined: guests.filter((x) => x.rsvpStatus === 'declined').length,
      items: guests,
    },
    invitations: {
      total: invitations.length,
      draft: invitations.filter((item) => item.status === 'draft').length,
      sent: invitations.filter((item) => ['sent', 'opened', 'responded'].includes(item.status)).length,
      pending: guests.filter((item) => item.rsvpStatus === 'pending').length,
      accepted: guests.filter((item) => item.rsvpStatus === 'accepted').length,
      declined: guests.filter((item) => item.rsvpStatus === 'declined').length,
      items: invitations,
    },
    payments: {
      totalPaid: budget.totalPaid,
      amountDue: budget.outstandingPayments,
      remainingBudget: budget.remainingBudget,
      records: payments,
    },
    tasks: {
      total: tasks.length,
      completed: tasks.filter((x) => x.status === 'completed').length,
      percentage: overview.tasksPercentage,
      items: tasks,
    },
    selections,
    orders,
    hallBookings,
    timeline: timelineEvents,
  });
});

export const createPlannerTask = asyncHandler(async (req, res) => {
  const wedding = await assignedWedding(req, res, req.params.id);
  if (!String(req.body.title || '').trim()) {
    res.status(400);
    throw new Error('Task title is required');
  }
  const vendorId = mongoose.isValidObjectId(req.body.vendor || req.body.assignedTo)
    ? (req.body.vendor || req.body.assignedTo)
    : null;
  if (vendorId) {
    const related = await Order.exists({ wedding: wedding._id, vendor: vendorId, status: { $nin: ['cancelled', 'rejected'] } })
      || await HallBooking.exists({ wedding: wedding._id, vendor: vendorId, status: { $in: ['held', 'pending', 'confirmed'] } });
    const user = await User.findById(vendorId).select('role');
    if (!related || user?.role !== 'vendor') {
      res.status(403);
      throw new Error('You can only assign tasks to vendors working on this wedding');
    }
  }
  const task = await Task.create({
    wedding: wedding._id,
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    priority: req.body.priority,
    dueDate: req.body.dueDate || null,
    status: req.body.status === 'pending' ? 'todo' : (req.body.status || 'todo'),
    createdBy: req.user._id,
    assignedTo: vendorId,
    vendor: vendorId,
    service: mongoose.isValidObjectId(req.body.service) ? req.body.service : null,
  });
  if (vendorId) {
    await notify(vendorId, {
      title: 'New wedding task',
      message: `${req.body.title} was assigned to you for ${wedding.weddingName}.`,
      type: 'task_assigned',
      link: '/vendor/tasks',
      wedding: wedding._id,
    });
  }
  res.status(201).json({ success: true, task });
});

export const updatePlannerTask = asyncHandler(async (req, res) => {
  const task = mongoose.isValidObjectId(req.params.taskId) ? await Task.findById(req.params.taskId) : null;
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  const wedding = await Wedding.findOne({ _id: task.wedding, planner: req.user._id });
  if (!wedding) {
    res.status(403);
    throw new Error('You can only update tasks on assigned weddings');
  }
  for (const field of ['title', 'description', 'category', 'priority', 'dueDate', 'status', 'assignedTo']) {
    if (req.body[field] !== undefined) task[field] = req.body[field];
  }
  if (req.body.vendor !== undefined) {
    task.vendor = req.body.vendor || null;
    if (req.body.vendor && !req.body.assignedTo) task.assignedTo = req.body.vendor;
  }
  await task.save();
  res.json({ success: true, task });
});
