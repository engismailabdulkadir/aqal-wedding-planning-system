import mongoose from 'mongoose';

const weddingInviteSchema = new mongoose.Schema(
  {
    wedding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      index: true,
      immutable: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      unique: true,
      maxlength: [16, 'Invite code cannot exceed 16 characters'],
    },
    invitedEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    intendedRole: {
      type: String,
      enum: ['groom', 'bride'],
      required: true,
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'expired', 'cancelled', 'revoked'],
      default: 'pending',
      index: true,
    },
    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    acceptedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

weddingInviteSchema.index({ wedding: 1, status: 1 });

const WeddingInvite = mongoose.model('WeddingInvite', weddingInviteSchema);
export default WeddingInvite;
