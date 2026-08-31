import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { assignPlanner, getAdminWedding } from '../../services/roleService.js';
import { createInvitation, updateInvitation } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget, formatSlot, formatWeddingDate } from '../../utils/weddingFormat.js';

const TABS = ['Overview', 'Customer', 'Planner', 'Venue', 'Bride', 'Groom', 'Services', 'Guests', 'Tasks', 'Timeline', 'Invitations', 'Vendors', 'Bookings', 'Budget', 'Orders', 'Payments', 'Messages'];

function Status({ value }) {
  if (!value) return null;
  return <span className="capitalize text-stone-600">{String(value).replaceAll('_', ' ')}</span>;
}

export default function AdminWeddingDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('Overview');
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [plannerId, setPlannerId] = useState('');
  const [guestId, setGuestId] = useState('');

  const load = () => getAdminWedding(id).then((result) => {
    setData(result);
    setPlannerId(result.wedding?.planner?._id || '');
  }).catch((e) => setError(getApiError(e)));

  useEffect(() => { load(); }, [id]);

  const savePlanner = async (next) => {
    try {
      const result = await assignPlanner(id, next || null);
      setMessage(result.message || (next ? 'Planner assigned successfully.' : 'Planner removed. Wedding history was preserved.'));
      setError('');
      load();
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const sendOnBehalf = async (invitationId) => {
    try {
      await updateInvitation(invitationId, { status: 'sent', weddingId: id });
      setMessage('Invitation sent on behalf of the customer.');
      load();
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const createOnBehalf = async (e) => {
    e.preventDefault();
    try {
      await createInvitation({ guest: guestId, weddingId: id }, id);
      setGuestId('');
      setMessage('Invitation created on behalf of the customer.');
      load();
    } catch (err) {
      setError(getApiError(err));
    }
  };

  if (error && !data) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!data) return <p className="p-8 text-stone-400">Loading wedding…</p>;
  const { wedding, overview, selections, budget, guests, tasks, invitations, invitationSummary, orders, payments, hallBookings, conversations, timeline, bride, groom, planners } = data;
  const invitedGuestIds = new Set((invitations || []).map((item) => item.guest?._id || item.guest));

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/admin/weddings" className="text-sm font-semibold text-brand-600">← Weddings</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{wedding.weddingName}</h1>
      <p className="mt-1 text-stone-500">Owner: {wedding.customer?.firstName} {wedding.customer?.lastName} · Coordinator: {wedding.planner ? `${wedding.planner.firstName} ${wedding.planner.lastName}` : 'Unassigned'}</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      {message && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{message}</p>}

      <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="font-semibold">Assign Planner</h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <select value={plannerId} onChange={(e) => setPlannerId(e.target.value)} className="rounded-xl border px-4 py-2">
            <option value="">Unassigned</option>
            {(planners || []).map((p) => <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>)}
          </select>
          <button type="button" onClick={() => savePlanner(plannerId)} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">{wedding.planner ? 'Change Planner' : 'Assign Planner'}</button>
          {wedding.planner && <button type="button" onClick={() => { setPlannerId(''); savePlanner(''); }} className="rounded-full border px-4 py-2 text-sm font-semibold">Remove Planner</button>}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm font-medium ${tab === item ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 shadow-sm'}`}>{item}</button>
        ))}
      </div>
      <div className="mt-6 space-y-3 rounded-2xl bg-white p-6 shadow-sm">
        {tab === 'Overview' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <p>{wedding.city} · {formatWeddingDate(wedding.weddingDate)} · {wedding.status}</p>
            <p>Bookings {overview?.confirmedBookings || 0} · Vendors {overview?.confirmedVendors || 0}</p>
            <p>Guests {overview?.guestsAdded || guests?.length || 0} of {wedding.expectedGuests}</p>
            <p>Tasks {overview?.tasksCompleted || 0}/{overview?.tasksTotal || tasks?.length || 0}</p>
          </div>
        )}
        {tab === 'Customer' && <p>{wedding.customer?.firstName} {wedding.customer?.lastName} · {wedding.customer?.email} · {wedding.customer?.phone}</p>}
        {tab === 'Planner' && <p>{wedding.planner ? `${wedding.planner.firstName} ${wedding.planner.lastName} · ${wedding.planner.email}` : 'Unassigned'}</p>}
        {tab === 'Venue' && (
          <div className="space-y-2">
            <p>{wedding.selectedVenue?.name || wedding.venue || 'Not selected'}</p>
            {(hallBookings || []).map((b) => <p key={b._id}>{b.hall?.hallName} · {formatSlot(b.slotType)} · <Status value={b.status} /> · {b.paymentStatus}</p>)}
          </div>
        )}
        {tab === 'Bride' && ((bride || []).length ? bride.map((s) => <p key={s._id}>{s.itemName} · <Status value={s.status} /></p>) : <p className="text-stone-400">No bride services yet.</p>)}
        {tab === 'Groom' && ((groom || []).length ? groom.map((s) => <p key={s._id}>{s.itemName} · <Status value={s.status} /></p>) : <p className="text-stone-400">No groom services yet.</p>)}
        {tab === 'Services' && (selections || []).map((s) => <p key={s._id}>{s.itemName} · <Status value={s.status} /> · {s.vendor?.firstName} {s.vendor?.lastName}</p>)}
        {tab === 'Guests' && (guests || []).map((g) => <p key={g._id}>{g.firstName} {g.lastName} · RSVP {g.rsvpStatus} · table {g.tableNumber || '—'}</p>)}
        {tab === 'Tasks' && (tasks || []).map((t) => <p key={t._id}>{t.title} · <Status value={t.status} /> · {t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unassigned'}</p>)}
        {tab === 'Timeline' && ((timeline || []).length ? timeline.map((item) => <p key={item._id}>{item.title} · <Status value={item.displayStatus || item.status} /></p>) : <p className="text-stone-400">No timeline events yet.</p>)}
        {tab === 'Invitations' && (
          <div className="space-y-4">
            <p>Draft {invitationSummary?.draft || 0} · Sent {invitationSummary?.sent || 0} · Pending RSVP {invitationSummary?.pending || 0} · Accepted {invitationSummary?.accepted || 0} · Declined {invitationSummary?.declined || 0}</p>
            <form onSubmit={createOnBehalf} className="flex flex-wrap gap-2">
              <select required value={guestId} onChange={(e) => setGuestId(e.target.value)} className="rounded-xl border px-3 py-2">
                <option value="">Select guest</option>
                {(guests || []).filter((g) => !invitedGuestIds.has(g._id)).map((g) => <option key={g._id} value={g._id}>{g.firstName} {g.lastName}</option>)}
              </select>
              <button className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Create on behalf</button>
            </form>
            {(invitations || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between border-b py-2">
                <p>{item.guest?.firstName} {item.guest?.lastName} · <Status value={item.status} /></p>
                {item.status === 'draft' && <button type="button" onClick={() => sendOnBehalf(item._id)} className="text-sm font-semibold text-brand-700">Send on behalf of Customer</button>}
              </div>
            ))}
          </div>
        )}
        {tab === 'Vendors' && (orders || []).map((o) => <p key={o._id}>{o.itemName} · {o.vendor?.firstName} {o.vendor?.lastName} · <Status value={o.status} /></p>)}
        {tab === 'Bookings' && (hallBookings || []).map((b) => <p key={b._id}>{b.hall?.hallName} · {formatSlot(b.slotType)} · <Status value={b.status} /></p>)}
        {tab === 'Budget' && <p>Budget {formatBudget(budget?.totalBudget)} · Planned {formatBudget(budget?.totalPlannedCost)} · Paid {formatBudget(budget?.totalPaid)} · Due {formatBudget(budget?.totalAmountDue ?? budget?.outstandingPayments)} · Remaining {formatBudget(budget?.remainingBudget)}</p>}
        {tab === 'Orders' && (orders || []).map((o) => <p key={o._id}>{o.itemName} · {formatBudget(o.amount)} · <Status value={o.status} /> · {o.paymentStatus}</p>)}
        {tab === 'Payments' && (payments || []).map((p) => <p key={p._id}>{formatBudget(p.amount)} · <Status value={p.status} /> · {p.transactionReference}</p>)}
        {tab === 'Messages' && <p>{conversations?.length || 0} conversations</p>}
      </div>
    </div>
  );
}
