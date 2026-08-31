import { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { FormModal, fieldClass, FieldError } from '../../components/common/index.js';
import { PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { createTimelineEvent, getTimeline, updateTimelineEvent } from '../../services/planningService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { formatWeddingDate } from '../../utils/weddingFormat.js';

export default function TimelinePage() {
  const { activeWeddingId } = useActiveWedding();
  const [events, setEvents] = useState([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => getTimeline(activeWeddingId).then((data) => setEvents(data.events || [])).catch((err) => setError(getApiError(err)));
  useEffect(() => { if (activeWeddingId) load(); }, [activeWeddingId]);

  async function submit() {
    const nextErrors = {};
    if (!form.title?.trim()) nextErrors.title = 'Title is required.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      if (form._id) {
        await updateTimelineEvent(form._id, { title: form.title, dueDate: form.dueDate || undefined });
        await showSuccess('Timeline updated successfully.');
      } else {
        await createTimelineEvent({ title: form.title, dueDate: form.dueDate || undefined }, activeWeddingId);
        await showSuccess('Timeline item added successfully.');
      }
      setForm(null);
      load();
    } catch (err) {
      await showApiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(item, status) {
    if (status === item.status) return;
    const confirmed = await confirmAction({
      title: `Update “${item.title}” to ${status.replace('_', ' ')}?`,
      confirmButtonText: 'Update Status',
    });
    if (!confirmed) return;
    try {
      await updateTimelineEvent(item._id, { status });
      await showSuccess('Timeline status updated.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Wedding Operations"
        title="Timeline"
        description="Milestones counted back from your wedding date."
        action={<button type="button" onClick={() => { setForm({ title: '', dueDate: '' }); setErrors({}); }} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white"><FiPlus /> Add Timeline Item</button>}
      />
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      <ol className="mt-8 space-y-4">
        {events.map((item, index) => (
          <li key={item._id} className="flex gap-4 rounded-2xl bg-white p-5 shadow-sm">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700">{index + 1}</span>
            <div className="flex-1">
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-sm text-stone-500">{item.description}</p>
              <p className="mt-2 text-xs text-stone-400">{formatWeddingDate(item.dueDate)} · {(item.displayStatus || item.status).replace('_', ' ')}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button type="button" onClick={() => { setForm({ _id: item._id, title: item.title, dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : '' }); setErrors({}); }} className="text-sm font-semibold text-brand-700">Edit</button>
              <select value={item.status} onChange={(e) => changeStatus(item, e.target.value)} className="h-10 rounded-xl border px-3 text-sm">
                <option value="upcoming">Upcoming</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>
          </li>
        ))}
      </ol>

      <FormModal
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title={form?._id ? 'Edit Timeline Item' : 'Add Timeline Item'}
        loading={saving}
        onSubmit={submit}
        submitLabel={form?._id ? 'Save Item' : 'Add Item'}
      >
        {form ? (
          <>
            <label className="block text-sm font-medium text-stone-700">
              Title
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldClass} />
              <FieldError message={errors.title} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Due date
              <input type="date" value={form.dueDate || ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={fieldClass} />
            </label>
          </>
        ) : null}
      </FormModal>
    </div>
  );
}
