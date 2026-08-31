import { useState } from 'react';

const budgetCategories = ['Venue', 'Catering', 'Photography', 'Videography', 'Decoration', 'Wedding Dress', 'Groom Attire', 'Beauty & Makeup', 'Entertainment', 'Transportation', 'Invitations', 'Flowers', 'Cake', 'Accommodation', 'Gifts', 'Other'];
const emptyItem = { category: '', title: '', plannedAmount: '', actualAmount: '0', notes: '' };
const inputClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function BudgetItemForm({ item, submitting, error, onSubmit, onCancel, hideHeader = false }) {
  const [form, setForm] = useState(item ? { category: item.category, title: item.title, plannedAmount: String(item.plannedAmount), actualAmount: String(item.actualAmount), notes: item.notes || '' } : emptyItem);
  const [validationError, setValidationError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  async function handleSubmit(event) {
    event.preventDefault(); setValidationError('');
    const plannedAmount = Number(form.plannedAmount); const actualAmount = Number(form.actualAmount || 0);
    if (!Number.isFinite(plannedAmount) || plannedAmount < 0) { setValidationError('Planned amount must be a number of 0 or more'); return; }
    if (!Number.isFinite(actualAmount) || actualAmount < 0) { setValidationError('Actual amount must be a number of 0 or more'); return; }
    await onSubmit({ ...form, plannedAmount, actualAmount });
  }
  return <form onSubmit={handleSubmit} className="space-y-5">{hideHeader ? null : <div><h2 className="font-display text-2xl font-semibold text-stone-900">{item ? 'Edit Budget Item' : 'Add Budget Item'}</h2><p className="mt-1 text-sm text-stone-500">Track what you plan to spend and what you have actually paid.</p></div>}{(error || validationError) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{validationError || error}</div>}<label className="block text-sm font-medium text-stone-700">Category<select required name="category" value={form.category} onChange={update} className={inputClass}><option value="">Select a category</option>{budgetCategories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="block text-sm font-medium text-stone-700">Item Name<input required maxLength="120" name="title" value={form.title} onChange={update} className={inputClass} placeholder="e.g. Wedding Hall" /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-stone-700">Planned Amount ($)<input required min="0" step="0.01" type="number" name="plannedAmount" value={form.plannedAmount} onChange={update} className={inputClass} /></label><label className="text-sm font-medium text-stone-700">Actual Amount ($)<input min="0" step="0.01" type="number" name="actualAmount" value={form.actualAmount} onChange={update} className={inputClass} /></label></div><label className="block text-sm font-medium text-stone-700">Notes <span className="font-normal text-stone-400">(optional)</span><textarea rows="3" maxLength="500" name="notes" value={form.notes} onChange={update} className={`${inputClass} resize-none`} /></label><div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:justify-end"><button type="button" onClick={onCancel} className="rounded-full border px-6 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50">Cancel</button><button disabled={submitting} className="rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">{submitting ? 'Saving…' : item ? 'Save Changes' : 'Add Item'}</button></div></form>;
}
export default BudgetItemForm;
