import mongoose from 'mongoose';

export const VENDOR_CATEGORIES = ['venue', 'catering', 'photography', 'videography', 'decoration', 'florist', 'wedding cake', 'makeup & beauty', 'wedding dress', 'groom attire', 'entertainment / dj', 'transportation', 'accommodation', 'event equipment', 'other'];

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, trim: true, maxlength: 500, default: '' },
  price: { type: Number, min: 0, required: true },
}, { _id: true });

const vendorProfileSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, immutable: true },
  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  ownerName: { type: String, trim: true, maxlength: 120, default: '' },
  category: { type: String, required: true, enum: VENDOR_CATEGORIES, lowercase: true },
  description: { type: String, trim: true, maxlength: 2000, default: '' },
  phone: { type: String, trim: true, maxlength: 40, default: '' },
  email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
  logo: { type: String, default: null },
  coverImage: { type: String, default: null },
  city: { type: String, required: true, trim: true, maxlength: 80 },
  district: { type: String, trim: true, maxlength: 80, default: '' },
  address: { type: String, trim: true, maxlength: 240, default: '' },
  location: { type: String, trim: true, maxlength: 240, default: '' },
  startingPrice: { type: Number, min: 0, default: 0 },
  services: { type: [serviceSchema], default: [] },
  availability: { type: String, trim: true, maxlength: 500, default: '' },
  verificationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending',
    index: true,
  },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

vendorProfileSchema.index({ businessName: 'text', description: 'text', city: 'text' });
export default mongoose.model('VendorProfile', vendorProfileSchema);
