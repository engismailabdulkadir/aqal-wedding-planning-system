import mongoose from 'mongoose';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const guestSchema = new mongoose.Schema(
  {
    wedding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      immutable: true,
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: [80, 'First name cannot exceed 80 characters'],
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [80, 'Last name cannot exceed 80 characters'],
      default: '',
    },
    phone: {
      type: String,
      trim: true,
      maxlength: [40, 'Phone cannot exceed 40 characters'],
      default: '',
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [160, 'Email cannot exceed 160 characters'],
      validate: { validator: (value) => !value || EMAIL_PATTERN.test(value), message: 'Please provide a valid email address' },
      default: '',
    },
    gender: {
      type: String,
      enum: ['female', 'male', 'other', 'unspecified'],
      default: 'unspecified',
    },
    group: {
      type: String,
      trim: true,
      maxlength: [80, 'Group cannot exceed 80 characters'],
      default: '',
    },
    category: {
      type: String,
      enum: ['family', 'friend', 'relative', 'colleague', 'vip', 'other'],
      default: 'other',
    },
    side: {
      type: String,
      enum: ['bride', 'groom', 'shared', 'both', 'partner1', 'partner2'],
      default: 'shared',
    },
    invitationStatus: {
      type: String,
      enum: ['not_sent', 'sent', 'viewed'],
      default: 'not_sent',
    },
    rsvpStatus: {
      type: String,
      enum: ['pending', 'accepted', 'declined'],
      default: 'pending',
    },
    plusOneAllowed: {
      type: Boolean,
      default: false,
    },
    plusOneName: {
      type: String,
      trim: true,
      maxlength: [160, 'Plus one name cannot exceed 160 characters'],
      default: '',
    },
    numberAttending: {
      type: Number,
      min: 0,
      default: 1,
      validate: { validator: Number.isInteger, message: 'Number attending must be a whole number' },
    },
    tableNumber: {
      type: String,
      trim: true,
      maxlength: [40, 'Table number cannot exceed 40 characters'],
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
  },
  { timestamps: true },
);

guestSchema.virtual('fullName').get(function fullName() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

guestSchema.pre('validate', function normalizeGuest() {
  if (!this.plusOneAllowed) this.plusOneName = '';
  if (this.side === 'partner1') this.side = 'bride';
  if (this.side === 'partner2') this.side = 'groom';
  if (this.side === 'both') this.side = 'shared';
  if (this.rsvpStatus === 'declined') this.numberAttending = 0;
  else if (!this.numberAttending || this.numberAttending < 1) this.numberAttending = this.plusOneAllowed && this.plusOneName ? 2 : 1;
});

guestSchema.set('toJSON', { virtuals: true });
guestSchema.set('toObject', { virtuals: true });

const Guest = mongoose.model('Guest', guestSchema);
export default Guest;
