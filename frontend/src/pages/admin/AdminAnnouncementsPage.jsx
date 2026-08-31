import { useEffect, useState } from 'react';
import { fieldClass } from '../../components/common/FormModal.jsx';
import { showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import {
  createAdminAnnouncement,
  getAdminAnnouncements,
  updateAdminAnnouncement,
} from '../../services/planningService.js';
import { formatWeddingDate } from '../../utils/weddingFormat.js';

const emptyForm = {
  title: '',
  message: '',
  audience: 'all',
  priority: 'normal',
  startDate: '',
  endDate: '',
  status: 'draft',
};

export default function AdminAnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const data = await getAdminAnnouncements();
      setItems(data.announcements || []);
      setError('');
    } catch (err) {
      setError(getApiError(err));
    }
  }

  useEffect(() => { load(); }, []);

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await createAdminAnnouncement({
        ...form,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      });
      setForm(emptyForm);
      await showSuccess('Announcement saved', form.status === 'published' ? 'Published and delivered to the audience.' : 'Saved as draft.');
      await load();
    } catch (err) {
      await showApiError(err);
    } finally {
      setSaving(false);
    }
  }

  async function publish(id) {
    try {
      await updateAdminAnnouncement(id, { status: 'published' });
      await showSuccess('Published', 'Announcement published to the audience.');
      await load();
    } catch (err) {
      await showApiError(err);
    }
  }

  async function archive(id) {
    try {
      await updateAdminAnnouncement(id, { status: 'archived' });
      await showSuccess('Archived', 'Announcement archived.');
      await load();
    } catch (err) {
      await showApiError(err);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm font-semibold text-brand-600">Notifications</p>
      <h1 className="font-display text-4xl font-semibold">Announcements</h1>
      <p className="mt-2 text-sm text-stone-500">Broad platform messages for customers, planners, or vendors.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-medium">Title
            <input required className={fieldClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="sm:col-span-2 text-sm font-medium">Message
            <textarea required rows={3} className={`${fieldClass} resize-none`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          </label>
          <label className="text-sm font-medium">Audience
            <select className={fieldClass} value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              <option value="all">All Users</option>
              <option value="customers">Customers</option>
              <option value="planners">Wedding Planners</option>
              <option value="vendors">Vendors</option>
            </select>
          </label>
          <label className="text-sm font-medium">Priority
            <select className={fieldClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {['low', 'normal', 'high', 'urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium">Start Date
            <input type="date" className={fieldClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </label>
          <label className="text-sm font-medium">End Date
            <input type="date" className={fieldClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </label>
          <label className="text-sm font-medium">Status
            <select className={fieldClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="draft">draft</option>
              <option value="published">published</option>
            </select>
          </label>
        </div>
        <button disabled={saving} className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Create Announcement'}
        </button>
      </form>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <article key={item._id} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">{item.status} · {item.audience} · {item.priority}</p>
                <h2 className="mt-1 text-lg font-semibold">{item.title}</h2>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">{item.message}</p>
                <p className="mt-3 text-xs text-stone-400">
                  {formatWeddingDate(item.startDate)}
                  {item.endDate ? ` → ${formatWeddingDate(item.endDate)}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {item.status === 'draft' ? (
                  <button type="button" onClick={() => publish(item._id)} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Publish</button>
                ) : null}
                {item.status !== 'archived' ? (
                  <button type="button" onClick={() => archive(item._id)} className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold">Archive</button>
                ) : null}
              </div>
            </div>
          </article>
        ))}
        {!items.length ? <p className="text-sm text-stone-400">No announcements yet.</p> : null}
      </div>
    </div>
  );
}
