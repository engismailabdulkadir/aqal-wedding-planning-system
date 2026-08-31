import { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiEdit3 } from 'react-icons/fi';
import { Link, useNavigate, useParams } from 'react-router-dom';
import FormModal, { fieldClass } from '../../components/common/FormModal.jsx';
import MarketplaceListingsPanel from '../../components/customer/MarketplaceListingsPanel.jsx';
import { LoadingState, PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getWeddingManagement, updateWedding } from '../../services/weddingService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError, parseApiError } from '../../utils/apiError.js';
import { SERVICE_LABELS } from '../../utils/media.js';
import { formatBudget, formatSlot, formatWeddingDate } from '../../utils/weddingFormat.js';

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function todayInputValue() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export default function BookingCenterPage() {
  const { weddingId } = useParams();
  const navigate = useNavigate();
  const { selectWedding, refreshWeddings, activeWeddingId } = useActiveWedding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [nextDate, setNextDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      selectWedding(weddingId);
      const management = await getWeddingManagement(weddingId);
      setData(management);
      setError('');
      setNextDate(toDateInput(management.wedding?.weddingDate));
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!weddingId) return;
    load();
  }, [weddingId]);

  useEffect(() => {
    if (weddingId && activeWeddingId !== weddingId) selectWedding(weddingId);
  }, [weddingId, activeWeddingId, selectWedding]);

  const wedding = data?.wedding;
  const budget = data?.budget || {};
  const hallBooking = data?.hall?.current || (Array.isArray(data?.bookings?.hall) ? data.bookings.hall[0] : data?.bookings?.hall) || null;
  const orders = data?.bookings?.orders || [];
  const vendorBookings = data?.bookings?.vendors || [];
  const selections = data?.selections || [];

  const activityRows = useMemo(() => {
    const rows = [];
    if (hallBooking) {
      rows.push({
        id: `hall-${hallBooking._id}`,
        service: hallBooking.hall?.hallName || 'Wedding Hall',
        vendor: hallBooking.venue?.name || 'Venue',
        date: hallBooking.eventDate || wedding?.weddingDate,
        time: formatSlot(hallBooking.slotType || hallBooking.selectedSlot),
        price: hallBooking.price ?? hallBooking.totalAmount,
        bookingStatus: hallBooking.status,
        paymentStatus: hallBooking.paymentStatus || '—',
      });
    }
    selections.forEach((selection) => {
      rows.push({
        id: `sel-${selection._id}`,
        service: selection.listing?.name || SERVICE_LABELS[selection.category] || 'Selection',
        vendor: selection.listing?.vendorProfile?.businessName
          || `${selection.vendor?.firstName || ''} ${selection.vendor?.lastName || ''}`.trim()
          || 'Vendor',
        date: selection.serviceDate || selection.rentalStart || wedding?.weddingDate,
        time: selection.timeSlot || selection.availabilityType || '—',
        price: selection.quotedPrice ?? selection.listing?.price,
        bookingStatus: selection.status,
        paymentStatus: selection.paymentStatus || '—',
      });
    });
    orders.forEach((order) => {
      if (rows.some((row) => String(row.id).includes(String(order.selection || '')))) return;
      rows.push({
        id: `order-${order._id}`,
        service: order.service?.name || order.title || order.category || 'Order',
        vendor: `${order.vendor?.firstName || ''} ${order.vendor?.lastName || ''}`.trim() || 'Vendor',
        date: order.serviceDate || wedding?.weddingDate,
        time: order.slotType || '—',
        price: order.totalAmount ?? order.amount,
        bookingStatus: order.status,
        paymentStatus: order.paymentStatus || '—',
      });
    });
    vendorBookings.forEach((booking) => {
      rows.push({
        id: `legacy-${booking._id}`,
        service: booking.serviceName || 'Service',
        vendor: booking.vendorName || 'Vendor',
        date: booking.eventDate,
        time: booking.timeSlot || '—',
        price: booking.amount,
        bookingStatus: booking.status,
        paymentStatus: booking.paymentStatus || '—',
      });
    });
    return rows;
  }, [hallBooking, selections, orders, vendorBookings, wedding]);

  async function saveWeddingDate() {
    if (savingDate) return;
    setDateError('');
    if (!nextDate) {
      setDateError('Wedding date is required');
      return;
    }
    if (nextDate < todayInputValue()) {
      setDateError('Wedding date cannot be in the past');
      return;
    }
    setSavingDate(true);
    try {
      let result;
      try {
        result = await updateWedding(weddingId, { weddingDate: nextDate });
      } catch (requestError) {
        const parsed = parseApiError(requestError);
        if (parsed.code === 'DATE_RESCHEDULE_REQUIRED') {
          const confirmed = await confirmAction({
            title: 'Reschedule hall booking?',
            text: 'Changing the wedding date will move your hall reservation to the new date. Continue?',
            confirmButtonText: 'Update & Reschedule',
          });
          if (!confirmed) return;
          result = await updateWedding(weddingId, { weddingDate: nextDate, confirmReschedule: true });
        } else {
          throw requestError;
        }
      }
      await refreshWeddings(weddingId);
      setDateOpen(false);
      await showSuccess(
        'Wedding Date Updated',
        result.warnings?.length
          ? 'Date updated. Please review any date-dependent bookings.'
          : 'Your wedding profile date was updated.',
      );
      await load();
    } catch (requestError) {
      setDateError(getApiError(requestError));
      await showApiError(requestError, 'Unable to update wedding date');
    } finally {
      setSavingDate(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error || !wedding) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader eyebrow="Booking Center" title="Booking Center" description="Select everything for your wedding in one place." />
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Unable to open Booking Center</p>
          <p className="mt-1 text-sm">{error || 'Wedding not found.'}</p>
          <button type="button" onClick={() => navigate('/weddings')} className="mt-4 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">
            Back to My Weddings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Booking Center"
        title={wedding.weddingName}
        description="Select venues, bride and groom services, and wedding-day vendors for this celebration."
        action={(
          <Link to={`/weddings/${wedding._id}/edit`} className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50">
            <FiEdit3 /> Edit Wedding
          </Link>
        )}
      />

      <section className="mt-6 rounded-3xl border border-brand-100 bg-brand-50/60 p-6 shadow-sm dark:border-brand-900/40 dark:bg-brand-950/20">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700 dark:text-brand-300">Booking for</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">{wedding.weddingName}</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Date</p>
            <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">{formatWeddingDate(wedding.weddingDate)}</p>
            <button type="button" onClick={() => { setNextDate(toDateInput(wedding.weddingDate)); setDateOpen(true); }} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
              <FiCalendar /> Change Wedding Date
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Guests</p>
            <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">{wedding.expectedGuests}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Budget</p>
            <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">{formatBudget(wedding.estimatedBudget)}</p>
            <p className="mt-1 text-xs text-stone-500">Remaining {formatBudget(budget.remainingBudget ?? (wedding.estimatedBudget - (budget.totalPlannedCost || 0)))}</p>
          </div>
        </div>
      </section>

      <MarketplaceListingsPanel
        className="mt-10"
        title="Browse Vendor Listings"
        description="Real listings from vendors. Filter by category or search — no demo cards."
        inWorkspace
        weddingId={wedding._id}
        weddingDate={wedding.weddingDate}
        onBookingComplete={load}
      />

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">My Bookings</h2>
            <p className="mt-1 text-sm text-stone-500">Reservations and committed services for this wedding.</p>
          </div>
          <Link to="/selections" className="text-sm font-semibold text-brand-700">View selections</Link>
        </div>
        {activityRows.length ? (
          <div className="overflow-x-auto rounded-3xl border border-stone-100 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-900">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-wide text-stone-500 dark:bg-stone-800">
                <tr>
                  <th className="px-4 py-3 font-semibold">Service</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time / Slot</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Booking</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                </tr>
              </thead>
              <tbody>
                {activityRows.map((row) => (
                  <tr key={row.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-4 py-3 font-medium text-stone-800 dark:text-stone-100">{row.service}</td>
                    <td className="px-4 py-3 text-stone-600">{row.vendor}</td>
                    <td className="px-4 py-3 text-stone-600">{formatWeddingDate(row.date)}</td>
                    <td className="px-4 py-3 capitalize text-stone-600">{row.time}</td>
                    <td className="px-4 py-3 text-stone-800">{formatBudget(row.price)}</td>
                    <td className="px-4 py-3 capitalize text-stone-600">{row.bookingStatus}</td>
                    <td className="px-4 py-3 capitalize text-stone-600">{row.paymentStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-8 text-center dark:border-stone-700 dark:bg-stone-900">
            <FiCheckCircle className="mx-auto text-2xl text-brand-600" />
            <p className="mt-3 font-semibold text-stone-800 dark:text-stone-100">No bookings yet</p>
            <p className="mt-1 text-sm text-stone-500">Start with a hall, then add bride, groom, and wedding services.</p>
          </div>
        )}
      </section>

      <FormModal
        isOpen={dateOpen}
        onClose={() => setDateOpen(false)}
        title="Change Wedding Date"
        subtitle="This updates the wedding profile. Hall and wedding-day services should be re-checked."
        size="sm"
        loading={savingDate}
        dirty={nextDate !== toDateInput(wedding.weddingDate)}
        error={dateError}
        onSubmit={saveWeddingDate}
        submitLabel="Update Date"
      >
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Wedding Date *
          <input
            type="date"
            min={todayInputValue()}
            value={nextDate}
            onChange={(event) => setNextDate(event.target.value)}
            className={fieldClass}
          />
        </label>
      </FormModal>
    </div>
  );
}
