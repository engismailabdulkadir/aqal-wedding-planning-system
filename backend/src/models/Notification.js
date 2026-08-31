import mongoose from 'mongoose';

export const NOTIFICATION_TYPES = [
  // Wedding lifecycle
  'planner_assigned',
  'wedding_assigned',
  'wedding_created',
  'wedding_unassigned',
  'task_assigned',
  // Booking workflow (pending → accepted → confirmed → completed)
  'booking_created',
  'new_booking_request',
  'booking_accepted',
  'booking_rejected',
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed',
  'new_booking',
  'booking',
  'booking_conflict',
  // Orders & vendor
  'new_order',
  'vendor_response',
  // Payments
  'payment_received',
  'payment_successful',
  'booking_payment_received',
  'payment_issue',
  // Scheduling & reminders
  'upcoming_appointment',
  'wedding_approaching',
  'task_due',
  'upcoming_deadline',
  // Messaging & admin
  'customer_message',
  'vendor_registration',
  'announcement',
  // Legacy / generic buckets (kept for existing records)
  'system',
  'general',
  'wedding',
  'payment',
  'task',
  'planner',
  'vendor',
  'warning',
];

export const NOTIFICATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 500 },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system', index: true },
    priority: { type: String, enum: NOTIFICATION_PRIORITIES, default: 'normal', index: true },
    read: { type: Boolean, default: false, index: true },
    archived: { type: Boolean, default: false, index: true },
    link: { type: String, trim: true, maxlength: 240, default: '' },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', default: null },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    batchId: { type: String, trim: true, default: '', index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });
notificationSchema.index({ sentBy: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
