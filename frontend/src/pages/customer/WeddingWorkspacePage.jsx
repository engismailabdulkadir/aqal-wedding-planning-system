import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiCalendar, FiCheckCircle, FiClock, FiCreditCard, FiDollarSign, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { PageHeader, StatCard, StatusBadge, Tabs, VenueImage } from '../../components/ui/index.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { createConversation } from '../../services/planningService.js';
import { getWeddingManagement } from '../../services/weddingService.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget, formatSlot, formatWeddingDate, getDaysRemainingLabel } from '../../utils/weddingFormat.js';
import { venueCover } from '../../utils/media.js';

const TABS = ['Overview', 'Venue', 'Bride', 'Groom', 'Services', 'Planner', 'Guests', 'Tasks', 'Timeline', 'Invitations', 'Budget', 'Orders', 'Payments', 'Messages'];

function Status({ value }) {
  return <StatusBadge value={value} />;
}

function invitationLabel(guest) {
  if (!guest) return 'Not sent';
  if (guest.rsvpStatus === 'accepted') return 'RSVP accepted';
  if (guest.rsvpStatus === 'declined') return 'RSVP declined';
  if (guest.invitationStatus === 'viewed') return 'Viewed';
  if (guest.invitationStatus === 'sent') return 'Sent';
  return 'Not sent';
}

export default function WeddingWorkspacePage() {
  const { activeWedding: wedding, activeWeddingId } = useActiveWedding();
  const [tab, setTab] = useState('Overview');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!activeWeddingId) return;
    setError('');
    const snapshot = await getWeddingManagement(activeWeddingId);
    setData(snapshot);
  }, [activeWeddingId]);

  useEffect(() => {
    if (!activeWeddingId) {
      setData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    load()
      .catch((e) => { if (active) setError(getApiError(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeWeddingId, load]);

  useEffect(() => {
    function refresh() {
      if (document.visibilityState === 'hidden') return;
      load().catch((e) => setError(getApiError(e)));
    }
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [load]);

  if (!wedding) {
    return (
      <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
        <h1 className="font-display text-3xl font-semibold">You haven&apos;t created a wedding yet.</h1>
        <Link to="/weddings/new" className="mt-6 inline-block rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Create Wedding</Link>
      </div>
    );
  }

  const overview = data?.overview || {};
  const hall = data?.hall?.current || data?.hall?.bookings?.find((item) => ['held', 'pending', 'confirmed'].includes(item.status));
  const orders = (data?.bookings?.orders || []).filter((item) => !['cancelled', 'rejected'].includes(item.status));
  const guests = data?.guests?.items || [];
  const tasks = data?.tasks?.items || [];
  const timeline = data?.timeline?.events || [];
  const invitations = data?.invitations?.items || [];
  const payments = data?.payments?.records || [];
  const conversations = data?.conversations || [];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader eyebrow="Wedding workspace" title={wedding.weddingName} description={`${wedding.partner1Name} & ${wedding.partner2Name} · ${formatWeddingDate(wedding.weddingDate)}`} />
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-6">
        <Tabs items={TABS} value={tab} onChange={setTab} />
      </div>
      <div className="mt-6 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
        {loading && !data ? <p className="text-stone-400">Loading this wedding…</p> : null}

        {tab === 'Overview' && data && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={FiCalendar} label="Wedding Date" value={formatWeddingDate(overview.weddingDate)} helper={getDaysRemainingLabel(overview.weddingDate)} />
              <StatCard icon={FiClock} label="Days Remaining" value={overview.daysRemaining == null ? '—' : String(overview.daysRemaining)} />
              <StatCard icon={FiDollarSign} label="Total Budget" value={formatBudget(overview.totalBudget)} helper={`Planned ${formatBudget(overview.plannedCost)}`} />
              <StatCard icon={FiCreditCard} label="Amount Paid" value={formatBudget(overview.totalPaid)} helper={`Due ${formatBudget(overview.amountDue)}`} />
              <StatCard icon={FiUsers} label="Guests" value={`${overview.guestsAdded || 0} of ${overview.expectedGuests || 0}`} helper="expected" />
              <StatCard icon={FiCheckCircle} label="Tasks Completed" value={`${overview.tasksPercentage || 0}%`} helper={`${overview.tasksCompleted || 0} of ${overview.tasksTotal || 0} tasks`} />
              <StatCard icon={FiShoppingBag} label="Confirmed Vendors" value={String(overview.confirmedVendors || 0)} />
              <StatCard icon={FiCalendar} label="Bookings" value={String(overview.confirmedBookings || 0)} helper={overview.pendingBookings ? `${overview.pendingBookings} pending` : undefined} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <p><span className="text-stone-500">Venue / Hall:</span> {overview.venueName || 'Not selected'}{overview.hallName ? ` · ${overview.hallName}` : ''}{overview.slot ? ` · ${formatSlot(overview.slot)}` : ''}</p>
              <p><span className="text-stone-500">Planner:</span> {overview.plannerName || 'Not assigned'}</p>
              <p><span className="text-stone-500">Remaining budget:</span> {formatBudget(overview.remainingBudget)}</p>
              <p><span className="text-stone-500">Amount due:</span> {formatBudget(overview.amountDue)}</p>
            </div>
            {overview.upcomingTimeline?.length ? (
              <div>
                <p className="text-sm font-semibold text-stone-700">Upcoming timeline</p>
                <ul className="mt-3 space-y-2">
                  {overview.upcomingTimeline.map((item) => (
                    <li key={item._id} className="flex items-center justify-between text-sm">
                      <span>{item.title}</span>
                      <Status value={item.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}

        {tab === 'Venue' && (
          <div>
            {hall ? (
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <div className="overflow-hidden rounded-2xl">
                  <VenueImage src={venueCover(hall.venue)} alt={hall.venue?.name || 'Venue'} entity={hall.venue} className="h-48 w-full object-cover" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <p><span className="text-stone-500">Venue:</span> {hall.venue?.name}</p>
                  <p><span className="text-stone-500">Hall:</span> {hall.hall?.hallName}</p>
                  <p><span className="text-stone-500">Date:</span> {formatWeddingDate(hall.bookingDate)}</p>
                  <p><span className="text-stone-500">Slot:</span> {formatSlot(hall.slotType)}</p>
                  <p><span className="text-stone-500">Capacity:</span> {hall.hall?.capacity || '—'}</p>
                  <p><span className="text-stone-500">Price:</span> {formatBudget(hall.agreedTotalAmount ?? hall.basePrice ?? 0)}</p>
                  <p><span className="text-stone-500">Deposit:</span> {formatBudget(hall.requiredDeposit ?? hall.depositRequired ?? 0)}</p>
                  <p><span className="text-stone-500">Paid:</span> {formatBudget(hall.amountPaid ?? 0)}</p>
                  <p><span className="text-stone-500">Remaining:</span> {formatBudget(Math.max(0, Number(hall.agreedTotalAmount ?? hall.basePrice ?? 0) - Number(hall.amountPaid ?? 0)))}</p>
                  <p><span className="text-stone-500">Booking:</span> <Status value={hall.status} /></p>
                  <p><span className="text-stone-500">Payment:</span> <Status value={hall.paymentStatus} /></p>
                </div>
              </div>
            ) : <p className="text-stone-400">No hall reserved yet.</p>}
            <div className="mt-4 flex flex-wrap gap-4">
              <Link to="/venues" className="font-semibold text-brand-700">Browse venues</Link>
              {hall && hall.paymentStatus !== 'paid' && <Link to="/payments" className="font-semibold text-brand-700">Pay hall</Link>}
            </div>
          </div>
        )}

        {tab === 'Bride' && <SelectionList items={data?.bride || []} empty="No bride services selected." to="/services?category=bride_dress" />}
        {tab === 'Groom' && <SelectionList items={data?.groom || []} empty="No groom services selected." to="/services?category=groom_attire" />}
        {tab === 'Services' && <SelectionList items={data?.services || []} empty="No wedding services selected." to="/services" />}

        {tab === 'Planner' && (
          <div className="space-y-4">
            {data?.planner?.assigned ? (
              <>
                <p className="font-semibold">{data.planner.name}</p>
                <p className="text-sm text-stone-500">{data.planner.email}{data.planner.phone ? ` · ${data.planner.phone}` : ''}</p>
                <p className="text-sm">Assignment: <Status value={data.planner.status} /> · Wedding progress {data.planner.weddingProgress || 0}%</p>
                <p className="text-sm text-stone-600">Vendor coordination: {data.planner.vendorCoordination?.confirmed || 0} confirmed · {data.planner.vendorCoordination?.pending || 0} pending</p>
                {data.planner.plannerTasks?.length ? (
                  <div>
                    <p className="text-sm font-semibold">Tasks created by planner</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {data.planner.plannerTasks.map((task) => <li key={task._id}>{task.title} · {task.status.replaceAll('_', ' ')}</li>)}
                    </ul>
                  </div>
                ) : <p className="text-sm text-stone-400">No planner tasks yet.</p>}
                {data.planner.upcomingDeadlines?.length ? (
                  <div>
                    <p className="text-sm font-semibold">Upcoming deadlines</p>
                    <ul className="mt-2 space-y-1 text-sm">
                      {data.planner.upcomingDeadlines.map((task) => <li key={task._id}>{task.title} · {formatWeddingDate(task.dueDate)}</li>)}
                    </ul>
                  </div>
                ) : null}
                <button type="button" onClick={() => createConversation({ withPlanner: true }, activeWeddingId).then(() => { window.location.href = '/messages'; })} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Message planner</button>
              </>
            ) : (
              <p className="text-stone-600">{data?.planner?.message || 'An admin will assign a planner.'}</p>
            )}
          </div>
        )}

        {tab === 'Guests' && (
          <div>
            <p className="font-semibold">{overview.guestsAdded || 0} of {overview.expectedGuests || 0} expected</p>
            <p className="mt-1 text-sm text-stone-500">{data?.guests?.summary?.accepted || 0} accepted · {data?.guests?.summary?.pending || 0} pending RSVP</p>
            <div className="mt-4 space-y-2">
              {guests.slice(0, 12).map((guest) => (
                <p key={guest._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 px-4 py-3 text-sm">
                  <span>{guest.firstName} {guest.lastName} · {guest.side}</span>
                  <span className="text-stone-500">{invitationLabel(guest)}{guest.tableNumber ? ` · Table ${guest.tableNumber}` : ''} · {guest.numberAttending || 1} attending</span>
                </p>
              ))}
              {!guests.length && <p className="text-stone-400">No guests added yet.</p>}
            </div>
            <Link className="mt-4 inline-block font-semibold text-brand-700" to="/guests">Manage guests</Link>
          </div>
        )}

        {tab === 'Tasks' && (
          <div>
            <p className="font-semibold">{overview.tasksCompleted || 0}/{overview.tasksTotal || 0} completed · {overview.tasksPercentage || 0}%</p>
            <ul className="mt-4 space-y-2">
              {tasks.slice(0, 12).map((task) => (
                <li key={task._id} className="flex items-center justify-between rounded-xl border border-stone-100 px-4 py-3 text-sm">
                  <span>{task.title}</span>
                  <Status value={task.status === 'pending' ? 'todo' : task.status} />
                </li>
              ))}
              {!tasks.length && <p className="text-stone-400">No tasks yet.</p>}
            </ul>
            <Link className="mt-4 inline-block font-semibold text-brand-700" to="/tasks">Open tasks</Link>
          </div>
        )}

        {tab === 'Timeline' && (
          <ol className="space-y-3">
            {timeline.map((item) => (
              <li key={item._id} className="flex items-center justify-between gap-3 rounded-xl border border-stone-100 px-4 py-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="text-xs text-stone-400">{formatWeddingDate(item.dueDate)}</p>
                </div>
                <Status value={item.displayStatus || item.status} />
              </li>
            ))}
            <Link className="inline-block font-semibold text-brand-700" to="/timeline">Open timeline</Link>
          </ol>
        )}

        {tab === 'Invitations' && (
          <div>
            <p className="text-sm text-stone-500">{data?.invitations?.summary?.sent || 0} sent · {data?.guests?.summary?.accepted || 0} RSVP accepted</p>
            <ul className="mt-4 space-y-2">
              {invitations.map((item) => (
                <li key={item._id} className="flex items-center justify-between rounded-xl border border-stone-100 px-4 py-3 text-sm">
                  <span>{item.guest?.firstName} {item.guest?.lastName}</span>
                  <span className="text-stone-500">{item.status} · {invitationLabel(item.guest)}</span>
                </li>
              ))}
              {!invitations.length && <p className="text-stone-400">No invitations created yet.</p>}
            </ul>
            <Link className="mt-4 inline-block font-semibold text-brand-700" to="/invitations">Open invitations</Link>
          </div>
        )}

        {tab === 'Budget' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <p>Total budget {formatBudget(overview.totalBudget)}</p>
            <p>Planned cost {formatBudget(overview.plannedCost)}</p>
            <p>Paid {formatBudget(overview.totalPaid)}</p>
            <p>Amount due {formatBudget(overview.amountDue)}</p>
            <p>Remaining budget {formatBudget(overview.remainingBudget)}</p>
            <Link className="font-semibold text-brand-700" to="/budget">Open budget</Link>
          </div>
        )}

        {tab === 'Orders' && (
          <div className="space-y-3">
            {orders.map((order) => (
              <p key={order._id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-100 px-4 py-3 text-sm">
                <span>{order.itemName} · {formatBudget(order.amount)}</span>
                <span><Status value={order.status} /> <Status value={order.paymentStatus} /></span>
              </p>
            ))}
            {!orders.length && <p className="text-stone-400">No orders yet.</p>}
            <Link className="inline-block font-semibold text-brand-700" to="/payments">Pay orders</Link>
          </div>
        )}

        {tab === 'Payments' && (
          <div>
            <p>Paid {formatBudget(overview.totalPaid)} · due {formatBudget(overview.amountDue)}</p>
            <ul className="mt-4 space-y-2">
              {payments.map((payment) => (
                <li key={payment._id} className="flex items-center justify-between rounded-xl border border-stone-100 px-4 py-3 text-sm">
                  <span>{formatBudget(payment.amount)} · {payment.paymentType}</span>
                  <Status value={payment.status} />
                </li>
              ))}
              {!payments.length && <p className="text-stone-400">No payments yet.</p>}
            </ul>
            <Link className="mt-4 inline-block font-semibold text-brand-700" to="/payments">Open payments</Link>
          </div>
        )}

        {tab === 'Messages' && (
          <div>
            <ul className="space-y-2">
              {conversations.map((conversation) => {
                const other = conversation.participants?.find((person) => person.role !== 'customer');
                return (
                  <li key={conversation._id} className="rounded-xl border border-stone-100 px-4 py-3 text-sm">
                    {other ? `${other.firstName} ${other.lastName} · ${other.role}` : 'Conversation'}
                    {conversation.order?.itemName ? ` · ${conversation.order.itemName}` : ''}
                  </li>
                );
              })}
              {!conversations.length && <p className="text-stone-400">No wedding conversations yet. Message your assigned planner or a vendor with an active order.</p>}
            </ul>
            <div className="mt-4 flex flex-wrap gap-4">
              {data?.planner?.assigned && <button type="button" onClick={() => createConversation({ withPlanner: true }, activeWeddingId).then(() => { window.location.href = '/messages'; })} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Message planner</button>}
              <Link className="inline-flex items-center font-semibold text-brand-700" to="/messages">Open messages</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SelectionList({ items, empty, to }) {
  return (
    <div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item._id} className="rounded-xl border border-stone-100 p-4">
            <p className="font-semibold">{item.itemName}</p>
            <p className="mt-1 text-sm capitalize text-stone-500">{item.category.replaceAll('_', ' ')} · {formatBudget(item.totalAmount)} · {item.status.replaceAll('_', ' ')}</p>
          </div>
        ))}
        {!items.length && <p className="text-stone-400">{empty}</p>}
      </div>
      <Link to={to} className="mt-4 inline-block font-semibold text-brand-700">Browse services</Link>
    </div>
  );
}
