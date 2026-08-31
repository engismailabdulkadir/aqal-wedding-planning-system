import mongoose from 'mongoose';

export const HALL_BOOKING_STATUSES = ['pending', 'held', 'confirmed', 'cancelled', 'completed', 'expired'];
export const PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid', 'refunded'];

const hallBookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingDate: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    slotType: { type: String, required: true, index: true },
    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true, index: true },
    occupancyStart: { type: Date, required: true, index: true },
    occupancyEnd: { type: Date, required: true, index: true },
    basePrice: { type: Number, required: true, min: 0 },
    depositRequired: { type: Number, required: true, min: 0, default: 0 },
    /** Snapshot aliases for accepted quote totals (same values as basePrice / depositRequired). */
    agreedTotalAmount: { type: Number, min: 0, default: null },
    quotedTotal: { type: Number, min: 0, default: null },
    requiredDeposit: { type: Number, min: 0, default: null },
    quote: { type: mongoose.Schema.Types.ObjectId, ref: 'HallQuote', default: null },
    amountPaid: { type: Number, min: 0, default: 0 },
    balance: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: HALL_BOOKING_STATUSES, default: 'held', index: true },
    holdExpiresAt: { type: Date, default: null, index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'unpaid' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    bookingOwner: { type: String, enum: ['groom', 'bride', 'shared'], default: 'shared', index: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

hallBookingSchema.index({ hall: 1, bookingDate: 1, status: 1 });
hallBookingSchema.index({ hall: 1, occupancyStart: 1, occupancyEnd: 1, status: 1 });
hallBookingSchema.index({ wedding: 1, status: 1 });

export default mongoose.model('HallBooking', hallBookingSchema);
