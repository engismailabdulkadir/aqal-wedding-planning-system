import mongoose from 'mongoose';

const weddingJoinRequestSchema = new mongoose.Schema(
  {
    invitation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeddingInvite',
      required: true,
      index: true,
      immutable: true,
    },
    wedding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      index: true,
      immutable: true,
    },
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      immutable: true,
    },
    requestedRole: {
      type: String,
      enum: ['groom', 'bride'],
      required: true,
      immutable: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
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

weddingJoinRequestSchema.index({ wedding: 1, requester: 1, status: 1 });
weddingJoinRequestSchema.index(
  { invitation: 1, requester: 1 },
  { unique: true, partialFilterExpression: { status: 'pending' } },
);

const WeddingJoinRequest = mongoose.model('WeddingJoinRequest', weddingJoinRequestSchema);
export default WeddingJoinRequest;
