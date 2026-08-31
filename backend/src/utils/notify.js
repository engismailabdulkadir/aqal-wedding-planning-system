import Notification from '../models/Notification.js';
import User from '../models/User.js';

export async function notify(userId, {
  title,
  message,
  type = 'system',
  link = '',
  wedding = null,
  priority = 'normal',
  sentBy = null,
}) {
  if (!userId) return null;
  return Notification.create({
    user: userId,
    title,
    message,
    type,
    link,
    wedding,
    priority,
    sentBy,
  });
}

export async function notifyAdmins(payload) {
  const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
  await Promise.all(admins.map((admin) => notify(admin._id, payload)));
}
