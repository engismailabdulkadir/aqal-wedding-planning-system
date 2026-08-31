import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Notification from '../models/Notification.js';

export const listNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({
    user: req.user._id,
    archived: { $ne: true },
  }).sort({ createdAt: -1 }).limit(80);
  const unreadCount = await Notification.countDocuments({
    user: req.user._id,
    read: false,
    archived: { $ne: true },
  });
  res.json({ success: true, notifications, unreadCount });
});

export const markNotificationRead = asyncHandler(async (req, res) => {
  const notification = mongoose.isValidObjectId(req.params.id)
    ? await Notification.findOne({ _id: req.params.id, user: req.user._id })
    : null;
  if (!notification) {
    res.status(404);
    throw new Error('Notification not found');
  }
  notification.read = true;
  await notification.save();
  res.json({ success: true, notification });
});

export const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true, message: 'All notifications marked as read' });
});
