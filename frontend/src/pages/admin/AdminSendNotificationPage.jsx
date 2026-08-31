import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fieldClass } from '../../components/common/FormModal.jsx';
import { showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import {
  getAdminNotificationRecipients,
  sendAdminNotification,
} from '../../services/planningService.js';

const TYPES = ['general', 'wedding', 'booking', 'payment', 'task', 'planner', 'vendor', 'warning', 'announcement'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function AdminSendNotificationPage() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ users: [], weddings: [] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    message: '',
    recipientType: 'customers',
    recipientIds: [],
    weddingId: '',
    type: 'general',
    priority: 'normal',
    link: '',
  });

  useEffect(() => {
    getAdminNotificationRecipients()
      .then((data) => setMeta({ users: data.users || [], weddings: data.weddings || [] }))
      .catch((err) => setError(getApiError(err)));
  }, []);

  const selectableUsers = useMemo(() => {
    if (form.recipientType === 'specific') return meta.users;
    if (form.recipientType === 'customers') return meta.users.filter((u) => u.role === 'customer');
    if (form.recipientType === 'planners') return meta.users.filter((u) => u.role === 'planner');
    if (form.recipientType === 'vendors') return meta.users.filter((u) => u.role === 'vendor');
    return [];
  }, [form.recipientType, meta.users]);

  function update(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === 'recipientType' ? { recipientIds: [] } : {}),
    }));
  }

  function toggleRecipient(id) {
    setForm((current) => {
      const exists = current.recipientIds.includes(id);
      return {
        ...current,
        recipientIds: exists
          ? current.recipientIds.filter((item) => item !== id)
          : [...current.recipientIds, id],
      };
    });
  }

  async function onSubmit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        recipientType: form.recipientType,
        type: form.type,
        priority: form.priority,
        link: form.link.trim(),
        weddingId: form.weddingId || undefined,
        recipientIds: form.recipientType === 'wedding_participants' ? [] : form.recipientIds,
      };
      const result = await sendAdminNotification(payload);
      await showSuccess('Notification sent', result.message || `Sent to ${result.sentCount} recipient(s).`);
      navigate('/admin/notifications');
    } catch (err) {
      setError(getApiError(err));
      await showApiError(err, 'Unable to send notification');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold text-brand-600">Notifications</p>
      <h1 className="font-display text-4xl font-semibold">Send Notification</h1>
      <p className="mt-2 text-sm text-stone-500">Send a targeted alert to customers, planners, vendors, or wedding participants.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-5 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <label className="block text-sm font-medium">Title *
          <input required name="title" value={form.title} onChange={update} className={fieldClass} maxLength={160} />
        </label>
        <label className="block text-sm font-medium">Message *
          <textarea required name="message" value={form.message} onChange={update} rows={4} className={`${fieldClass} resize-none`} maxLength={500} />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">Recipient Type *
            <select name="recipientType" value={form.recipientType} onChange={update} className={fieldClass}>
              <option value="specific">Specific User(s)</option>
              <option value="customers">Customers</option>
              <option value="planners">Wedding Planners</option>
              <option value="vendors">Vendors</option>
              <option value="wedding_participants">Wedding Participants</option>
            </select>
          </label>
          <label className="block text-sm font-medium">Type
            <select name="type" value={form.type} onChange={update} className={fieldClass}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Priority
            <select name="priority" value={form.priority} onChange={update} className={fieldClass}>
              {PRIORITIES.map((priority) => <option key={priority} value={priority}>{priority}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">Action Link <span className="font-normal text-stone-400">(optional)</span>
            <input name="link" value={form.link} onChange={update} className={fieldClass} placeholder="/dashboard" />
          </label>
        </div>

        {form.recipientType === 'wedding_participants' || form.recipientType === 'wedding' ? (
          <label className="block text-sm font-medium">Related Wedding *
            <select required name="weddingId" value={form.weddingId} onChange={update} className={fieldClass}>
              <option value="">Select wedding</option>
              {meta.weddings.map((wedding) => (
                <option key={wedding._id} value={wedding._id}>
                  {wedding.weddingName}
                  {wedding.customer ? ` · ${wedding.customer.firstName} ${wedding.customer.lastName}` : ''}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-medium">
                Recipients {form.recipientType === 'specific' ? '*' : <span className="font-normal text-stone-400">(leave empty for all)</span>}
              </p>
              {selectableUsers.length ? (
                <button
                  type="button"
                  className="text-xs font-semibold text-brand-700"
                  onClick={() => setForm((current) => ({
                    ...current,
                    recipientIds: current.recipientIds.length === selectableUsers.length
                      ? []
                      : selectableUsers.map((user) => user._id),
                  }))}
                >
                  {form.recipientIds.length === selectableUsers.length ? 'Clear all' : 'Select all listed'}
                </button>
              ) : null}
            </div>
            <div className="max-h-56 overflow-y-auto rounded-2xl border border-stone-100 p-3 dark:border-stone-700">
              {selectableUsers.map((user) => (
                <label key={user._id} className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-stone-50 dark:hover:bg-stone-800">
                  <input
                    type="checkbox"
                    checked={form.recipientIds.includes(user._id)}
                    onChange={() => toggleRecipient(user._id)}
                  />
                  <span className="font-medium">{user.firstName} {user.lastName}</span>
                  <span className="text-xs capitalize text-stone-400">{user.role}</span>
                </label>
              ))}
              {!selectableUsers.length ? <p className="p-3 text-sm text-stone-400">No users available.</p> : null}
            </div>
            {form.recipientType !== 'wedding_participants' ? (
              <label className="mt-4 block text-sm font-medium">Related Wedding <span className="font-normal text-stone-400">(optional)</span>
                <select name="weddingId" value={form.weddingId} onChange={update} className={fieldClass}>
                  <option value="">None</option>
                  {meta.weddings.map((wedding) => (
                    <option key={wedding._id} value={wedding._id}>{wedding.weddingName}</option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/admin/notifications')} className="rounded-full border border-stone-200 px-5 py-2.5 text-sm font-semibold">Cancel</button>
          <button disabled={saving} className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
            {saving ? 'Sending…' : 'Send Notification'}
          </button>
        </div>
      </form>
    </div>
  );
}
