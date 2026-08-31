import mongoose from 'mongoose';

export const ANNOUNCEMENT_AUDIENCES = ['all', 'customers', 'planners', 'vendors'];
export const ANNOUNCEMENT_STATUSES = ['draft', 'published', 'expired', 'archived'];
export const ANNOUNCEMENT_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    audience: { type: String, enum: ANNOUNCEMENT_AUDIENCES, default: 'all', index: true },
    priority: { type: String, enum: ANNOUNCEMENT_PRIORITIES, default: 'normal' },
    startDate: { type: Date, default: Date.now },
    endDate: { type: Date, default: null },
    status: { type: String, enum: ANNOUNCEMENT_STATUSES, default: 'draft', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

announcementSchema.index({ status: 1, startDate: 1, endDate: 1 });

export default mongoose.model('Announcement', announcementSchema);
