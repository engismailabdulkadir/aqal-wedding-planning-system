import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiCreditCard } from 'react-icons/fi';
import Modal from '../../components/common/Modal.jsx';
import ModalFooter, { ModalCancelButton } from '../../components/common/ModalFooter.jsx';
import { ErrorState, LoadingState, NoWedding, PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { useAuth } from '../../hooks/useAuth.js';
import {
  getPaymentStatus,
  getPayments,
  initiateWaafiPayment,
} from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { isValidPhone } from '../../utils/validation.js';
import { formatMoney, formatWeddingDate } from '../../utils/weddingFormat.js';

const PENDING_STATUSES = new Set(['created', 'pending', 'processing']);
const FINAL_STATUSES = new Set(['successful', 'paid', 'failed', 'cancelled', 'expired', 'refunded']);

function payableKey(item) {
  return JSON.stringify({
    orderId: item.orderId,
    bookingId: item.bookingId,
    selectionId: item.selectionId,
    vendorBookingId: item.vendorBookingId,
    bookingInvoiceId: item.bookingInvoiceId,
  });
}

function formatPaymentStatus(status) {
  if (!status) return 'Unpaid';
  return status.replaceAll('_', ' ');
}

export default function PaymentsPage() {
  const { user } = useAuth();
  const { activeWedding, activeWeddingId } = useActiveWedding();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [noticeTone, setNoticeTone] = useState('success');
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activePayment, setActivePayment] = useState(null);
  const pollRef = useRef(null);

  const waafiConfigured = data?.waafiConfigured ?? false;

  const load = () => {
    setLoading(true);
    getPayments(activeWeddingId)
      .then((payload) => {
        setData(payload);
        const booking = params.get('booking');
        const order = params.get('order');
        const match = (payload.payables || []).find(
          (item) => String(item.bookingId) === booking
            || String(item.orderId) === order
            || String(item.vendorBookingId) === booking,
        );
        if (match) setSelected(payableKey(match));
      })
      .catch((e) => setError(getApiError(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [activeWeddingId]);

  useEffect(() => {
    if (user?.phone && !paymentPhone) setPaymentPhone(user.phone);
  }, [user?.phone]);

  const current = (data?.payables || []).find((item) => payableKey(item) === selected);
  const amountToPay = current?.amountDue ?? 0;

  const phoneValidationError = paymentPhone.trim()
    ? isValidPhone(paymentPhone, { required: true })
    : 'Payment phone number is required.';

  useEffect(() => {
    if (!activePayment?._id || FINAL_STATUSES.has(activePayment.status)) {
      if (pollRef.current) clearInterval(pollRef.current);
      return undefined;
    }

    pollRef.current = setInterval(async () => {
      try {
        const result = await getPaymentStatus(activePayment._id);
        setActivePayment((prev) => ({ ...prev, ...result.payment }));
        if (result.isComplete) {
          clearInterval(pollRef.current);
          load();
          if (result.status === 'successful' || result.status === 'paid') {
            setNoticeTone('success');
            setNotice(`Payment of ${formatMoney(result.payment?.amount)} completed. Reference: ${result.payment?.providerReference || result.payment?.receiptNumber}.`);
          } else {
            setNoticeTone('error');
            setNotice('Payment was not completed. Please verify the payment number and try again.');
          }
        }
      } catch {
        // keep polling
      }
    }, 5000);

    return () => clearInterval(pollRef.current);
  }, [activePayment?._id, activePayment?.status]);

  function openConfirmModal(event) {
    event.preventDefault();
    if (!current) {
      setError('Select a payable invoice first.');
      return;
    }
    if (!waafiConfigured) {
      setError('WaafiPay API credentials are not configured on the server.');
      return;
    }
    if (phoneValidationError) {
      setError(phoneValidationError);
      return;
    }
    setError('');
    setConfirmOpen(true);
  }

  async function confirmAndSendPayment() {
    if (!current) return;
    setError('');
    setSubmitting(true);
    try {
      const ids = JSON.parse(selected);
      const created = await initiateWaafiPayment({
        orderId: ids.orderId,
        vendorBookingId: ids.vendorBookingId,
        bookingInvoiceId: ids.bookingInvoiceId,
        paymentPhone: paymentPhone.trim(),
      });
      setConfirmOpen(false);
      setActivePayment(created.payment);
      if (created.payment?.status === 'successful' || created.payment?.status === 'paid') {
        setNoticeTone('success');
        setNotice(
          created.message
            || `Payment of ${formatMoney(created.payment?.amount)} completed successfully.`,
        );
      } else {
        setNoticeTone('error');
        setNotice('Payment was not completed. Please verify the payment number and try again.');
      }
      load();
    } catch (err) {
      setNoticeTone('error');
      setNotice('');
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const processing = submitting || PENDING_STATUSES.has(activePayment?.status);

  if (!activeWeddingId) return <NoWedding />;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Secure Wedding Payments"
        title="Payments"
        description="Pay accepted booking invoices in full via WAAFI Mobile Money. The server calculates the exact remaining balance."
      />
      {notice && (
        <p className={`mt-5 rounded-xl p-3 ${noticeTone === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          {notice}
        </p>
      )}
      {loading ? <LoadingState /> : error && !data ? <ErrorState message={error} retry={load} /> : (
        <div className="mt-7 grid gap-6 lg:grid-cols-[380px_1fr]">
          <div>
            <form onSubmit={openConfirmModal} className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Checkout</h2>
              <p className="mt-1 text-sm text-stone-500">{activeWedding?.weddingName}</p>

              <select
                required
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="mt-5 w-full rounded-xl border p-3"
                disabled={processing}
              >
                <option value="">Select a payable invoice</option>
                {(data.payables || []).map((item) => (
                  <option key={payableKey(item)} value={payableKey(item)}>
                    {item.name} — due {formatMoney(item.amountDue)}
                  </option>
                ))}
              </select>

              {current && (
                <>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-500">Service</dt>
                      <dd className="text-right font-medium">{current.name}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-500">Vendor</dt>
                      <dd className="text-right">{current.vendor?.firstName} {current.vendor?.lastName}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-500">Invoice total</dt>
                      <dd className="font-medium">{formatMoney(current.totalPrice)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-500">Amount paid</dt>
                      <dd>{formatMoney(current.amountPaid)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-500">Remaining balance</dt>
                      <dd className="font-semibold text-brand-700">{formatMoney(current.amountDue)}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-stone-500">Payment status</dt>
                      <dd className="capitalize">{formatPaymentStatus(current.paymentStatus)}</dd>
                    </div>
                  </dl>

                  {current.totalPrice > 0 ? (
                    <div className="mt-4">
                      <div className="mb-1 flex justify-between text-xs font-semibold text-stone-500">
                        <span>Payment progress</span>
                        <span>
                          {Math.min(100, Math.round((Number(current.amountPaid || 0) / Number(current.totalPrice || 1)) * 100))}% paid
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-brand-600 transition-all"
                          style={{
                            width: `${Math.min(100, Math.round((Number(current.amountPaid || 0) / Number(current.totalPrice || 1)) * 100))}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {current.canPay ? (
                    <>
                      <label className="mt-5 block text-sm font-medium text-stone-700">
                        Payment phone number *
                        <input
                          type="tel"
                          value={paymentPhone}
                          onChange={(e) => setPaymentPhone(e.target.value)}
                          placeholder="e.g. 0617161841"
                          className="mt-1 w-full rounded-xl border p-3"
                          required
                          disabled={processing}
                        />
                      </label>
                      {user?.phone && paymentPhone !== user.phone ? (
                        <p className="mt-1 text-xs text-stone-500">
                          Account phone: {user.phone} — WAAFI will use the number above.
                        </p>
                      ) : null}

                      <p className="mt-4 text-sm font-medium text-stone-700">Payment method</p>
                      <p className="mt-1 text-sm text-stone-600">Mobile Money / WAAFI</p>

                      <p className="mt-4 text-sm text-stone-500">Amount to pay</p>
                      <p className="text-2xl font-semibold text-stone-900">{formatMoney(amountToPay)}</p>

                      {!waafiConfigured ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                          WaafiPay API credentials are not configured on the server.
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={processing || !waafiConfigured || Boolean(phoneValidationError) || amountToPay <= 0}
                        className="mt-5 w-full rounded-full bg-brand-600 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {processing
                          ? 'Sending payment request…'
                          : `Pay ${formatMoney(amountToPay)} with WAAFI`}
                      </button>

                      {processing && (
                        <p className="mt-3 text-center text-sm text-stone-600">Sending payment request…</p>
                      )}
                    </>
                  ) : (
                    <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-center font-semibold text-emerald-700">Paid in full</p>
                  )}
                </>
              )}

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </form>
          </div>

          <section>
            <div className="grid grid-cols-3 gap-4">
              {[
                ['Outstanding', data?.summary?.outstanding ?? data?.summary?.totalDue],
                ['Total paid', data?.summary?.totalPaid],
                ['Amount due', data?.summary?.totalDue],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                  <p className="text-sm text-stone-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatMoney(value)}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50">
                  <tr>
                    {['Reference', 'Item', 'Type', 'Amount', 'Method', 'Status', 'Date'].map((h) => (
                      <th key={h} className="px-5 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(data.payments || [])
                    .filter((p) => p.status === 'successful' || p.status === 'paid')
                    .map((p) => (
                      <tr key={p._id}>
                        <td className="px-5 py-4 font-mono text-xs">{p.providerReference || p.receiptNumber || p.transactionReference}</td>
                        <td className="px-5 py-4 font-semibold">
                          {p.vendorBooking?.serviceName || p.bookingInvoice?.serviceName || p.order?.itemName || p.selection?.itemName || p.booking?.slotType || 'Payment'}
                        </td>
                        <td className="px-5 py-4 capitalize">{(p.paymentType || '').replaceAll('_', ' ')}</td>
                        <td className="px-5 py-4">{formatMoney(p.amount)}</td>
                        <td className="px-5 py-4 capitalize">{(p.paymentMethod || '').replaceAll('_', ' ')}</td>
                        <td className="px-5 py-4 capitalize">{p.status}</td>
                        <td className="px-5 py-4">{formatWeddingDate(p.paidAt || p.createdAt)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!(data.payments || []).some((p) => p.status === 'successful' || p.status === 'paid') && (
                <div className="p-10 text-center">
                  <FiCreditCard className="mx-auto text-3xl text-stone-300" />
                  <p className="mt-3">No payments yet.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      <Modal
        isOpen={confirmOpen}
        onClose={() => !submitting && setConfirmOpen(false)}
        title="Confirm Payment"
        subtitle="Review the amount and payment number before sending to WAAFI."
        size="sm"
        loading={submitting}
        footer={
          <ModalFooter>
            <ModalCancelButton onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Cancel
            </ModalCancelButton>
            <button
              type="button"
              onClick={confirmAndSendPayment}
              disabled={submitting}
              className="rounded-full bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Sending payment request…' : 'Confirm & Send'}
            </button>
          </ModalFooter>
        }
      >
        <div className="space-y-4 text-sm text-stone-600">
          <div>
            <p className="font-medium text-stone-800">Amount</p>
            <p className="mt-1 text-2xl font-semibold text-stone-900">{formatMoney(amountToPay)}</p>
          </div>
          <div>
            <p className="font-medium text-stone-800">Payment number</p>
            <p className="mt-1 font-mono text-base text-stone-900">{paymentPhone.trim()}</p>
          </div>
          <p>Are you sure you want to send this payment request?</p>
        </div>
      </Modal>
    </div>
  );
}
