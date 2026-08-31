import mongoose from 'mongoose';

/**
 * Unique locks prevent two customers from holding the same hall/date/slot.
 * Morning also locks full_day; evening also locks full_day; full_day locks all three.
 */
const hallSlotLockSchema = new mongoose.Schema(
  {
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    slotKey: { type: String, required: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: 'HallBooking', default: null },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true },
);

hallSlotLockSchema.index({ hall: 1, date: 1, slotKey: 1 }, { unique: true });
hallSlotLockSchema.index({ booking: 1 });

export default mongoose.model('HallSlotLock', hallSlotLockSchema);
