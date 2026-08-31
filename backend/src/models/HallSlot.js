import mongoose from 'mongoose';

export const SLOT_TYPES = ['morning', 'evening', 'full_day', 'custom'];

const hallSlotSchema = new mongoose.Schema(
  {
    hall: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    slotType: { type: String, enum: SLOT_TYPES, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    startTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    endTime: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    overnight: { type: Boolean, default: false },
    price: { type: Number, required: true, min: 0 },
    deposit: { type: Number, min: 0, default: 0 },
    quoteRequired: { type: Boolean, default: false },
    setupMinutes: { type: Number, min: 0, default: 60 },
    cleanupMinutes: { type: Number, min: 0, default: 60 },
    bufferMinutes: { type: Number, min: 0, default: 30 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

hallSlotSchema.index({ hall: 1, slotType: 1 }, { unique: true });

export const DEFAULT_HALL_SLOTS = [
  { slotType: 'morning', name: 'Morning', startTime: '08:00', endTime: '16:00', overnight: false, price: 300, deposit: 50, setupMinutes: 60, cleanupMinutes: 60, bufferMinutes: 30 },
  { slotType: 'evening', name: 'Evening', startTime: '18:00', endTime: '02:00', overnight: true, price: 400, deposit: 80, setupMinutes: 60, cleanupMinutes: 60, bufferMinutes: 30 },
  { slotType: 'full_day', name: 'Full Day', startTime: '08:00', endTime: '02:00', overnight: true, price: 700, deposit: 150, setupMinutes: 90, cleanupMinutes: 90, bufferMinutes: 30 },
];

export const QUOTE_HALL_SLOTS = DEFAULT_HALL_SLOTS.map((slot) => ({
  ...slot,
  price: 0,
  deposit: 0,
  quoteRequired: true,
}));

export default mongoose.model('HallSlot', hallSlotSchema);
