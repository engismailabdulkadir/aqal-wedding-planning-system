import { Link } from 'react-router-dom';
import { formatBudget } from '../../../utils/weddingFormat.js';

export default function SelectionManager({ items = [], empty, browseTo, onRemove, removingId }) {
  if (!items.length) {
    return (
      <div>
        <p className="text-stone-500">{empty}</p>
        {browseTo && <Link to={browseTo} className="mt-4 inline-block font-semibold text-brand-700">Browse services</Link>}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const locked = ['fulfilled', 'completed'].includes(item.status);
        const vendorName = item.listing?.vendorProfile?.businessName
          || (item.vendor ? `${item.vendor.firstName || ''} ${item.vendor.lastName || ''}`.trim() : 'Vendor');
        return (
          <article key={item._id} className="rounded-2xl border border-stone-100 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-semibold text-stone-900">{item.itemName}</p>
                <p className="mt-1 text-sm capitalize text-stone-500">{String(item.category || '').replaceAll('_', ' ')}</p>
                <dl className="mt-3 grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
                  <div>Current selection: {item.itemName}</div>
                  <div>Vendor: {vendorName || '—'}</div>
                  <div>Price: {formatBudget(item.totalAmount || item.totalPrice || item.price)}</div>
                  <div>Booking status: {item.status}</div>
                  <div>Payment status: {item.paymentStatus || 'unpaid'}</div>
                </dl>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={`/services/${item.listing?._id || item.listing}`} className="rounded-full border px-4 py-2 text-sm font-semibold text-stone-700">View Details</Link>
                <Link to={`/services?category=${encodeURIComponent(item.category)}`} className="rounded-full border px-4 py-2 text-sm font-semibold text-stone-700">Change</Link>
                <button
                  type="button"
                  disabled={locked || removingId === item._id}
                  onClick={() => onRemove?.(item)}
                  className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {locked ? 'Completed' : 'Remove'}
                </button>
              </div>
            </div>
          </article>
        );
      })}
      {browseTo && <Link to={browseTo} className="inline-block font-semibold text-brand-700">Add another</Link>}
    </div>
  );
}
