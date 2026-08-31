import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    listing: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', required: true, index: true },
    resourceKey: { type: String, required: true, default: 'default', index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/, index: true },
    startDateTime: { type: Date, required: true, index: true },
    endDateTime: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15 },
    price: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['pending', 'confirmed', 'cancelled', 'completed'], default: 'pending', index: true },
    notes: { type: String, trim: true, maxlength: 1000, default: '' },
  },
  { timestamps: true },
);

appointmentSchema.index({ listing: 1, resourceKey: 1, startDateTime: 1, endDateTime: 1 });
appointmentSchema.index(
  { listing: 1, resourceKey: 1, startDateTime: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['pending', 'confirmed'] } } },
);

export default mongoose.model('Appointment', appointmentSchema);
