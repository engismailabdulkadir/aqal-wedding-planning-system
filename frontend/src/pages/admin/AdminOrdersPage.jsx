import { useEffect, useState } from 'react';
import { getAdminSelections } from '../../services/roleService.js';
import { getApiError } from '../../utils/apiError.js';

export default function AdminOrdersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminSelections()
      .then(setData)
      .catch((e) => setError(getApiError(e)));
  }, []);

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-600">Order Management</p>
      <h1 className="font-display text-4xl font-semibold">Orders</h1>
      <p className="mt-2 text-stone-500">Wedding service selections and order status.</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              {['Item', 'Customer', 'Wedding', 'Vendor', 'Total', 'Status'].map((x) => (
                <th key={x} className="px-5 py-4">{x}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.selections?.map((s) => (
              <tr key={s._id}>
                <td className="px-5 py-4 font-semibold">{s.itemName}</td>
                <td className="px-5 py-4">{s.customer?.firstName} {s.customer?.lastName}</td>
                <td className="px-5 py-4">{s.wedding?.weddingName}</td>
                <td className="px-5 py-4">{s.vendor?.firstName} {s.vendor?.lastName}</td>
                <td className="px-5 py-4">${s.totalAmount}</td>
                <td className="px-5 py-4 capitalize">{s.status?.replace('_', ' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.selections?.length && !error && <p className="p-8 text-center text-stone-400">No orders yet.</p>}
      </div>
    </div>
  );
}
