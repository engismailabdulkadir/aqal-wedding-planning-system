import mongoose from 'mongoose';

const weddingCartItemSchema = new mongoose.Schema(
  {
    wedding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      index: true,
    },
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeddingListing',
      required: true,
      index: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vendorProfile: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VendorProfile',
      required: true,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: { type: String, required: true, index: true },
    itemName: { type: String, required: true, trim: true },
    bookingDate: { type: Date, default: null },
    timeSlot: {
      type: String,
      enum: ['morning', 'evening', 'full_day', null],
      default: null,
    },
    quantity: { type: Number, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    subtotal: { type: Number, required: true, min: 0 },
    image: { type: String, default: '' },
    vendorName: { type: String, default: '' },
    notes: { type: String, trim: true, maxlength: 500, default: '' },
  },
  { timestamps: true },
);

weddingCartItemSchema.index({ wedding: 1, listing: 1, bookingDate: 1, timeSlot: 1 });

const WeddingCartItem = mongoose.model('WeddingCartItem', weddingCartItemSchema);
export default WeddingCartItem;
