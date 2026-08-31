import mongoose from 'mongoose';

const bookingHistorySchema = new mongoose.Schema(
  {
    source: { type: String, enum: ['hall', 'appointment', 'rental', 'legacy'], required: true, index: true },
    bookingId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', default: null, index: true },
    action: { type: String, required: true, trim: true },
    oldStatus: { type: String, default: null },
    newStatus: { type: String, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: { createdAt: 'timestamp', updatedAt: false } },
);

bookingHistorySchema.index({ source: 1, bookingId: 1, timestamp: -1 });

export default mongoose.model('BookingHistory', bookingHistorySchema);
