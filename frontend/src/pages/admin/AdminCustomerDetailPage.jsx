import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminCustomer } from '../../services/roleService.js';
import { getApiError } from '../../utils/apiError.js';

const TABS = ['Overview', 'Profile', 'Weddings', 'Selections', 'Budgets', 'Guests', 'Tasks', 'Invitations', 'Payments'];

export default function AdminCustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminCustomer(id)
      .then(setData)
      .catch((e) => setError(getApiError(e)));
  }, [id]);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!data) return <div className="grid min-h-[40vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" /></div>;

  const { customer, profile, weddings } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/admin/customers" className="text-sm font-semibold text-brand-600">← Back to Customers</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{customer.firstName} {customer.lastName}</h1>
      <p className="mt-1 text-stone-500">{customer.email}</p>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === t ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 shadow-sm'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
        {tab === 'Overview' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div><p className="text-sm text-stone-500">Status</p><p className="font-semibold">{customer.isActive ? 'Active' : 'Inactive'}</p></div>
            <div><p className="text-sm text-stone-500">Weddings</p><p className="font-semibold">{weddings?.length || 0}</p></div>
            <div><p className="text-sm text-stone-500">Phone</p><p className="font-semibold">{customer.phone || '—'}</p></div>
            <div><p className="text-sm text-stone-500">Joined</p><p className="font-semibold">{new Date(customer.createdAt).toLocaleDateString()}</p></div>
          </div>
        )}
        {tab === 'Profile' && (
          <div className="space-y-3 text-sm">
            <p><span className="text-stone-500">City:</span> {profile?.city || '—'}</p>
            <p><span className="text-stone-500">Bio:</span> {profile?.bio || '—'}</p>
            <p><span className="text-stone-500">Partner:</span> {profile?.partnerName || '—'}</p>
          </div>
        )}
        {tab === 'Weddings' && (
          <div className="space-y-3">
            {weddings?.length ? weddings.map((w) => (
              <div key={w._id} className="rounded-xl border p-4">
                <p className="font-semibold">{w.weddingName}</p>
                <p className="text-sm text-stone-500">{new Date(w.weddingDate).toLocaleDateString()} · {w.city} · {w.status}</p>
                {w.planner && <p className="text-sm text-stone-500">Planner: {w.planner.firstName} {w.planner.lastName}</p>}
              </div>
            )) : <p className="text-stone-400">No weddings yet.</p>}
          </div>
        )}
        {tab === 'Budgets' && (
          <div className="space-y-3 text-sm">
            {(data.budgets || []).length ? data.budgets.map((b) => (
              <p key={b.weddingId}>{b.weddingName} · planned ${Number(b.totalPlannedCost || 0).toFixed(0)} · paid ${Number(b.totalPaid || 0).toFixed(0)} · remaining ${Number(b.remainingBudget || 0).toFixed(0)}</p>
            )) : <p className="text-stone-400">No budget data.</p>}
          </div>
        )}
        {['Selections', 'Guests', 'Tasks', 'Invitations', 'Payments'].includes(tab) && (
          <div className="space-y-3 text-sm">
            {tab === 'Selections' && (data.selections || []).map((s) => <p key={s._id}>{s.itemName} · {s.status}</p>)}
            {tab === 'Guests' && <p>{data.guests?.length || 0} guests on file.</p>}
            {tab === 'Tasks' && (data.tasks || []).map((t) => <p key={t._id}>{t.title} · {t.status}</p>)}
            {tab === 'Invitations' && <p>{data.invitations?.length || 0} invitations.</p>}
            {tab === 'Payments' && (data.payments || []).map((p) => <p key={p._id}>{p.transactionReference} · {p.status} · ${p.amount}</p>)}
            {tab !== 'Payments' && tab !== 'Selections' && tab !== 'Tasks' && null}
          </div>
        )}
      </div>
    </div>
  );
}
