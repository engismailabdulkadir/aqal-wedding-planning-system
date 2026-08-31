import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, immutable: true, index: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
  vendorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true, immutable: true },
  listing: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', default: null, index: true },
  serviceName: { type: String, required: true, trim: true, maxlength: 120 },
  eventDate: { type: Date, required: true },
  timeSlot: { type: String, enum: ['morning', 'evening', 'full_day'], default: null },
  quantity: { type: Number, min: 1, default: 1 },
  amount: { type: Number, required: true, min: 0 },
  customerMessage: { type: String, trim: true, maxlength: 1000, default: '' },
  vendorMessage: { type: String, trim: true, maxlength: 1000, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'confirmed', 'cancelled', 'completed'], default: 'pending', index: true },
  isPaid: { type: Boolean, default: false, index: true },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },
  bookingOwner: { type: String, enum: ['groom', 'bride', 'shared'], default: 'shared', index: true },
  bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'BookingInvoice', default: null, index: true },
}, { timestamps: true });
export default mongoose.model('Booking', bookingSchema);
