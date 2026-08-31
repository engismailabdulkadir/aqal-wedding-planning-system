import mongoose from 'mongoose';

const weddingMemberSchema = new mongoose.Schema(
  {
    wedding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    memberRole: {
      type: String,
      enum: ['groom', 'bride'],
      required: [true, 'Member role is required'],
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true },
);

weddingMemberSchema.index({ wedding: 1, user: 1 }, { unique: true });
weddingMemberSchema.index({ wedding: 1, memberRole: 1, status: 1 });

const WeddingMember = mongoose.model('WeddingMember', weddingMemberSchema);
export default WeddingMember;
