import { useState } from 'react';
import { FiCalendar, FiSave, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const emptyForm = { weddingName: '', partner1Name: '', partner2Name: '', weddingDate: '', venue: '', city: '', estimatedBudget: '', expectedGuests: '', description: '' };
const inputClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-stone-800 outline-none transition placeholder:text-stone-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function WeddingForm({ initialValues = emptyForm, onSubmit, submitting, submitLabel, error, minimumDate, focusFields = [], cancelTo = '/dashboard', hideIntro = false, showCancel = true }) {
  const [form, setForm] = useState({ ...emptyForm, ...initialValues });
  const [validationError, setValidationError] = useState('');
  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const fieldClass = (name) => focusFields.includes(name) ? `${inputClass} ring-2 ring-amber-300 border-amber-400 bg-amber-50/40` : inputClass;

  async function handleSubmit(event) {
    event.preventDefault();
    setValidationError('');
    if (Number(form.estimatedBudget) < 0) { setValidationError('Estimated budget cannot be negative'); return; }
    if (Number(form.expectedGuests) < 0 || !Number.isInteger(Number(form.expectedGuests))) { setValidationError('Expected guests must be a whole number of 0 or more'); return; }
    await onSubmit({ ...form, estimatedBudget: Number(form.estimatedBudget), expectedGuests: Number(form.expectedGuests) });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-7">
      {(error || validationError) && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{validationError || error}</div>}
      {!hideIntro && <div><h2 className="text-lg font-semibold text-stone-900">Wedding details</h2><p className="mt-1 text-sm text-stone-500">Tell us the essentials. You can update these details later.</p></div>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="sm:col-span-2 text-sm font-medium text-stone-700">Wedding Name<input required maxLength="120" name="weddingName" value={form.weddingName} onChange={update} className={fieldClass('weddingName')} placeholder="e.g. Ismail & Amina Wedding" /></label>
        <label className="text-sm font-medium text-stone-700">Partner 1 Name<input required maxLength="80" name="partner1Name" value={form.partner1Name} onChange={update} className={fieldClass('partner1Name')} /></label>
        <label className="text-sm font-medium text-stone-700">Partner 2 Name<input required maxLength="80" name="partner2Name" value={form.partner2Name} onChange={update} className={fieldClass('partner2Name')} /></label>
        <label className="text-sm font-medium text-stone-700">Wedding Date<span className="relative block"><input required type="date" min={minimumDate} name="weddingDate" value={form.weddingDate} onChange={update} className={`${fieldClass('weddingDate')} pr-10`} /><FiCalendar className="pointer-events-none absolute right-4 top-6 text-stone-400" /></span></label>
        <label className="text-sm font-medium text-stone-700">City<input required maxLength="80" name="city" value={form.city} onChange={update} className={fieldClass('city')} placeholder="e.g. Mogadishu" /></label>
        <label className="sm:col-span-2 text-sm font-medium text-stone-700">Venue <span className="font-normal text-stone-400">(optional)</span><input maxLength="160" name="venue" value={form.venue} onChange={update} className={fieldClass('venue')} placeholder="Wedding hall or venue" /></label>
        <label className="text-sm font-medium text-stone-700">Estimated Budget ($)<input required min="0" step="0.01" type="number" name="estimatedBudget" value={form.estimatedBudget} onChange={update} className={fieldClass('estimatedBudget')} placeholder="0" /></label>
        <label className="text-sm font-medium text-stone-700">Expected Number of Guests<input required min="0" step="1" type="number" name="expectedGuests" value={form.expectedGuests} onChange={update} className={fieldClass('expectedGuests')} placeholder="0" /></label>
        <label className="sm:col-span-2 text-sm font-medium text-stone-700">Description <span className="font-normal text-stone-400">(optional)</span><textarea rows="4" maxLength="1000" name="description" value={form.description} onChange={update} className={`${fieldClass('description')} resize-none`} placeholder="Share a little about your celebration" /></label>
      </div>
      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-end">
        {showCancel && cancelTo ? <Link to={cancelTo} className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-600 hover:bg-stone-50"><FiX /> Cancel</Link> : null}
        <button disabled={submitting} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-7 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"><FiSave /> {submitting ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}

export default WeddingForm;
