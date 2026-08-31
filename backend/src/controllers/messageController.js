import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import Conversation from '../models/Conversation.js';
import HallBooking from '../models/HallBooking.js';
import Message from '../models/Message.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Wedding from '../models/Wedding.js';
import { notify } from '../utils/notify.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';

function participant(conversation, userId) {
  return conversation.participants.some((id) => id.equals(userId));
}

async function relatedVendor(customerId, vendorId, weddingId) {
  const [order, hall, legacy] = await Promise.all([
    Order.exists({ customer: customerId, vendor: vendorId, wedding: weddingId, status: { $nin: ['cancelled', 'rejected'] } }),
    HallBooking.exists({ customer: customerId, vendor: vendorId, wedding: weddingId, status: { $in: ['held', 'pending', 'confirmed'] } }),
    mongoose.models.Booking ? Booking.exists({ customer: customerId, vendor: vendorId, wedding: weddingId }) : null,
  ]);
  return Boolean(order || hall || legacy);
}

export const listConversations = asyncHandler(async (req, res) => {
  const filter = { participants: req.user._id };
  if (req.user.role === 'customer') {
    const wedding = await resolveOwnedWedding(req, res, { required: false });
    if (wedding) filter.wedding = wedding._id;
  } else if (req.user.role === 'planner' && req.query.weddingId) {
    const assigned = await Wedding.exists({ _id: req.query.weddingId, planner: req.user._id });
    if (!assigned) {
      res.status(403);
      throw new Error('You can only view assigned weddings');
    }
    filter.wedding = req.query.weddingId;
  }
  const conversations = await Conversation.find(filter)
    .populate('participants', 'firstName lastName role')
    .populate('order', 'itemName')
    .populate({ path: 'booking', select: 'serviceName vendorProfile', populate: { path: 'vendorProfile', select: 'businessName' } })
    .sort({ lastMessageAt: -1, updatedAt: -1 })
    .lean();
  const ids = conversations.map((conversation) => conversation._id);
  const latest = ids.length
    ? await Message.aggregate([
      { $match: { conversation: { $in: ids } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$conversation', text: { $first: '$text' }, createdAt: { $first: '$createdAt' } } },
    ])
    : [];
  const map = new Map(latest.map((message) => [String(message._id), message]));
  res.json({ success: true, conversations: conversations.map((conversation) => ({ ...conversation, lastMessage: map.get(String(conversation._id)) || null })) });
});

export const createConversation = asyncHandler(async (req, res) => {
  const recipient = mongoose.isValidObjectId(req.body.recipient || req.body.user)
    ? await User.findById(req.body.recipient || req.body.user)
    : null;

  if (req.user.role === 'admin') {
    if (!recipient) {
      res.status(404);
      throw new Error('Recipient not found');
    }
    const wedding = mongoose.isValidObjectId(req.body.weddingId) ? await Wedding.findById(req.body.weddingId) : await Wedding.findOne({ customer: recipient.role === 'customer' ? recipient._id : req.body.customer });
    if (!wedding) {
      res.status(400);
      throw new Error('Select a wedding for this conversation');
    }
    let conversation = await Conversation.findOne({ wedding: wedding._id, participants: { $all: [req.user._id, recipient._id] } });
    if (!conversation) conversation = await Conversation.create({ participants: [req.user._id, recipient._id], wedding: wedding._id });
    await conversation.populate('participants', 'firstName lastName role');
    return res.status(201).json({ success: true, conversation });
  }

  if (req.user.role === 'customer') {
    const wedding = await resolveOwnedWedding(req, res);
    let vendorId = null;
    let plannerId = null;
    let order = null;
    let hallBooking = null;
    let legacyBooking = null;

    if (req.body.withPlanner || recipient?.role === 'planner') {
      if (!wedding.planner) {
        res.status(409);
        throw new Error('No planner is assigned to this wedding');
      }
      plannerId = wedding.planner;
    } else if (mongoose.isValidObjectId(req.body.orderId)) {
      order = await Order.findOne({ _id: req.body.orderId, customer: req.user._id, wedding: wedding._id });
      vendorId = order?.vendor;
    } else if (mongoose.isValidObjectId(req.body.hallBookingId) || mongoose.isValidObjectId(req.body.booking)) {
      const bookingId = req.body.hallBookingId || req.body.booking;
      hallBooking = await HallBooking.findOne({ _id: bookingId, customer: req.user._id, wedding: wedding._id });
      if (hallBooking) vendorId = hallBooking.vendor;
      else {
        legacyBooking = await Booking.findOne({ _id: bookingId, customer: req.user._id, wedding: wedding._id });
        vendorId = legacyBooking?.vendor;
      }
    } else if (recipient?.role === 'vendor') {
      const allowed = await relatedVendor(req.user._id, recipient._id, wedding._id);
      if (!allowed) {
        res.status(403);
        throw new Error('You can only message vendors related to a booking or order');
      }
      vendorId = recipient._id;
    }

    const other = plannerId || vendorId;
    if (!other) {
      res.status(400);
      throw new Error('Select a related planner or vendor');
    }
    let conversation = await Conversation.findOne({ wedding: wedding._id, participants: { $all: [req.user._id, other] } });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, other],
        wedding: wedding._id,
        order: order?._id || null,
        hallBooking: hallBooking?._id || null,
        booking: legacyBooking?._id || null,
      });
    }
    await conversation.populate('participants', 'firstName lastName role');
    return res.status(201).json({ success: true, conversation });
  }

  if (req.user.role === 'planner') {
    const wedding = mongoose.isValidObjectId(req.body.weddingId)
      ? await Wedding.findOne({ _id: req.body.weddingId, planner: req.user._id })
      : null;
    if (!wedding) {
      res.status(403);
      throw new Error('You can only message people on assigned weddings');
    }
    let other = null;
    if (recipient?.role === 'customer' && recipient._id.equals(wedding.customer)) other = recipient._id;
    else if (recipient?.role === 'vendor') {
      const related = await Order.exists({ wedding: wedding._id, vendor: recipient._id })
        || await HallBooking.exists({ wedding: wedding._id, vendor: recipient._id });
      if (!related) {
        res.status(403);
        throw new Error('You can only message vendors working on this wedding');
      }
      other = recipient._id;
    }
    if (!other) {
      res.status(400);
      throw new Error('Select a related customer or vendor');
    }
    let conversation = await Conversation.findOne({ wedding: wedding._id, participants: { $all: [req.user._id, other] } });
    if (!conversation) conversation = await Conversation.create({ participants: [req.user._id, other], wedding: wedding._id });
    await conversation.populate('participants', 'firstName lastName role');
    return res.status(201).json({ success: true, conversation });
  }

  if (req.user.role === 'vendor') {
    const order = mongoose.isValidObjectId(req.body.orderId)
      ? await Order.findOne({ _id: req.body.orderId, vendor: req.user._id })
      : null;
    const hallBooking = mongoose.isValidObjectId(req.body.hallBookingId)
      ? await HallBooking.findOne({ _id: req.body.hallBookingId, vendor: req.user._id })
      : null;
    const weddingId = order?.wedding || hallBooking?.wedding;
    const customerId = order?.customer || hallBooking?.customer;
    if (!weddingId || !customerId) {
      res.status(403);
      throw new Error('You can only message customers related to your orders');
    }
    if (req.body.withPlanner || recipient?.role === 'planner') {
      const weddingDoc = await Wedding.findById(weddingId).select('planner');
      if (!weddingDoc?.planner) {
        res.status(409);
        throw new Error('No planner is assigned to this wedding');
      }
      if (recipient && !recipient._id.equals(weddingDoc.planner)) {
        res.status(403);
        throw new Error('You can only message the assigned planner');
      }
      let plannerConversation = await Conversation.findOne({ wedding: weddingId, participants: { $all: [req.user._id, weddingDoc.planner] } });
      if (!plannerConversation) {
        plannerConversation = await Conversation.create({
          participants: [req.user._id, weddingDoc.planner],
          wedding: weddingId,
          order: order?._id || null,
          hallBooking: hallBooking?._id || null,
        });
      }
      await plannerConversation.populate('participants', 'firstName lastName role');
      return res.status(201).json({ success: true, conversation: plannerConversation });
    }
    let conversation = await Conversation.findOne({ wedding: weddingId, participants: { $all: [req.user._id, customerId] } });
    if (!conversation) conversation = await Conversation.create({ participants: [req.user._id, customerId], wedding: weddingId, order: order?._id || null, hallBooking: hallBooking?._id || null });
    await conversation.populate('participants', 'firstName lastName role');
    return res.status(201).json({ success: true, conversation });
  }

  res.status(403);
  throw new Error('Not allowed');
});

export const listMessages = asyncHandler(async (req, res) => {
  const conversation = mongoose.isValidObjectId(req.params.id) ? await Conversation.findById(req.params.id) : null;
  if (!conversation || !participant(conversation, req.user._id)) {
    res.status(404);
    throw new Error('Conversation not found');
  }
  const messages = await Message.find({ conversation: conversation._id }).populate('sender', 'firstName lastName role').sort({ createdAt: 1 });
  await Message.updateMany({ conversation: conversation._id, readBy: { $ne: req.user._id } }, { $addToSet: { readBy: req.user._id } });
  res.json({ success: true, messages });
});

export const sendMessage = asyncHandler(async (req, res) => {
  const conversation = mongoose.isValidObjectId(req.params.id) ? await Conversation.findById(req.params.id) : null;
  if (!conversation || !participant(conversation, req.user._id)) {
    res.status(404);
    throw new Error('Conversation not found');
  }
  const text = String(req.body.text || req.body.message || '').trim();
  if (!text) {
    res.status(400);
    throw new Error('Message text is required');
  }
  const message = await Message.create({ conversation: conversation._id, sender: req.user._id, text, readBy: [req.user._id] });
  conversation.lastMessageAt = message.createdAt;
  await conversation.save();
  await message.populate('sender', 'firstName lastName role');
  const others = conversation.participants.filter((id) => !id.equals(req.user._id));
  await Promise.all(others.map((userId) => notify(userId, {
    title: 'New message',
    message: text.slice(0, 120),
    type: 'customer_message',
    link: req.user.role === 'customer' ? '/vendor/messages' : '/messages',
    wedding: conversation.wedding,
  })));
  res.status(201).json({ success: true, message });
});
