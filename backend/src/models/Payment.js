import mongoose from 'mongoose';

export const PAYMENT_TYPES = ['deposit', 'partial', 'full', 'remaining', 'refund', 'test'];
export const PAYMENT_METHODS = ['card', 'mobile_money', 'bank_transfer', 'test', 'waafi'];
export const PAYMENT_STATUSES = ['created', 'pending', 'processing', 'successful', 'paid', 'failed', 'cancelled', 'expired', 'refunded'];
export const PAYMENT_PROVIDERS = ['mock', 'waafipay'];

const paymentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, immutable: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null, index: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'HallBooking', default: null, index: true },
    vendorBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null, index: true },
    bookingInvoice: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingInvoice', default: null, index: true },
    selection: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingSelection', default: null, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', default: null },
    amount: { type: Number, required: true, min: 0, immutable: true },
    currency: { type: String, default: 'USD', enum: ['USD'] },
    paymentType: { type: String, enum: PAYMENT_TYPES, required: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    provider: { type: String, enum: PAYMENT_PROVIDERS, default: 'mock' },
    isTestPayment: { type: Boolean, default: false, index: true },
    customerPhone: { type: String, trim: true, default: '' },
    transactionReference: { type: String, trim: true, required: true, unique: true },
    providerReference: { type: String, trim: true, default: '' },
    requestId: { type: String, trim: true, default: '' },
    referenceId: { type: String, trim: true, default: '' },
    invoiceId: { type: String, trim: true, default: '' },
    receiptNumber: { type: String, trim: true, default: '' },
    status: { type: String, enum: PAYMENT_STATUSES, default: 'created', index: true },
    providerResponseCode: { type: String, trim: true, default: '' },
    providerResponseMessage: { type: String, trim: true, default: '' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ wedding: 1, status: 1, createdAt: -1 });
paymentSchema.index({ vendor: 1, status: 1, createdAt: -1 });
paymentSchema.index({ customer: 1, order: 1, status: 1, provider: 1 });

export default mongoose.model('Payment', paymentSchema);
