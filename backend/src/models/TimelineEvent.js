import mongoose from 'mongoose';

export const TIMELINE_STATUSES = ['upcoming', 'in_progress', 'completed', 'skipped'];

const timelineEventSchema = new mongoose.Schema(
  {
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 1000, default: '' },
    dueDate: { type: Date, default: null, index: true },
    status: { type: String, enum: TIMELINE_STATUSES, default: 'upcoming' },
    key: { type: String, trim: true, default: '', index: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

timelineEventSchema.index({ wedding: 1, dueDate: 1, sortOrder: 1 });

export default mongoose.model('TimelineEvent', timelineEventSchema);
