import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ValidationRecoveryPanel from '../../components/validation/ValidationRecoveryPanel.jsx';
import WeddingForm from '../../components/wedding/WeddingForm.jsx';
import ChangeSummary from '../../components/wedding/management/ChangeSummary.jsx';
import HallChangePanel from '../../components/wedding/management/HallChangePanel.jsx';
import SelectionManager from '../../components/wedding/management/SelectionManager.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { updateSelection } from '../../services/planningService.js';
import { getWeddingManagement, updateWedding } from '../../services/weddingService.js';
import { getApiError, parseApiError } from '../../utils/apiError.js';
import { parseReturnTo } from '../../utils/returnTo.js';
import { formatBudget, formatSlot, formatWeddingDate } from '../../utils/weddingFormat.js';

const TABS = [
  { id: 'basic', label: 'Basic Details' },
  { id: 'venue', label: 'Venue & Hall' },
  { id: 'datetime', label: 'Date & Time' },
  { id: 'bride', label: 'Bride' },
  { id: 'groom', label: 'Groom' },
  { id: 'services', label: 'Wedding Services' },
  { id: 'planner', label: 'Planner' },
  { id: 'guests', label: 'Guests' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'invitations', label: 'Invitations' },
  { id: 'budget', label: 'Budget' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'payments', label: 'Payments' },
];

export default function EditWeddingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeWeddingId, refreshWeddings } = useActiveWedding();
  const weddingId = id || activeWeddingId;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [warnings, setWarnings] = useState([]);
  const [recovery, setRecovery] = useState(null);
  const [datePreview, setDatePreview] = useState(null);
  const [removingId, setRemovingId] = useState('');

  const returnTo = parseReturnTo(searchParams.get('returnTo') || location.state?.returnTo);
  const returnState = location.state?.returnState || null;
  const focusFields = (searchParams.get('focus') || '').split(',').filter(Boolean);
  const tab = TABS.some((item) => item.id === searchParams.get('tab')) ? searchParams.get('tab') : (focusFields.includes('expectedGuests') || focusFields.includes('estimatedBudget') ? 'basic' : 'basic');

  function setTab(next) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('tab', next);
    setSearchParams(nextParams, { replace: true });
  }

  async function loadManagement() {
    if (!weddingId) {
      setLoading(false);
      return;
    }
    const snapshot = await getWeddingManagement(weddingId);
    setData(snapshot);
  }

  useEffect(() => {
    if (!weddingId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    loadManagement()
      .catch((e) => setError(getApiError(e)))
      .finally(() => setLoading(false));
  }, [weddingId]);

  async function afterSuccess(message, extraWarnings = []) {
    setNotice(message);
    setWarnings(extraWarnings);
    setRecovery(null);
    setDatePreview(null);
    await refreshWeddings(weddingId);
    await loadManagement();
    if (returnTo) {
      navigate(returnTo, {
        replace: true,
        state: {
          message,
          warnings: extraWarnings,
          revalidateHall: Boolean(returnTo),
          date: returnState?.date,
          selected: returnState?.selected,
          venue: returnState?.venue,
          step: returnState?.step,
        },
      });
    }
  }

  async function submitBasic(values) {
    setSubmitting(true);
    setError('');
    setRecovery(null);
    try {
      const payload = datePreview ? { ...values, confirmReschedule: true } : values;
      const result = await updateWedding(weddingId, payload);
      await afterSuccess(result.message || 'Wedding details updated successfully.', result.warnings || []);
    } catch (e) {
      const parsed = parseApiError(e);
      if (parsed.code === 'DATE_RESCHEDULE_REQUIRED') {
        setDatePreview(parsed.details?.preview || parsed.details);
        setError('');
      } else if (parsed.code) {
        setRecovery(parsed);
      } else {
        setError(parsed.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function removeSelection(item) {
    setRemovingId(item._id);
    setError('');
    try {
      await updateSelection(item._id, { status: 'cancelled' });
      await afterSuccess('Selection cancelled. Payment history was preserved.');
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setRemovingId('');
    }
  }

  if (loading) return <div className="grid min-h-[50vh] place-items-center">Loading wedding…</div>;
  const wedding = data?.wedding;
  if (!wedding) return <div className="rounded-xl bg-red-50 p-5 text-red-700">{error || 'Select a wedding to edit.'}</div>;

  const hall = data.hall?.current;
  const budgetWarning = warnings.find((item) => item.code === 'BUDGET_NOW_INSUFFICIENT');

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-7">
        <p className="text-sm font-medium text-brand-600">Wedding Management</p>
        <h1 className="mt-1 font-display text-4xl font-semibold">Edit {wedding.weddingName}</h1>
        <p className="mt-2 text-stone-500">
          {wedding.partner1Name} & {wedding.partner2Name}
          {wedding.city ? ` · ${wedding.city}` : ''}
          {` · ${formatWeddingDate(wedding.weddingDate)}`}
        </p>
        {returnTo && <p className="mt-2 text-sm text-stone-500">After saving, you will return to continue your booking.</p>}
      </div>

      {notice && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {warnings.filter((item) => item.code !== 'BUDGET_NOW_INSUFFICIENT').map((item) => (
        <p key={item.code + item.message} className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{item.message}</p>
      ))}
      {budgetWarning && (
        <div className="mb-4">
          <ValidationRecoveryPanel
            error={budgetWarning}
            onUpdateBudget={() => setTab('budget')}
            onDismiss={() => setWarnings((list) => list.filter((item) => item.code !== 'BUDGET_NOW_INSUFFICIENT'))}
          />
        </div>
      )}
      {recovery && (
        <div className="mb-4">
          <ValidationRecoveryPanel
            error={recovery}
            onChooseAnotherHall={() => { setRecovery(null); setTab('venue'); }}
            onUpdateGuestCount={() => { setRecovery(null); setTab('basic'); }}
            onUpdateBudget={() => { setRecovery(null); setTab('basic'); }}
            onKeepCurrentDate={() => setRecovery(null)}
            onDismiss={() => setRecovery(null)}
          />
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${tab === item.id ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 shadow-sm'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-sm sm:p-9">
        {tab === 'basic' && (
          <>
            {datePreview && (
              <div className="mb-6">
                <ChangeSummary
                  summary={datePreview}
                  confirming={submitting}
                  onCancel={() => setDatePreview(null)}
                  onConfirm={() => submitBasic({
                    weddingName: wedding.weddingName,
                    partner1Name: wedding.partner1Name,
                    partner2Name: wedding.partner2Name,
                    weddingDate: datePreview.next?.date || wedding.weddingDate?.slice(0, 10),
                    city: wedding.city,
                    estimatedBudget: wedding.estimatedBudget,
                    expectedGuests: wedding.expectedGuests,
                    description: wedding.description,
                    venue: wedding.venue,
                  })}
                />
              </div>
            )}
            <WeddingForm
              key={`${wedding.updatedAt}-${wedding.expectedGuests}-${wedding.estimatedBudget}-${wedding.weddingDate}`}
              initialValues={{ ...wedding, weddingDate: wedding.weddingDate?.slice(0, 10) || '' }}
              onSubmit={submitBasic}
              submitting={submitting}
              submitLabel="Save Changes"
              error=""
              focusFields={focusFields}
              cancelTo={returnTo || '/dashboard'}
              hideIntro
            />
          </>
        )}

        {tab === 'venue' && (
          <HallChangePanel
            wedding={wedding}
            booking={hall}
            onChanged={afterSuccess}
            onChooseHallTab={() => setTab('basic')}
          />
        )}

        {tab === 'datetime' && (
          <HallChangePanel
            mode="datetime"
            wedding={wedding}
            booking={hall}
            onChanged={afterSuccess}
            onChooseHallTab={() => setTab('venue')}
          />
        )}

        {tab === 'bride' && (
          <SelectionManager
            items={data.bride}
            empty="No bride selections yet."
            browseTo="/services?category=bride_dress"
            onRemove={removeSelection}
            removingId={removingId}
          />
        )}

        {tab === 'groom' && (
          <SelectionManager
            items={data.groom}
            empty="No groom selections yet."
            browseTo="/services?category=groom_attire"
            onRemove={removeSelection}
            removingId={removingId}
          />
        )}

        {tab === 'services' && (
          <SelectionManager
            items={data.services}
            empty="No wedding services selected yet."
            browseTo="/services"
            onRemove={removeSelection}
            removingId={removingId}
          />
        )}

        {tab === 'planner' && (
          <div>
            {data.planner?.assigned ? (
              <>
                <p className="font-semibold">{data.planner.name}</p>
                <p className="mt-2 text-sm text-stone-500">{data.planner.email}{data.planner.phone ? ` · ${data.planner.phone}` : ''}</p>
                <p className="mt-2 text-sm capitalize text-stone-600">Status: {data.planner.status}</p>
              </>
            ) : (
              <p className="text-stone-600">{data.planner?.message}</p>
            )}
            <p className="mt-4 text-sm text-stone-500">Planner assignment is managed by an administrator.</p>
          </div>
        )}

        {tab === 'guests' && (
          <ModuleLink
            title={`${data.guests?.summary?.totalGuests || 0} of ${data.overview?.expectedGuests || data.wedding?.expectedGuests || 0} expected`}
            body={`${data.guests?.summary?.accepted || 0} accepted · ${data.guests?.summary?.expectedAttendees || 0} expected attendees.`}
            to="/guests"
            label="Manage guests"
          />
        )}

        {tab === 'tasks' && (
          <ModuleLink
            title={`${data.tasks?.summary?.completed || 0}/${data.tasks?.summary?.total || 0} tasks completed (${data.overview?.tasksPercentage || 0}%)`}
            body="Open the existing task workspace to add or update planning tasks."
            to="/tasks"
            label="Open tasks"
          />
        )}

        {tab === 'timeline' && (
          <ModuleLink
            title={`${data.timeline?.count || 0} timeline events`}
            body={data.timeline?.events?.length ? data.timeline.events.map((item) => `${item.title}: ${(item.displayStatus || item.status).replaceAll('_', ' ')}`).join(' · ') : 'Milestones stay in sync with hall bookings, selections, invitations, and payments.'}
            to="/timeline"
            label="Open timeline"
          />
        )}

        {tab === 'invitations' && (
          <ModuleLink
            title={`${data.invitations?.summary?.total || 0} invitations`}
            body={`${data.invitations?.summary?.sent || 0} sent. Design and send from the invitations workspace.`}
            to="/invitations"
            label="Open invitations"
          />
        )}

        {tab === 'budget' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Fact label="Total budget" value={formatBudget(data.budget?.totalBudget)} />
            <Fact label="Planned cost" value={formatBudget(data.budget?.totalPlannedCost)} />
            <Fact label="Total paid" value={formatBudget(data.budget?.totalPaid)} />
            <Fact label="Amount due" value={formatBudget(data.budget?.totalAmountDue)} />
            <Fact label="Remaining budget" value={formatBudget(data.budget?.remainingBudget)} />
            <Fact label="Over-budget" value={data.budget?.overBudget ? 'Yes' : 'No'} />
            {data.budget?.overBudget && (
              <p className="sm:col-span-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Your current wedding selections exceed the budget by {formatBudget(Math.abs(data.budget.remainingBudget))}. Bookings were not deleted.
              </p>
            )}
            <Link to="/budget" className="font-semibold text-brand-700">Open budget</Link>
          </div>
        )}

        {tab === 'bookings' && (
          <div className="space-y-4">
            {(data.bookings?.hall || []).map((item) => (
              <p key={item._id} className="rounded-xl border p-4 text-sm">
                {item.venue?.name} · {item.hall?.hallName} · {formatSlot(item.slotType)} · {formatWeddingDate(item.bookingDate)} · {item.status} · {item.paymentStatus} · {formatBudget(item.basePrice)}
              </p>
            ))}
            {(data.bookings?.orders || []).filter((order) => !order.booking).slice(0, 12).map((order) => (
              <p key={order._id} className="rounded-xl border p-4 text-sm">{order.itemName} · {formatBudget(order.amount)} · {order.status} · {order.paymentStatus}</p>
            ))}
            <Link to="/bookings" className="inline-block font-semibold text-brand-700">Open bookings</Link>
          </div>
        )}

        {tab === 'payments' && (
          <div className="space-y-3">
            <p className="text-sm text-stone-500">Paid {formatBudget(data.payments?.summary?.totalPaid)} · due {formatBudget(data.payments?.summary?.totalDue)}. Successful payments are never deleted from this history.</p>
            {(data.payments?.records || []).map((payment) => (
              <p key={payment._id} className="rounded-xl border p-4 text-sm">
                {formatBudget(payment.amount)} · {payment.paymentType} · {payment.status} · {payment.transactionReference}
              </p>
            ))}
            <Link to="/payments" className="inline-block font-semibold text-brand-700">Open payments</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 font-medium text-stone-900">{value}</p>
    </div>
  );
}

function ModuleLink({ title, body, to, label }) {
  return (
    <div>
      <p className="font-semibold text-stone-900">{title}</p>
      <p className="mt-2 text-sm text-stone-500">{body}</p>
      <Link to={to} className="mt-4 inline-block font-semibold text-brand-700">{label}</Link>
    </div>
  );
}
