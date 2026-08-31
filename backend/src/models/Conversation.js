import mongoose from 'mongoose';
const conversationSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, index: true },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', default: null },
  hallBooking: { type: mongoose.Schema.Types.ObjectId, ref: 'HallBooking', default: null },
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  lastMessageAt: { type: Date, default: null },
}, { timestamps: true });
conversationSchema.index({ participants: 1, wedding: 1 });
export default mongoose.model('Conversation', conversationSchema);
