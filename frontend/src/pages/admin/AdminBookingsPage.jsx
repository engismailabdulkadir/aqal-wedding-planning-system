/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiRefreshCw, FiSearch } from 'react-icons/fi';
import { ActionMenu, ViewModal } from '../../components/common/index.js';
import {
  cancelAdminBooking,
  getAdminBooking,
  getAdminBookings,
  getAdminVendors,
  getAdminWeddings,
  updateAdminBookingStatus,
} from '../../services/roleService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget } from '../../utils/weddingFormat.js';

const BOOKING_TYPES = [
  { value: '', label: 'All types' },
  { value: 'hall', label: 'Hall' },
  { value: 'salon', label: 'Salon' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'photography', label: 'Photography' },
  { value: 'videography', label: 'Videography' },
  { value: 'transport', label: 'Transport' },
  { value: 'dress_rental', label: 'Dress rental' },
  { value: 'suit_rental', label: 'Suit rental' },
  { value: 'service', label: 'Service' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'held', label: 'Held' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'expired', label: 'Expired' },
  { value: 'rejected', label: 'Rejected' },
];

const PAYMENT_OPTIONS = [
  { value: '', label: 'All payment statuses' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'partially_paid', label: 'Partially paid' },
  { value: 'paid', label: 'Paid' },
  { value: 'refunded', label: 'Refunded' },
];

const QUICK_FILTERS = [
  { value: '', label: 'All' },
  { value: 'today', label: 'Today' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'unpaid', label: 'Unpaid' },
];

const emptyFilters = {
  search: '',
  type: '',
  status: '',
  paymentStatus: '',
  vendor: '',
  wedding: '',
  dateFrom: '',
  dateTo: '',
  quick: '',
};

function statusClass(status) {
  const map = {
    confirmed: 'bg-emerald-50 text-emerald-700',
    held: 'bg-amber-50 text-amber-800',
    pending: 'bg-sky-50 text-sky-700',
    in_progress: 'bg-indigo-50 text-indigo-700',
    completed: 'bg-stone-100 text-stone-700',
    cancelled: 'bg-red-50 text-red-700',
    expired: 'bg-red-50 text-red-700',
    rejected: 'bg-red-50 text-red-700',
  };
  return map[status] || 'bg-stone-50 text-stone-600';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function labelize(value) {
  return String(value || '—').replaceAll('_', ' ');
}

export default function AdminBookingsPage() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);
  const [vendors, setVendors] = useState([]);
  const [weddings, setWeddings] = useState([]);
  const [acting, setActing] = useState(false);

  const load = () => {
    setLoading(true);
    getAdminBookings({ ...filters, page, limit: 20 })
      .then(setData)
      .catch((e) => setError(getApiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getAdminVendors().then((r) => setVendors(r.vendors || r.users || [])).catch(() => {});
    getAdminWeddings().then((r) => setWeddings(r.weddings || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [filters, page]);

  function setFilter(key, value) {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(emptyFilters);
  }

  async function openDetails(booking) {
    try {
      const payload = await getAdminBooking(booking.id);
      setDetail(payload);
    } catch (err) {
      await showApiError(err, 'Unable to load booking');
    }
  }

  async function runStatusAction(booking, status, title, text) {
    const confirmed = await confirmAction({
      title,
      text,
      confirmButtonText: status === 'cancelled' ? 'Cancel Booking' : 'Confirm',
      cancelButtonText: status === 'cancelled' ? 'Keep Booking' : 'Back',
      danger: status === 'cancelled',
    });
    if (!confirmed) return;
    setActing(true);
    try {
      if (status === 'cancelled') await cancelAdminBooking(booking.id);
      else await updateAdminBookingStatus(booking.id, status);
      await showSuccess('Booking updated', `Booking marked as ${labelize(status)}.`);
      if (detail?.booking?.id === booking.id) {
        const refreshed = await getAdminBooking(booking.id);
        setDetail(refreshed);
      }
      load();
    } catch (err) {
      await showApiError(err, 'Unable to update booking');
    } finally {
      setActing(false);
    }
  }

  function actionItems(booking) {
    const items = [{ label: 'View Details', onClick: () => openDetails(booking) }];
    if (booking.actions?.includes('confirm')) {
      items.push({
        label: 'Confirm',
        onClick: () => runStatusAction(
          booking,
          'confirmed',
          'Confirm this booking?',
          `${booking.serviceName} for ${booking.customerName} on ${formatDate(booking.date || booking.startDateTime)}`,
        ),
      });
    }
    if (booking.actions?.includes('in_progress')) {
      items.push({
        label: 'Mark In Progress',
        onClick: () => runStatusAction(booking, 'in_progress', 'Mark booking in progress?', booking.serviceName),
      });
    }
    if (booking.actions?.includes('complete')) {
      items.push({
        label: 'Mark Completed',
        onClick: () => runStatusAction(booking, 'completed', 'Mark booking completed?', booking.serviceName),
      });
    }
    if (booking.actions?.includes('cancel')) {
      items.push({
        label: 'Cancel',
        tone: 'danger',
        onClick: () => runStatusAction(
          booking,
          'cancelled',
          'Cancel this booking?',
          `Customer: ${booking.customerName}\nWedding: ${booking.weddingName || '—'}\nService: ${booking.serviceName}\nDate: ${formatDate(booking.date || booking.startDateTime)}\n\nThis will release the reservation if applicable. Payment history will be preserved.`,
        ),
      });
    }
    return items;
  }

  const stats = data?.stats || {};
  const bookings = data?.bookings || [];
  const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'search' ? Boolean(value) : Boolean(value.trim()));

  return (
    <div className="mx-auto max-w-[1600px]">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-semibold text-brand-600">Booking Management</p>
          <h1 className="font-display text-4xl font-semibold">Bookings</h1>
          <p className="mt-2 text-stone-500">System-wide hall, appointment, rental and service reservations.</p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold text-stone-700">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ['Total', stats.total],
          ['Pending', stats.pending],
          ['Held', stats.held],
          ['Confirmed', stats.confirmed],
          ['Upcoming', stats.upcoming],
          ['In Progress', stats.inProgress],
          ['Completed', stats.completed],
          ['Cancelled', stats.cancelled],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-stone-900">{value ?? 0}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ['Total Booking Value', formatBudget(stats.totalValue)],
          ['Total Paid', formatBudget(stats.totalPaid)],
          ['Total Due', formatBudget(stats.totalDue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
            <p className="mt-2 text-xl font-semibold text-stone-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {QUICK_FILTERS.map((item) => (
            <button
              key={item.value || 'all'}
              type="button"
              onClick={() => setFilter('quick', item.value)}
              className={`rounded-full px-3 py-1.5 text-sm ${filters.quick === item.value ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 lg:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
          <label className="relative block">
            <FiSearch className="absolute left-3 top-3.5 text-stone-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Search reference, customer, wedding, vendor, hall…"
              className="w-full rounded-xl border py-3 pl-10 pr-3 text-sm"
            />
          </label>
          <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} className="rounded-xl border px-3 text-sm">
            {BOOKING_TYPES.map((item) => <option key={item.value || 'all-types'} value={item.value}>{item.label}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className="rounded-xl border px-3 text-sm">
            {STATUS_OPTIONS.map((item) => <option key={item.value || 'all-status'} value={item.value}>{item.label}</option>)}
          </select>
          <select value={filters.paymentStatus} onChange={(e) => setFilter('paymentStatus', e.target.value)} className="rounded-xl border px-3 text-sm">
            {PAYMENT_OPTIONS.map((item) => <option key={item.value || 'all-pay'} value={item.value}>{item.label}</option>)}
          </select>
          <select value={filters.vendor} onChange={(e) => setFilter('vendor', e.target.value)} className="rounded-xl border px-3 text-sm">
            <option value="">All vendors</option>
            {vendors.map((vendor) => (
              <option key={vendor.user?._id || vendor._id} value={vendor.user?._id || vendor._id}>
                {vendor.businessName || `${vendor.user?.firstName || ''} ${vendor.user?.lastName || ''}`.trim()}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select value={filters.wedding} onChange={(e) => setFilter('wedding', e.target.value)} className="rounded-xl border px-3 py-3 text-sm">
            <option value="">All weddings</option>
            {weddings.map((wedding) => (
              <option key={wedding._id} value={wedding._id}>{wedding.weddingName}</option>
            ))}
          </select>
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className="rounded-xl border px-3 py-3 text-sm" />
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className="rounded-xl border px-3 py-3 text-sm" />
          <button type="button" onClick={clearFilters} className="rounded-xl border px-3 py-3 text-sm font-semibold text-stone-700">
            Clear Filters
          </button>
        </div>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}

      <div className="mt-5 hidden overflow-x-auto rounded-2xl bg-white shadow-sm lg:block">
        <table className="w-full min-w-[1200px] text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              {['Reference', 'Service / Hall', 'Type', 'Customer', 'Wedding', 'Vendor', 'Date', 'Time / Slot', 'Total', 'Paid', 'Due', 'Payment', 'Status', 'Created', 'Actions'].map((heading) => (
                <th key={heading} className="px-4 py-4 font-semibold text-stone-600">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-4 py-4 font-mono text-xs">{booking.reference}</td>
                <td className="px-4 py-4 font-semibold">
                  {booking.serviceName}
                  {booking.venueName ? <span className="mt-1 block text-xs font-normal text-stone-500">{booking.venueName}</span> : null}
                </td>
                <td className="px-4 py-4 capitalize">{labelize(booking.bookingType)}</td>
                <td className="px-4 py-4">{booking.customerName}</td>
                <td className="px-4 py-4">{booking.weddingName || '—'}</td>
                <td className="px-4 py-4">{booking.vendorName}</td>
                <td className="px-4 py-4">{formatDate(booking.date || booking.startDateTime)}</td>
                <td className="px-4 py-4 capitalize">{booking.slotLabel || '—'}</td>
                <td className="px-4 py-4">{formatBudget(booking.totalAmount)}</td>
                <td className="px-4 py-4">{formatBudget(booking.amountPaid)}</td>
                <td className="px-4 py-4">{formatBudget(booking.amountDue)}</td>
                <td className="px-4 py-4 capitalize">{labelize(booking.paymentStatus)}</td>
                <td className="px-4 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(booking.status)}`}>
                    {labelize(booking.status)}
                  </span>
                  {booking.status === 'held' && booking.holdRemainingMinutes != null ? (
                    <span className="mt-1 block text-xs text-amber-700">{booking.holdRemainingMinutes} min left</span>
                  ) : null}
                </td>
                <td className="px-4 py-4">{formatDate(booking.createdAt)}</td>
                <td className="px-4 py-4 text-right">
                  <ActionMenu items={actionItems(booking)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 grid gap-4 lg:hidden">
        {bookings.map((booking) => (
          <article key={booking.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-xs text-stone-400">{booking.reference}</p>
                <h2 className="mt-1 text-lg font-semibold">{booking.serviceName}</h2>
                <p className="text-sm text-stone-500 capitalize">{labelize(booking.bookingType)}</p>
              </div>
              <ActionMenu items={actionItems(booking)} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-stone-400">Customer</dt><dd>{booking.customerName}</dd></div>
              <div><dt className="text-stone-400">Wedding</dt><dd>{booking.weddingName || '—'}</dd></div>
              <div><dt className="text-stone-400">Vendor</dt><dd>{booking.vendorName}</dd></div>
              <div><dt className="text-stone-400">Date</dt><dd>{formatDate(booking.date || booking.startDateTime)}</dd></div>
              <div><dt className="text-stone-400">Total</dt><dd>{formatBudget(booking.totalAmount)}</dd></div>
              <div><dt className="text-stone-400">Due</dt><dd>{formatBudget(booking.amountDue)}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(booking.status)}`}>{labelize(booking.status)}</span>
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold capitalize text-stone-700">{labelize(booking.paymentStatus)}</span>
            </div>
          </article>
        ))}
      </div>

      {!loading && !bookings.length ? (
        <div className="mt-5 rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-stone-800">
            {hasActiveFilters ? 'No bookings match your filters.' : 'No bookings found'}
          </p>
          <p className="mt-2 text-stone-500">
            {hasActiveFilters
              ? 'Try adjusting search or filters.'
              : 'Customer hall and service reservations will appear here once bookings are created.'}
          </p>
          <div className="mt-5 flex justify-center gap-3">
            {hasActiveFilters ? (
              <button type="button" onClick={clearFilters} className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
                Clear Filters
              </button>
            ) : (
              <Link to="/admin/weddings" className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">
                View Weddings
              </Link>
            )}
          </div>
        </div>
      ) : null}

      {data?.pages > 1 ? (
        <div className="mt-5 flex items-center justify-between">
          <p className="text-sm text-stone-500">Page {data.page} of {data.pages} · {data.total} bookings</p>
          <div className="flex gap-2">
            <button type="button" disabled={page <= 1 || acting} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Previous</button>
            <button type="button" disabled={page >= data.pages || acting} onClick={() => setPage((p) => p + 1)} className="rounded-full border px-4 py-2 text-sm disabled:opacity-40">Next</button>
          </div>
        </div>
      ) : null}

      <ViewModal
        isOpen={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detail?.booking?.serviceName || 'Booking details'}
        subtitle={detail?.booking?.reference}
        size="lg"
      >
        {detail?.booking ? (
          <div className="space-y-5">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              {[
                ['Booking Reference', detail.booking.reference],
                ['Booking Type', labelize(detail.booking.bookingType)],
                ['Customer', detail.booking.customerName],
                ['Customer Phone', detail.booking.customerPhone || '—'],
                ['Wedding', detail.booking.weddingName || '—'],
                ['Vendor', detail.booking.vendorName],
                ['Venue', detail.booking.venueName || '—'],
                ['Hall', detail.booking.hallName || '—'],
                ['Date', formatDate(detail.booking.date || detail.booking.startDateTime)],
                ['Start', formatDateTime(detail.booking.startDateTime)],
                ['End', formatDateTime(detail.booking.endDateTime)],
                ['Slot / Time', labelize(detail.booking.slotLabel || detail.booking.slotType)],
                ['Guest Count', detail.booking.guestCount ?? '—'],
                ['Hall Capacity', detail.booking.hallCapacity ?? '—'],
                ['Total Price', formatBudget(detail.booking.totalAmount)],
                ['Required Deposit', formatBudget(detail.booking.depositRequired)],
                ['Amount Paid', formatBudget(detail.booking.amountPaid)],
                ['Amount Due', formatBudget(detail.booking.amountDue)],
                ['Payment Status', labelize(detail.booking.paymentStatus)],
                ['Booking Status', labelize(detail.booking.status)],
                ['Created', formatDateTime(detail.booking.createdAt)],
                ['Notes', detail.booking.notes || '—'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-stone-50 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt>
                  <dd className="mt-1 font-medium capitalize text-stone-800">{value}</dd>
                </div>
              ))}
            </dl>

            {detail.history?.length ? (
              <div>
                <h3 className="text-sm font-semibold text-stone-800">Booking history</h3>
                <ul className="mt-3 space-y-2">
                  {detail.history.map((item) => (
                    <li key={item._id} className="rounded-xl border border-stone-100 px-4 py-3 text-sm">
                      <p className="font-medium text-stone-800">{labelize(item.action)}</p>
                      <p className="text-stone-500">
                        {item.oldStatus ? `${labelize(item.oldStatus)} → ` : ''}
                        {labelize(item.newStatus)}
                        {' · '}
                        {formatDateTime(item.timestamp)}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              {actionItems(detail.booking)
                .filter((item) => item.label !== 'View Details')
                .map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    disabled={acting}
                    onClick={item.onClick}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${item.tone === 'danger' ? 'bg-red-600 text-white' : 'bg-brand-600 text-white'} disabled:opacity-50`}
                  >
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        ) : null}
      </ViewModal>
    </div>
  );
}
