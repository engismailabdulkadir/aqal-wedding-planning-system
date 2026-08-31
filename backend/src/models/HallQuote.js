import mongoose from 'mongoose';

export const HALL_QUOTE_STATUSES = [
  'pending',
  'quoted',
  'accepted',
  'rejected',
  'expired',
  'cancelled',
];

const hallQuoteSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    slotType: { type: String, required: true, index: true },
    guestCount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: HALL_QUOTE_STATUSES, default: 'pending', index: true },
    totalPrice: { type: Number, min: 0, default: null },
    requiredDeposit: { type: Number, min: 0, default: null },
    notes: { type: String, trim: true, maxlength: 2000, default: '' },
    expiresAt: { type: Date, default: null },
    quotedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    quotedAt: { type: Date, default: null },
    acceptedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    hallBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'HallBooking', default: null },
    customerMessage: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

hallQuoteSchema.index({ wedding: 1, status: 1 });
hallQuoteSchema.index({ vendor: 1, status: 1, createdAt: -1 });
hallQuoteSchema.index({ customer: 1, status: 1, createdAt: -1 });

export default mongoose.model('HallQuote', hallQuoteSchema);
