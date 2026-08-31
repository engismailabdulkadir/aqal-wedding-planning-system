import mongoose from 'mongoose';

export const ORDER_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'];
export const ORDER_PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid', 'refunded'];

const orderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', default: null },
    selection: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingSelection', default: null },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'HallBooking', default: null },
    appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', default: null },
    rental: { type: mongoose.Schema.Types.ObjectId, ref: 'RentalBooking', default: null },
    category: { type: String, default: 'other', index: true },
    itemName: { type: String, required: true, trim: true },
    quantity: { type: Number, min: 1, default: 1 },
    amount: { type: Number, required: true, min: 0 },
    depositRequired: { type: Number, min: 0, default: 0 },
    amountPaid: { type: Number, min: 0, default: 0 },
    balance: { type: Number, min: 0, default: 0 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    paymentStatus: { type: String, enum: ORDER_PAYMENT_STATUSES, default: 'unpaid' },
    eventDate: { type: Date, default: null },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

orderSchema.index({ vendor: 1, status: 1, createdAt: -1 });
orderSchema.index({ wedding: 1, status: 1 });

export default mongoose.model('Order', orderSchema);
