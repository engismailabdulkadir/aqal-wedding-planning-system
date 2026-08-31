import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SubmitHallQuoteModal from '../../components/hall/SubmitHallQuoteModal.jsx';
import { PageHeader, StatusBadge } from '../../components/ui/index.js';
import { acceptHallQuote, listHallQuotes, rejectHallQuote, submitHallQuote } from '../../services/venueService.js';
import { useAuth } from '../../hooks/useAuth.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget, formatWeddingDate } from '../../utils/weddingFormat.js';

function roleFilter(role) {
  if (role === 'customer') return {};
  return {};
}

export default function HallQuotesPage({ mode = 'auto' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const viewMode = mode === 'auto' ? user?.role : mode;
  const [quotes, setQuotes] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeQuote, setActiveQuote] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    listHallQuotes(roleFilter(viewMode))
      .then((data) => setQuotes(data.quotes || []))
      .catch((err) => setError(getApiError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [viewMode]);

  async function handleSubmitQuote(payload) {
    if (!activeQuote) return;
    setSaving(true);
    setFormError('');
    try {
      await submitHallQuote(activeQuote._id, payload);
      setActiveQuote(null);
      await showSuccess('Quote Sent', 'The customer has been notified.');
      load();
    } catch (err) {
      setFormError(getApiError(err));
      await showApiError(err, 'Unable to send quote');
    } finally {
      setSaving(false);
    }
  }

  async function handleAccept(quote) {
    const confirmed = await confirmAction({
      title: 'Accept this hall quote?',
      text: `Total ${formatBudget(quote.totalPrice)}. Deposit ${formatBudget(quote.requiredDeposit)}.`,
      confirmButtonText: 'Accept Quote',
    });
    if (!confirmed) return;
    try {
      const result = await acceptHallQuote(quote._id);
      await showSuccess('Quote Accepted', 'Continue to payment to confirm your hall booking.');
      navigate(`/payments?booking=${result.booking._id}`);
    } catch (err) {
      await showApiError(err, 'Unable to accept quote');
      load();
    }
  }

  async function handleReject(quote) {
    const confirmed = await confirmAction({
      title: 'Reject this quote?',
      text: 'You can request another quote later.',
      confirmButtonText: 'Reject Quote',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await rejectHallQuote(quote._id);
      await showSuccess('Quote Rejected');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to reject quote');
    }
  }

  const title = viewMode === 'customer' ? 'Hall Quotes' : viewMode === 'admin' ? 'Hall Quote Requests' : 'Hall Quote Requests';

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow="Hall Booking"
        title={title}
        description={viewMode === 'customer'
          ? 'Review venue quotes, accept to reserve, then pay deposit or full amount.'
          : 'Review customer hall requests and send professional total + deposit quotes.'}
      />

      {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {loading ? <p className="mt-8 text-sm text-app-muted">Loading quotes…</p> : null}

      <div className="mt-7 space-y-4">
        {!loading && !quotes.length ? (
          <div className="rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
            No hall quote requests yet.
          </div>
        ) : null}

        {quotes.map((quote) => {
          const remaining = Math.max(0, Number(quote.totalPrice || 0) - Number(quote.requiredDeposit || 0));
          return (
            <article key={quote._id} className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-app-text">{quote.hall?.hallName || 'Hall'}</h2>
                  <p className="mt-1 text-sm text-app-muted">{quote.venue?.name}</p>
                </div>
                <StatusBadge value={quote.status} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Wedding</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{quote.wedding?.weddingName || '—'}</p>
                  <p className="mt-0.5 text-xs text-app-muted">
                    {[quote.wedding?.partner1Name, quote.wedding?.partner2Name].filter(Boolean).join(' & ') || '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Date / Slot</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{formatWeddingDate(quote.bookingDate)} · {quote.slotType}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Guests</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{quote.guestCount}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Customer</p>
                  <p className="mt-1 text-sm font-semibold text-app-text">{quote.customer?.firstName} {quote.customer?.lastName}</p>
                  <p className="mt-0.5 text-xs text-app-muted">Requested {formatWeddingDate(quote.createdAt)}</p>
                </div>
              </div>

              {quote.status === 'quoted' && viewMode === 'customer' ? (
                <p className="mt-4 text-sm font-bold uppercase tracking-wide text-brand-700">Quote Received</p>
              ) : null}
              {quote.status === 'quoted' || quote.status === 'accepted' ? (
                <div className="mt-5 grid gap-3 rounded-2xl border border-app-border bg-app-inset p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Total Price</p>
                    <p className="mt-1 text-lg font-semibold text-app-text">{formatBudget(quote.totalPrice)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Required Deposit</p>
                    <p className="mt-1 text-lg font-semibold text-app-text">{formatBudget(quote.requiredDeposit)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-app-muted">Remaining After Deposit</p>
                    <p className="mt-1 text-lg font-semibold text-app-text">{formatBudget(remaining)}</p>
                  </div>
                  {quote.notes ? <p className="sm:col-span-3 text-sm text-app-muted">{quote.notes}</p> : null}
                </div>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-3">
                {['vendor', 'admin'].includes(viewMode) && ['pending', 'quoted'].includes(quote.status) ? (
                  <button
                    type="button"
                    onClick={() => { setFormError(''); setActiveQuote(quote); }}
                    className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                  >
                    {quote.status === 'quoted' ? 'Update Quote' : 'Prepare Quote'}
                  </button>
                ) : null}

                {viewMode === 'customer' && quote.status === 'quoted' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleAccept(quote)}
                      className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
                    >
                      Accept Quote
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReject(quote)}
                      className="rounded-full border border-app-border px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                    >
                      Reject Quote
                    </button>
                  </>
                ) : null}

                {viewMode === 'customer' && quote.status === 'accepted' && quote.hallBooking?._id ? (
                  <button
                    type="button"
                    onClick={() => navigate(`/payments?booking=${quote.hallBooking._id || quote.hallBooking}`)}
                    className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Continue to Payment
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <SubmitHallQuoteModal
        key={activeQuote?._id || 'closed'}
        isOpen={Boolean(activeQuote)}
        quote={activeQuote}
        loading={saving}
        error={formError}
        onClose={() => { if (!saving) setActiveQuote(null); }}
        onSubmit={handleSubmitQuote}
      />
    </div>
  );
}
