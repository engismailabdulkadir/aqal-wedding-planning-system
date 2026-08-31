import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import Wedding from '../models/Wedding.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { notify } from '../utils/notify.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';

const populate = [
  { path: 'vendor', select: 'firstName lastName' },
  { path: 'service', select: 'name category price city' },
  { path: 'customer', select: 'firstName lastName email phone' },
  { path: 'wedding', select: 'weddingName weddingDate city' },
];

export const listOrders = asyncHandler(async (req, res) => {
  const filter = {};
  if (req.user.role === 'customer') {
    const wedding = await resolveOwnedWedding(req, res, { required: false });
    filter.customer = req.user._id;
    if (wedding) filter.wedding = wedding._id;
  } else if (req.user.role === 'vendor') {
    filter.vendor = req.user._id;
  } else if (req.user.role === 'planner') {
    const weddingId = req.query.weddingId;
    const wedding = mongoose.isValidObjectId(weddingId)
      ? await Wedding.findOne({ _id: weddingId, planner: req.user._id })
      : null;
    if (!wedding) {
      res.status(403);
      throw new Error('You can only view orders for assigned weddings');
    }
    filter.wedding = wedding._id;
  } else if (req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Not allowed');
  }
  const orders = await Order.find(filter).populate(populate).sort({ createdAt: -1 });
  res.json({ success: true, orders });
});

export const getOrder = asyncHandler(async (req, res) => {
  const order = mongoose.isValidObjectId(req.params.id) ? await Order.findById(req.params.id).populate(populate) : null;
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const allowed = order.customer.equals(req.user._id)
    || order.vendor.equals(req.user._id)
    || req.user.role === 'admin'
    || (req.user.role === 'planner' && await Wedding.exists({ _id: order.wedding, planner: req.user._id }));
  if (!allowed) {
    res.status(403);
    throw new Error('You cannot view this order');
  }
  res.json({ success: true, order });
});

const VENDOR_TRANSITIONS = {
  pending: ['confirmed', 'rejected'],
  confirmed: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
};

export const updateVendorOrder = asyncHandler(async (req, res) => {
  if (req.user.role !== 'vendor') {
    res.status(403);
    throw new Error('Vendor access required');
  }
  const order = mongoose.isValidObjectId(req.params.id)
    ? await Order.findOne({ _id: req.params.id, vendor: req.user._id })
    : null;
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  const next = req.body.status;
  const allowed = VENDOR_TRANSITIONS[order.status] || [];
  if (!allowed.includes(next)) {
    res.status(409);
    throw new Error('Invalid order status transition');
  }
  order.status = next;
  if (req.body.notes !== undefined) order.notes = req.body.notes;
  await order.save();
  if (order.selection) {
    const selection = await WeddingSelection.findById(order.selection);
    if (selection) {
      if (next === 'confirmed' && !['paid', 'fulfilled', 'completed'].includes(selection.status)) selection.status = 'confirmed';
      if (next === 'in_progress' && !['paid', 'fulfilled', 'completed'].includes(selection.status)) selection.status = 'confirmed';
      if (next === 'completed') selection.status = 'completed';
      if (next === 'rejected') selection.status = 'rejected';
      if (next === 'cancelled' && !['paid', 'fulfilled', 'completed'].includes(selection.status)) selection.status = 'cancelled';
      await selection.save();
    }
  }
  const type = next === 'rejected' ? 'booking_rejected' : 'vendor_response';
  await notify(order.customer, {
    title: next === 'rejected' ? 'Order rejected' : `Order ${next.replace('_', ' ')}`,
    message: `${order.itemName} is now ${next.replace('_', ' ')}.`,
    type,
    link: '/workspace',
    wedding: order.wedding,
  });
  const wedding = await Wedding.findById(order.wedding).select('planner weddingName');
  if (wedding?.planner) {
    await notify(wedding.planner, {
      title: `${order.itemName} ${next.replace('_', ' ')}`,
      message: `A vendor updated ${order.itemName} to ${next.replace('_', ' ')} for ${wedding.weddingName}.`,
      type: 'vendor_response',
      link: `/planner/weddings/${wedding._id}`,
      wedding: wedding._id,
    });
  }
  await syncWeddingTimelineSafe(order.wedding);
  res.json({ success: true, order });
});
