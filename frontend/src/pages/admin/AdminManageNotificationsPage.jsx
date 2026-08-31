import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrash2 } from 'react-icons/fi';
import ViewModal from '../../components/common/ViewModal.jsx';
import { fieldClass } from '../../components/common/FormModal.jsx';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import {
  archiveAdminNotification,
  getAdminNotification,
  getAdminNotifications,
} from '../../services/planningService.js';
import { formatWeddingDate } from '../../utils/weddingFormat.js';

export default function AdminManageNotificationsPage() {
  const [data, setData] = useState({ notifications: [], stats: {} });
  const [filters, setFilters] = useState({ search: '', role: '', type: '', priority: '', read: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const result = await getAdminNotifications(filters);
      setData(result);
      setError('');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  async function viewItem(id) {
    try {
      const result = await getAdminNotification(id);
      setSelected(result.notification);
    } catch (err) {
      await showApiError(err);
    }
  }

  async function archiveItem(id) {
    const ok = await confirmAction({
      title: 'Archive this notification?',
      text: 'It will be hidden from the admin manage list.',
      confirmButtonText: 'Archive',
      danger: true,
    });
    if (!ok) return;
    try {
      await archiveAdminNotification(id);
      await showSuccess('Archived', 'Notification archived.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  }

  const stats = data.stats || {};

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">Notifications</p>
          <h1 className="font-display text-4xl font-semibold">Manage Notifications</h1>
        </div>
        <Link to="/admin/notifications/send" className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
          <FiPlus /> Send Notification
        </Link>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[
          ['Total Sent', stats.totalSent],
          ['Unread', stats.unread],
          ['Read', stats.read],
          ['Today', stats.today],
          ['High Priority', stats.highPriority],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-5 shadow-sm dark:bg-stone-900">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-2 text-2xl font-semibold">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-stone-900 md:grid-cols-5">
        <input className={fieldClass} placeholder="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
        <select className={fieldClass} value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })}>
          <option value="">All roles</option>
          <option value="customer">Customer</option>
          <option value="planner">Planner</option>
          <option value="vendor">Vendor</option>
          <option value="admin">Admin</option>
        </select>
        <select className={fieldClass} value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
          <option value="">All types</option>
          {['general', 'wedding', 'booking', 'payment', 'task', 'planner', 'vendor', 'warning', 'announcement', 'system'].map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <select className={fieldClass} value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priorities</option>
          {['low', 'normal', 'high', 'urgent'].map((priority) => <option key={priority} value={priority}>{priority}</option>)}
        </select>
        <select className={fieldClass} value={filters.read} onChange={(e) => setFilters({ ...filters, read: e.target.value })}>
          <option value="">Read / Unread</option>
          <option value="false">Unread</option>
          <option value="true">Read</option>
        </select>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p> : null}
      {loading ? <p className="mt-8 text-stone-400">Loading…</p> : (
        <div className="mt-6 overflow-x-auto rounded-3xl border border-stone-100 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-800">
              <tr>
                {['Title', 'Recipient', 'Role', 'Type', 'Priority', 'Status', 'Wedding', 'Sent By', 'Date', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.notifications || []).map((row) => (
                <tr key={row._id} className="border-t border-stone-100 dark:border-stone-800">
                  <td className="px-4 py-3 font-medium">{row.title}</td>
                  <td className="px-4 py-3">{row.user ? `${row.user.firstName} ${row.user.lastName}` : '—'}</td>
                  <td className="px-4 py-3 capitalize">{row.user?.role || '—'}</td>
                  <td className="px-4 py-3 capitalize">{row.type}</td>
                  <td className="px-4 py-3 capitalize">{row.priority || 'normal'}</td>
                  <td className="px-4 py-3">{row.read ? 'Read' : 'Unread'}</td>
                  <td className="px-4 py-3">{row.wedding?.weddingName || '—'}</td>
                  <td className="px-4 py-3">{row.sentBy ? `${row.sentBy.firstName} ${row.sentBy.lastName}` : '—'}</td>
                  <td className="px-4 py-3">{formatWeddingDate(row.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button type="button" onClick={() => viewItem(row._id)} className="text-sm font-semibold text-brand-700">View</button>
                      <button type="button" onClick={() => archiveItem(row._id)} className="text-sm font-semibold text-red-600" aria-label="Archive"><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.notifications?.length ? <p className="p-8 text-center text-sm text-stone-400">No sent notifications yet.</p> : null}
        </div>
      )}

      <ViewModal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title || 'Notification'} size="md">
        {selected ? (
          <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
            <p>{selected.message}</p>
            <dl className="grid gap-2 rounded-2xl bg-stone-50 p-4 dark:bg-stone-800">
              <div><dt className="text-xs uppercase text-stone-400">Recipient</dt><dd>{selected.user ? `${selected.user.firstName} ${selected.user.lastName}` : '—'}</dd></div>
              <div><dt className="text-xs uppercase text-stone-400">Type / Priority</dt><dd className="capitalize">{selected.type} · {selected.priority || 'normal'}</dd></div>
              <div><dt className="text-xs uppercase text-stone-400">Wedding</dt><dd>{selected.wedding?.weddingName || '—'}</dd></div>
              {selected.link ? <div><dt className="text-xs uppercase text-stone-400">Link</dt><dd>{selected.link}</dd></div> : null}
            </dl>
          </div>
        ) : null}
      </ViewModal>
    </div>
  );
}
