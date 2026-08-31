import mongoose from 'mongoose';

export const PRICE_STATUSES = ['fixed', 'per_person', 'slot', 'quote_required'];
export const OWNERSHIP_STATUSES = ['unclaimed', 'claimed'];

const venueSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, trim: true, lowercase: true, maxlength: 180, unique: true, sparse: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    vendorProfile: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorProfile', default: null },
    ownershipStatus: { type: String, enum: OWNERSHIP_STATUSES, default: 'claimed', index: true },
    description: { type: String, trim: true, maxlength: 4000, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    district: { type: String, trim: true, maxlength: 80, default: '' },
    address: { type: String, trim: true, maxlength: 240, default: '' },
    location: { type: String, trim: true, maxlength: 240, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    email: { type: String, trim: true, lowercase: true, maxlength: 160, default: '' },
    images: { type: [String], default: [] },
    coverImage: { type: String, trim: true, default: '' },
    galleryImages: { type: [String], default: [] },
    imageSource: { type: String, enum: ['official', 'placeholder'], default: 'placeholder' },
    imageIsPlaceholder: { type: Boolean, default: true },
    imageCredit: { type: String, trim: true, maxlength: 160, default: '' },
    amenities: { type: [String], default: [] },
    parking: { type: Boolean, default: false },
    airConditioning: { type: Boolean, default: false },
    stage: { type: Boolean, default: false },
    soundSystem: { type: Boolean, default: false },
    security: { type: Boolean, default: false },
    catering: { type: Boolean, default: false },
    capacityMin: { type: Number, min: 0, default: null },
    capacityMax: { type: Number, min: 0, default: null },
    priceStatus: { type: String, enum: PRICE_STATUSES, default: 'quote_required' },
    priceFrom: { type: Number, min: 0, default: null },
    pricePerPerson: { type: Number, min: 0, default: null },
    morningPrice: { type: Number, min: 0, default: null },
    eveningPrice: { type: Number, min: 0, default: null },
    fullDayPrice: { type: Number, min: 0, default: null },
    deposit: { type: Number, min: 0, default: null },
    priceNotes: { type: String, trim: true, maxlength: 400, default: '' },
    featured: { type: Boolean, default: false, index: true },
    featuredOrder: { type: Number, default: 100 },
    verified: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['active', 'inactive', 'archived'], default: 'active', index: true },
    externallySourced: { type: Boolean, default: false },
    sourceUrl: { type: String, trim: true, maxlength: 500, default: '' },
    sourceName: { type: String, trim: true, maxlength: 160, default: '' },
    sourceVerifiedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

venueSchema.index({ name: 'text', city: 'text', description: 'text', district: 'text' });
venueSchema.index({ vendor: 1, status: 1 });
venueSchema.index({ featured: 1, featuredOrder: 1, verified: 1, status: 1 });

venueSchema.pre('save', function syncCoverImage() {
  if (!this.coverImage && this.images?.[0]) this.coverImage = this.images[0];
  if (!this.galleryImages?.length && this.images?.length) this.galleryImages = this.images;
});

export default mongoose.model('Venue', venueSchema);
