import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import crypto from 'crypto';
import Announcement from '../models/Announcement.js';
import Notification, { NOTIFICATION_PRIORITIES, NOTIFICATION_TYPES } from '../models/Notification.js';
import Order from '../models/Order.js';
import User from '../models/User.js';
import Wedding from '../models/Wedding.js';

const MANUAL_TYPES = ['general', 'wedding', 'booking', 'payment', 'task', 'planner', 'vendor', 'warning', 'announcement', 'system'];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

async function resolveRecipients({ recipientType, recipientIds = [], weddingId }) {
  const active = { isActive: true };

  if (recipientType === 'specific' || recipientType === 'user') {
    const ids = (recipientIds || []).filter((id) => mongoose.isValidObjectId(id));
    if (!ids.length) return [];
    return User.find({ _id: { $in: ids }, ...active }).select('_id role firstName lastName');
  }

  if (recipientType === 'customers') {
    if (recipientIds?.length) {
      const ids = recipientIds.filter((id) => mongoose.isValidObjectId(id));
      return User.find({ _id: { $in: ids }, role: 'customer', ...active }).select('_id role firstName lastName');
    }
    return User.find({ role: 'customer', ...active }).select('_id role firstName lastName');
  }

  if (recipientType === 'planners') {
    if (recipientIds?.length) {
      const ids = recipientIds.filter((id) => mongoose.isValidObjectId(id));
      return User.find({ _id: { $in: ids }, role: 'planner', ...active }).select('_id role firstName lastName');
    }
    return User.find({ role: 'planner', ...active }).select('_id role firstName lastName');
  }

  if (recipientType === 'vendors') {
    if (recipientIds?.length) {
      const ids = recipientIds.filter((id) => mongoose.isValidObjectId(id));
      return User.find({ _id: { $in: ids }, role: 'vendor', ...active }).select('_id role firstName lastName');
    }
    return User.find({ role: 'vendor', ...active }).select('_id role firstName lastName');
  }

  if (recipientType === 'wedding_participants') {
    if (!mongoose.isValidObjectId(weddingId)) return [];
    const wedding = await Wedding.findById(weddingId).select('customer planner');
    if (!wedding) return [];
    const ids = new Set();
    if (wedding.customer) ids.add(String(wedding.customer));
    if (wedding.planner) ids.add(String(wedding.planner));
    const orders = await Order.find({
      wedding: wedding._id,
      status: { $nin: ['cancelled', 'rejected'] },
    }).select('vendor');
    orders.forEach((order) => {
      if (order.vendor) ids.add(String(order.vendor));
    });
    return User.find({ _id: { $in: [...ids] }, ...active }).select('_id role firstName lastName');
  }

  return [];
}

async function expireAnnouncements() {
  const now = new Date();
  await Announcement.updateMany(
    { status: 'published', endDate: { $ne: null, $lt: now } },
    { $set: { status: 'expired' } },
  );
}

export const sendAdminNotification = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    recipientType,
    recipientIds,
    weddingId,
    type = 'general',
    priority = 'normal',
    link = '',
  } = req.body || {};

  if (!String(title || '').trim()) { res.status(400); throw new Error('Title is required'); }
  if (!String(message || '').trim()) { res.status(400); throw new Error('Message is required'); }
  if (!recipientType) { res.status(400); throw new Error('Recipient type is required'); }
  if (!MANUAL_TYPES.includes(type) && !NOTIFICATION_TYPES.includes(type)) {
    res.status(400);
    throw new Error('Invalid notification type');
  }
  if (!NOTIFICATION_PRIORITIES.includes(priority)) {
    res.status(400);
    throw new Error('Invalid priority');
  }

  const recipients = await resolveRecipients({ recipientType, recipientIds, weddingId });
  if (!recipients.length) {
    res.status(400);
    throw new Error('No matching recipients found');
  }

  const batchId = crypto.randomUUID();
  const wedding = mongoose.isValidObjectId(weddingId) ? weddingId : null;
  const docs = recipients.map((user) => ({
    user: user._id,
    title: String(title).trim().slice(0, 160),
    message: String(message).trim().slice(0, 500),
    type,
    priority,
    link: String(link || '').trim().slice(0, 240),
    wedding,
    sentBy: req.user._id,
    batchId,
  }));

  await Notification.insertMany(docs);

  res.status(201).json({
    success: true,
    message: `Notification sent to ${docs.length} recipient${docs.length === 1 ? '' : 's'}`,
    batchId,
    sentCount: docs.length,
    recipients: recipients.map((user) => ({
      _id: user._id,
      role: user.role,
      name: `${user.firstName} ${user.lastName}`.trim(),
    })),
  });
});

export const listAdminNotifications = asyncHandler(async (req, res) => {
  const {
    search = '',
    role = '',
    type = '',
    priority = '',
    read = '',
    from = '',
    to = '',
    page = 1,
    limit = 40,
  } = req.query;

  const filter = { sentBy: { $ne: null }, archived: { $ne: true } };
  if (type) filter.type = type;
  if (priority) filter.priority = priority;
  if (read === 'true') filter.read = true;
  if (read === 'false') filter.read = false;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  let query = Notification.find(filter)
    .populate('user', 'firstName lastName role email username')
    .populate('sentBy', 'firstName lastName')
    .populate('wedding', 'weddingName')
    .sort({ createdAt: -1 });

  const all = await query.limit(500);
  let rows = all;
  if (role) rows = rows.filter((row) => row.user?.role === role);
  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter((row) => {
      const hay = [
        row.title,
        row.message,
        row.user?.firstName,
        row.user?.lastName,
        row.user?.username,
        row.wedding?.weddingName,
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 40));
  const start = (pageNum - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const today = startOfToday();
  const stats = {
    totalSent: rows.length,
    unread: rows.filter((row) => !row.read).length,
    read: rows.filter((row) => row.read).length,
    today: rows.filter((row) => row.createdAt >= today).length,
    highPriority: rows.filter((row) => ['high', 'urgent'].includes(row.priority)).length,
  };

  res.json({
    success: true,
    stats,
    count: rows.length,
    page: pageNum,
    notifications: pageRows,
  });
});

export const getAdminNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id)
    .populate('user', 'firstName lastName role email username')
    .populate('sentBy', 'firstName lastName')
    .populate('wedding', 'weddingName');
  if (!notification || !notification.sentBy) {
    res.status(404);
    throw new Error('Notification not found');
  }
  res.json({ success: true, notification });
});

export const archiveAdminNotification = asyncHandler(async (req, res) => {
  const notification = await Notification.findById(req.params.id);
  if (!notification || !notification.sentBy) {
    res.status(404);
    throw new Error('Notification not found');
  }
  notification.archived = true;
  await notification.save();
  res.json({ success: true, message: 'Notification archived' });
});

export const listAnnouncementRecipientsPreview = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, role: { $in: ['customer', 'planner', 'vendor'] } })
    .select('firstName lastName role username email')
    .sort({ role: 1, firstName: 1 })
    .limit(500);
  const weddings = await Wedding.find({})
    .select('weddingName customer planner weddingDate')
    .populate('customer', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, users, weddings });
});

export const listAnnouncements = asyncHandler(async (req, res) => {
  await expireAnnouncements();
  const announcements = await Announcement.find({})
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ success: true, announcements });
});

export const createAnnouncement = asyncHandler(async (req, res) => {
  const {
    title,
    message,
    audience = 'all',
    priority = 'normal',
    startDate,
    endDate,
    status = 'draft',
  } = req.body || {};

  if (!String(title || '').trim() || !String(message || '').trim()) {
    res.status(400);
    throw new Error('Title and message are required');
  }

  const announcement = await Announcement.create({
    title: String(title).trim(),
    message: String(message).trim(),
    audience,
    priority,
    startDate: startDate ? new Date(startDate) : new Date(),
    endDate: endDate ? new Date(endDate) : null,
    status: status === 'published' ? 'published' : 'draft',
    createdBy: req.user._id,
    publishedAt: status === 'published' ? new Date() : null,
  });

  if (announcement.status === 'published') {
    await fanOutAnnouncement(announcement, req.user._id);
  }

  res.status(201).json({ success: true, announcement });
});

export const updateAnnouncement = asyncHandler(async (req, res) => {
  await expireAnnouncements();
  const announcement = await Announcement.findById(req.params.id);
  if (!announcement) {
    res.status(404);
    throw new Error('Announcement not found');
  }

  const fields = ['title', 'message', 'audience', 'priority', 'startDate', 'endDate', 'status'];
  const previousStatus = announcement.status;
  for (const field of fields) {
    if (req.body[field] !== undefined) {
      announcement[field] = ['startDate', 'endDate'].includes(field) && req.body[field]
        ? new Date(req.body[field])
        : req.body[field];
    }
  }

  if (announcement.status === 'published' && previousStatus !== 'published') {
    announcement.publishedAt = new Date();
    await announcement.save();
    await fanOutAnnouncement(announcement, req.user._id);
  } else {
    await announcement.save();
  }

  res.json({ success: true, announcement });
});

async function fanOutAnnouncement(announcement, sentBy) {
  const roleMap = {
    all: ['customer', 'planner', 'vendor'],
    customers: ['customer'],
    planners: ['planner'],
    vendors: ['vendor'],
  };
  const roles = roleMap[announcement.audience] || roleMap.all;
  const users = await User.find({ role: { $in: roles }, isActive: true }).select('_id');
  const batchId = `announcement:${announcement._id}`;
  if (!users.length) return;
  await Notification.insertMany(users.map((user) => ({
    user: user._id,
    title: announcement.title,
    message: announcement.message,
    type: 'announcement',
    priority: announcement.priority || 'normal',
    link: '',
    sentBy,
    batchId,
  })));
}

export { expireAnnouncements };
