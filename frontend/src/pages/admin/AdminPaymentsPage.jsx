import { useEffect, useState } from 'react';
import { getAdminPayments } from '../../services/roleService.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget } from '../../utils/weddingFormat.js';

export default function AdminPaymentsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminPayments()
      .then(setData)
      .catch((e) => setError(getApiError(e)));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-600">Payment Management</p>
      <h1 className="font-display text-4xl font-semibold">Payments</h1>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              {['Customer', 'Phone', 'Wedding', 'Item', 'Provider', 'Amount', 'Mode', 'Reference', 'Status', 'Date'].map((x) => (
                <th key={x} className="px-5 py-4">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.payments?.map((p) => (
              <tr key={p._id}>
                <td className="px-5 py-4">{p.customer?.firstName} {p.customer?.lastName}</td>
                <td className="px-5 py-4">{p.customerPhone || p.customer?.phone || '—'}</td>
                <td className="px-5 py-4">{p.wedding?.weddingName}</td>
                <td className="px-5 py-4">{p.selection?.itemName || p.order?.itemName || (p.isTestPayment ? 'WAAFI API Test' : '—')}</td>
                <td className="px-5 py-4 capitalize">{p.provider === 'waafipay' ? 'WAAFI Pay' : p.provider || '—'}</td>
                <td className="px-5 py-4">{formatBudget(p.amount)} {p.currency}</td>
                <td className="px-5 py-4">{p.isTestPayment ? 'Test' : 'Live'}</td>
                <td className="px-5 py-4 font-mono text-xs">{p.transactionReference}</td>
                <td className="px-5 py-4 capitalize">{p.status}</td>
                <td className="px-5 py-4">{new Date(p.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.payments?.length && !error && <p className="p-8 text-center text-stone-400">No payments yet.</p>}
      </div>
    </div>
  );
}
