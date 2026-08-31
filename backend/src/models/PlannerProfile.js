import mongoose from 'mongoose';

const plannerProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      immutable: true,
      index: true,
    },
    title: { type: String, trim: true, maxlength: 120, default: 'Wedding Planner' },
    bio: { type: String, trim: true, maxlength: 2000, default: '' },
    experienceYears: { type: Number, min: 0, default: 0 },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    phone: { type: String, trim: true, maxlength: 40, default: '' },
    avatar: { type: String, default: null },
    specialties: { type: [String], default: [] },
    maxActiveWeddings: { type: Number, min: 1, default: 10 },
    isAvailable: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export default mongoose.model('PlannerProfile', plannerProfileSchema);
