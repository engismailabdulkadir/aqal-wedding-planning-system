import mongoose from 'mongoose';

export const LISTING_CATEGORIES = [
  'venue',
  'hall',
  'decoration',
  'groom_suit',
  'groom_shoes',
  'groom_accessories',
  'groom_package',
  'bride_dress',
  'bride_traditional',
  'bride_accessories',
  'bride_package',
  'cake',
  'makeup',
  'hair',
  'henna',
  'photography',
  'catering',
  'transportation',
  'bride_shoes',
  'accessories',
  'bridal_salon',
  'bouquet',
  'flowers',
  'groom_attire',
  'groom_salon',
  'videography',
  'invitation',
  'entertainment',
  'accommodation',
  'equipment',
  'other',
];

export const AVAILABILITY_TYPES = ['none', 'date', 'slot', 'appointment', 'inventory', 'rental_period', 'capacity'];
export const LISTING_STATUSES = ['active', 'inactive', 'archived'];

const schema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, immutable: true, index: true },
    vendorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', required: true, immutable: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    category: { type: String, enum: LISTING_CATEGORIES, required: true, index: true },
    listingType: { type: String, enum: ['product', 'service'], required: true },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    price: { type: Number, required: true, min: 0 },
    discountPrice: { type: Number, min: 0, default: null },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    location: { type: String, trim: true, maxlength: 240, default: '' },
    images: { type: [String], default: [] },
    available: { type: Boolean, default: true },
    active: { type: Boolean, default: true, index: true },
    status: { type: String, enum: LISTING_STATUSES, default: 'active', index: true },
    availabilityType: { type: String, enum: AVAILABILITY_TYPES, default: 'none' },
    features: { type: [String], default: [] },
    quantity: { type: Number, min: 0, default: 1 },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

schema.index({ name: 'text', description: 'text', city: 'text' });
schema.index({ category: 1, status: 1, price: 1 });

export default mongoose.model('WeddingListing', schema);
