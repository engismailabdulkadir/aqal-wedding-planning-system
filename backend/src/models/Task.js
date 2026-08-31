import mongoose from 'mongoose';

export const TASK_CATEGORIES = ['venue', 'catering', 'guests', 'attire', 'decoration', 'photography', 'entertainment', 'transportation', 'invitations', 'ceremony', 'reception', 'finance', 'other'];
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const TASK_STATUSES = ['todo', 'pending', 'in_progress', 'completed'];

const taskSchema = new mongoose.Schema(
  {
    wedding: { type: mongoose.Schema.Types.ObjectId, ref: 'Wedding', required: true, immutable: true, index: true },
    title: { type: String, required: [true, 'Task title is required'], trim: true, maxlength: [160, 'Task title cannot exceed 160 characters'] },
    description: { type: String, trim: true, maxlength: [1000, 'Description cannot exceed 1000 characters'], default: '' },
    category: { type: String, enum: TASK_CATEGORIES, default: 'other' },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'medium' },
    dueDate: { type: Date, default: null },
    status: { type: String, enum: TASK_STATUSES, default: 'todo' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'WeddingListing', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

taskSchema.pre('save', function synchronizeCompletionTime() {
  if (!this.isModified('status') && !this.isNew) return;
  if (this.status === 'completed') {
    if (!this.completedAt) this.completedAt = new Date();
  } else {
    this.completedAt = null;
  }
});

const Task = mongoose.model('Task', taskSchema);
export default Task;
