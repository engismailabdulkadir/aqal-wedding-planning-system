import mongoose from 'mongoose';

const customerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    partnerName: { type: String, trim: true, maxlength: 80, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    address: { type: String, trim: true, maxlength: 240, default: '' },
    bio: { type: String, trim: true, maxlength: 1000, default: '' },
    avatar: { type: String, default: null },
    preferences: {
      style: { type: String, trim: true, default: '' },
      budgetRange: { type: String, trim: true, default: '' },
    },
  },
  { timestamps: true },
);

export default mongoose.model('CustomerProfile', customerProfileSchema);
