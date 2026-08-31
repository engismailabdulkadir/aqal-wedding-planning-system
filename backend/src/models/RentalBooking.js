import mongoose from 'mongoose';

const rentalBookingSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', required: true, index: true },
    rentalStart: { type: Date, required: true, index: true },
    rentalEnd: { type: Date, required: true, index: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending', index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

rentalBookingSchema.index({ listing: 1, rentalStart: 1, rentalEnd: 1, status: 1 });

export default mongoose.model('RentalBooking', rentalBookingSchema);
