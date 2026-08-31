import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema({
  wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, immutable: true, index: true },
  guest: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest', required: true, unique: true, immutable: true },
  token: { type: String, required: true, unique: true, immutable: true, select: false },
  status: { type: String, enum: ['draft', 'sent', 'opened', 'responded'], default: 'draft' },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  design: { type: String, enum: ['classic', 'garden', 'midnight', 'linen'], default: 'classic' },
  brideName: { type: String, trim: true, maxlength: 80, default: '' },
  groomName: { type: String, trim: true, maxlength: 80, default: '' },
  weddingDate: { type: Date, default: null },
  time: { type: String, trim: true, maxlength: 40, default: '' },
  venue: { type: String, trim: true, maxlength: 160, default: '' },
  hall: { type: String, trim: true, maxlength: 120, default: '' },
  location: { type: String, trim: true, maxlength: 240, default: '' },
  sentAt: { type: Date, default: null },
  respondedAt: { type: Date, default: null },
}, { timestamps: true });
export default mongoose.model('Invitation', invitationSchema);
