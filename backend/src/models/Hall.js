import mongoose from 'mongoose';

const hallSchema = new mongoose.Schema(
  {
    venue: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    hallName: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    images: { type: [String], default: [] },
    coverImage: { type: String, trim: true, default: '' },
    priceStatus: { type: String, enum: ['fixed', 'per_person', 'slot', 'quote_required'], default: 'quote_required' },
    morningPrice: { type: Number, min: 0, default: null },
    eveningPrice: { type: Number, min: 0, default: null },
    fullDayPrice: { type: Number, min: 0, default: null },
    deposit: { type: Number, min: 0, default: null },
    capacity: { type: Number, required: true, min: 1 },
    minimumCapacity: { type: Number, min: 0, default: 0 },
    facilities: { type: [String], default: [] },
    parking: { type: Boolean, default: false },
    maleSection: { type: Boolean, default: false },
    femaleSection: { type: Boolean, default: false },
    airConditioning: { type: Boolean, default: true },
    stage: { type: Boolean, default: true },
    kitchen: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'inactive', 'maintenance'], default: 'active', index: true },
  },
  { timestamps: true },
);

hallSchema.index({ venue: 1, hallName: 1 }, { unique: true });

export default mongoose.model('Hall', hallSchema);
