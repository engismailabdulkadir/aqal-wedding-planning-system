/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { FiShoppingBag, FiXCircle } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { ErrorState, LoadingState, NoWedding, PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getSelections, updateSelection } from '../../services/planningService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget } from '../../utils/weddingFormat.js';

export default function SelectionsPage() {
  const { activeWeddingId } = useActiveWedding();
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getSelections(activeWeddingId).then(setData).catch((err) => setError(getApiError(err))).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [activeWeddingId]);

  const cancel = async (id) => {
    const confirmed = await confirmAction({
      title: 'Cancel this selection?',
      text: 'The service will be removed from this wedding’s active selections.',
      confirmButtonText: 'Cancel Selection',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await updateSelection(id, { status: 'cancelled' });
      await showSuccess('Selection cancelled successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  };

  if (!activeWeddingId) return <NoWedding />;

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Current Wedding"
        title="My Wedding Selections"
        description="Track selected services and their payment status."
        action={<Link to="/services" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Browse Wedding Services</Link>}
      />
      {location.state?.message ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-emerald-700">{location.state.message}</p> : null}
      {loading ? <LoadingState /> : error ? <ErrorState message={error} retry={load} /> : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[['Selected Items', data.summary.selectedItems], ['Pending Payment', data.summary.pendingPayment], ['Paid Items', data.summary.paidItems], ['Total Cost', formatBudget(data.summary.totalCost)]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-sm text-stone-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          {data.selections.length ? (
            <div className="mt-6 overflow-x-auto rounded-2xl bg-white shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50">
                  <tr>{['Category', 'Item', 'Vendor', 'Price', 'Quantity', 'Total', 'Status', 'Actions'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr>
                </thead>
                <tbody className="divide-y">
                  {data.selections.map((selection) => (
                    <tr key={selection._id} className={selection.status === 'cancelled' ? 'opacity-50' : ''}>
                      <td className="px-5 py-4 capitalize">{selection.category.replaceAll('_', ' ')}</td>
                      <td className="px-5 py-4 font-semibold">{selection.itemName}</td>
                      <td className="px-5 py-4">{selection.listing?.vendorProfile?.businessName || selection.vendor?.firstName}</td>
                      <td className="px-5 py-4">{formatBudget(selection.price)}</td>
                      <td className="px-5 py-4">{selection.quantity}</td>
                      <td className="px-5 py-4">{formatBudget(selection.totalAmount)}</td>
                      <td className="px-5 py-4 capitalize">{selection.status.replaceAll('_', ' ')}</td>
                      <td className="px-5 py-4">
                        {selection.status === 'pending_payment' ? (
                          <div className="flex gap-3">
                            <Link to={`/payments?selection=${selection._id}`} className="font-semibold text-brand-700">Pay Now</Link>
                            <button type="button" onClick={() => cancel(selection._id)} aria-label="Cancel selection" className="text-red-600"><FiXCircle /></button>
                          </div>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-7 rounded-2xl bg-white p-10 text-center">
              <FiShoppingBag className="mx-auto text-3xl text-stone-300" />
              <p className="mt-3 font-semibold">You have not selected any wedding services yet.</p>
              <Link to="/services" className="mt-4 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white">Browse Wedding Services</Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
