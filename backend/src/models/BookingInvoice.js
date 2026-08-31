import mongoose from 'mongoose';

export const INVOICE_STATUSES = ['issued', 'paid', 'cancelled'];
export const INVOICE_PAYMENT_STATUSES = ['unpaid', 'partially_paid', 'paid'];

const schema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    vendorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true },
    serviceName: { type: String, required: true, trim: true, maxlength: 120 },
    amount: { type: Number, required: true, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: INVOICE_PAYMENT_STATUSES,
      default: 'unpaid',
      index: true,
    },
    currency: { type: String, default: 'USD', enum: ['USD'] },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    status: { type: String, enum: INVOICE_STATUSES, default: 'issued', index: true },
    issuedAt: { type: Date, default: Date.now },
    paidAt: { type: Date, default: null },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
  },
  { timestamps: true },
);

export default mongoose.model('BookingInvoice', schema);
