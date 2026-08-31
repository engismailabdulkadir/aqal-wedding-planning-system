import mongoose from 'mongoose';

const weddingSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    groom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    bride: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    weddingName: {
      type: String,
      required: [true, 'Wedding name is required'],
      trim: true,
      maxlength: [120, 'Wedding name cannot exceed 120 characters'],
    },
    partner1Name: {
      type: String,
      required: [true, 'Partner 1 name is required'],
      trim: true,
      maxlength: [80, 'Partner 1 name cannot exceed 80 characters'],
    },
    partner2Name: {
      type: String,
      required: [true, 'Partner 2 name is required'],
      trim: true,
      maxlength: [80, 'Partner 2 name cannot exceed 80 characters'],
    },
    weddingDate: {
      type: Date,
      required: [true, 'Wedding date is required'],
    },
    venue: {
      type: String,
      trim: true,
      maxlength: [160, 'Venue cannot exceed 160 characters'],
      default: '',
    },
    selectedVenue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      default: null,
    },
    selectedHall: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hall',
      default: null,
    },
    selectedSlot: {
      type: String,
      trim: true,
      maxlength: [80, 'Slot cannot exceed 80 characters'],
      default: '',
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [80, 'City cannot exceed 80 characters'],
    },
    estimatedBudget: {
      type: Number,
      required: [true, 'Estimated budget is required'],
      min: [0, 'Estimated budget cannot be negative'],
    },
    expectedGuests: {
      type: Number,
      required: [true, 'Expected number of guests is required'],
      min: [0, 'Expected guests cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Expected guests must be a whole number',
      },
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['planning', 'confirmed', 'completed', 'cancelled'],
      default: 'planning',
    },
    planner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ceremonyTime: {
      type: String,
      trim: true,
      maxlength: [40, 'Ceremony time cannot exceed 40 characters'],
      default: '',
    },
    invitationDesign: {
      type: String,
      enum: ['classic', 'garden', 'midnight', 'linen'],
      default: 'classic',
    },
    invitationMessage: {
      type: String,
      trim: true,
      maxlength: [1000, 'Invitation message cannot exceed 1000 characters'],
      default: '',
    },
    inviteCode: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
      maxlength: [12, 'Invite code cannot exceed 12 characters'],
    },
  },
  { timestamps: true },
);

const Wedding = mongoose.model('Wedding', weddingSchema);
export default Wedding;
