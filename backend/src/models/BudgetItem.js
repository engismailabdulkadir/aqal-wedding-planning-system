import mongoose from 'mongoose';

export const BUDGET_CATEGORIES = [
  'Venue', 'Catering', 'Photography', 'Videography', 'Decoration',
  'Wedding Dress', 'Groom Attire', 'Beauty & Makeup', 'Entertainment',
  'Transportation', 'Invitations', 'Flowers', 'Cake', 'Accommodation',
  'Gifts', 'Other',
];

const finiteNonNegative = {
  validator: (value) => Number.isFinite(value) && value >= 0,
  message: '{PATH} must be a finite number of 0 or greater',
};

const budgetItemSchema = new mongoose.Schema(
  {
    wedding: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wedding',
      required: true,
      immutable: true,
      index: true,
    },
    selection: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingSelection', immutable: true },
    category: {
      type: String,
      required: [true, 'Category is required'],
      enum: { values: BUDGET_CATEGORIES, message: 'Please select a valid budget category' },
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      maxlength: [120, 'Item name cannot exceed 120 characters'],
    },
    plannedAmount: {
      type: Number,
      required: [true, 'Planned amount is required'],
      validate: finiteNonNegative,
    },
    actualAmount: {
      type: Number,
      default: 0,
      validate: finiteNonNegative,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: ['planned', 'partially_paid', 'paid'],
      default: 'planned',
    },
  },
  { timestamps: true },
);

budgetItemSchema.pre('validate', function calculateStatus() {
  if (this.actualAmount === 0) this.status = 'planned';
  else if (this.actualAmount < this.plannedAmount) this.status = 'partially_paid';
  else this.status = 'paid';
});

budgetItemSchema.index(
  { selection: 1 },
  { unique: true, partialFilterExpression: { selection: { $exists: true } } },
);

const BudgetItem = mongoose.model('BudgetItem', budgetItemSchema);
export default BudgetItem;
