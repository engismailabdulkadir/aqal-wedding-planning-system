/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { FiCalendar, FiCreditCard, FiEye, FiXCircle } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { payBooking } from '../../api/bookings.js';
import { ErrorState, LoadingState, PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { cancelBooking, getBookings } from '../../services/planningService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget, formatWeddingDate } from '../../utils/weddingFormat.js';

function formatTimeSlot(slot) {
  if (!slot) return '—';
  if (slot === 'full_day') return 'Full Day';
  if (slot === 'morning') return 'Morning';
  if (slot === 'evening') return 'Evening';
  return slot;
}

function formatBookedBy(booking) {
  const user = booking.bookedBy;
  if (!user) return '—';
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return name || user.username || '—';
}

export default function BookingsPage() {
  const { activeWeddingId } = useActiveWedding();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [payingId, setPayingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await getBookings(activeWeddingId));
      setError('');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (activeWeddingId) load(); }, [activeWeddingId]);

  const pay = async (id) => {
    const ok = await confirmAction({
      title: 'Pay booking invoice?',
      text: 'Payment will confirm this booking after successful verification.',
      confirmButtonText: 'Pay Now',
    });
    if (!ok) return;
    setPayingId(id);
    try {
      const result = await payBooking(id, { paymentMethod: 'test' });
      await showSuccess('Payment successful', result.message || 'Booking is now confirmed.');
      load();
    } catch (err) {
      await showApiError(err, 'Payment failed');
    } finally {
      setPayingId(null);
    }
  };

  const cancel = async (id) => {
    const confirmed = await confirmAction({
      title: 'Cancel this booking?',
      text: 'The vendor will be notified and the request will be cancelled.',
      confirmButtonText: 'Cancel Booking',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await cancelBooking(id);
      await showSuccess('Booking cancelled successfully.');
      load();
    } catch (err) {
      await showApiError(err, 'Unable to cancel booking');
    }
  };

  const statusClass = (status) => {
    if (status === 'confirmed' || status === 'completed') return 'bg-emerald-50 text-emerald-700';
    if (status === 'accepted') return 'bg-sky-50 text-sky-700';
    if (status === 'pending') return 'bg-amber-50 text-amber-700';
    if (status === 'rejected') return 'bg-red-50 text-red-700';
    return 'bg-stone-100 text-stone-600';
  };

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Vendor Planning"
        title="My Vendor Bookings"
        description="Track every request from first contact through confirmation and completion."
        action={<Link to="/vendors" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Find Vendors</Link>}
      />
      {location.state?.message ? <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{location.state.message}</p> : null}
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={load} /> : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {[['Total', data.summary.total], ['Pending', data.summary.pending], ['Accepted', data.summary.accepted], ['Confirmed', data.summary.confirmed], ['Completed', data.summary.completed]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {data.bookings.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs uppercase text-stone-500">
                    <tr>{['Vendor', 'Service', 'Event Date', 'Time Slot', 'Amount', 'Status', 'Booked By', 'Invoice', 'Created', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {data.bookings.map((booking) => (
                      <tr key={booking._id}>
                        <td className="px-5 py-4 font-semibold">{booking.vendorProfile?.businessName}</td>
                        <td className="px-5 py-4">{booking.serviceName}</td>
                        <td className="px-5 py-4">{formatWeddingDate(booking.eventDate)}</td>
                        <td className="px-5 py-4">{formatTimeSlot(booking.timeSlot)}</td>
                        <td className="px-5 py-4">{formatBudget(booking.amount)}</td>
                        <td className="px-5 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass(booking.status)}`}>{booking.status}</span>
                        </td>
                        <td className="px-5 py-4">{formatBookedBy(booking)}</td>
                        <td className="px-5 py-4 text-xs text-stone-500">
                          {booking.invoice?.invoiceNumber || '—'}
                          {booking.invoice?.status ? ` (${booking.invoice.status})` : ''}
                        </td>
                        <td className="px-5 py-4">{formatWeddingDate(booking.createdAt)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <Link to={`/vendors/${booking.vendorProfile?._id}`} aria-label="View vendor" className="p-2 text-brand-700"><FiEye /></Link>
                            {booking.status === 'accepted' && booking.invoice?.status === 'issued' ? (
                              <button type="button" disabled={payingId === booking._id} onClick={() => pay(booking._id)} aria-label="Pay invoice" className="p-2 text-brand-700 disabled:opacity-50"><FiCreditCard /></button>
                            ) : null}
                            {['pending', 'accepted'].includes(booking.status) ? (
                              <button type="button" onClick={() => cancel(booking._id)} aria-label="Cancel booking" className="p-2 text-red-600"><FiXCircle /></button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl bg-white p-10 text-center shadow-sm">
              <FiCalendar className="mx-auto text-3xl text-stone-300" />
              <h2 className="mt-4 text-lg font-semibold">No bookings yet.</h2>
              <p className="mt-2 text-sm text-stone-500">Browse vendors and request your first booking.</p>
              <Link to="/vendors" className="mt-5 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Browse Vendors</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
