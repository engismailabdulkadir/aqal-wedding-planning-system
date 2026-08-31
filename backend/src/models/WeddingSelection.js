import mongoose from 'mongoose';
import { LISTING_CATEGORIES } from './WeddingListing.js';

const schema = new mongoose.Schema(
  {
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, immutable: true, index: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', required: true, immutable: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    category: { type: String, enum: LISTING_CATEGORIES, required: true, immutable: true },
    itemName: { type: String, required: true, trim: true, immutable: true },
    price: { type: Number, required: true, min: 0, immutable: true },
    basePrice: { type: Number, min: 0 },
    totalPrice: { type: Number, min: 0 },
    quantity: { type: Number, default: 1, min: 1, validate: Number.isInteger },
    totalAmount: { type: Number, required: true, min: 0 },
    eventDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['selected', 'pending', 'pending_payment', 'confirmed', 'rejected', 'cancelled', 'completed', 'paid', 'fulfilled'],
      default: 'pending',
      index: true,
    },
    amountPaid: { type: Number, min: 0, default: 0 },
    balance: { type: Number, min: 0, default: 0 },
    paymentStatus: { type: String, enum: ['unpaid', 'partially_paid', 'paid', 'refunded'], default: 'unpaid' },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
    bookingOwner: { type: String, enum: ['groom', 'bride', 'shared'], default: 'shared', index: true },
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

schema.index({ wedding: 1, category: 1, status: 1 });
schema.pre('save', function syncTotals() {
  if (this.basePrice == null) this.basePrice = this.price;
  if (this.totalPrice == null) this.totalPrice = this.totalAmount;
});

export default mongoose.model('WeddingSelection', schema);
