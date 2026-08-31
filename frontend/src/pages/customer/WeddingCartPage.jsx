import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { useWeddingCart } from '../../context/CartContext.jsx';
import { checkoutCart, getCart, removeCartItem } from '../../services/cartService.js';
import { coupleRoleLabel } from '../../utils/roles.js';
import { formatBudget, formatWeddingDate } from '../../utils/weddingFormat.js';
import { getApiError } from '../../utils/apiError.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';
import ListingImage from '../../components/ui/ListingImage.jsx';

function slotLabel(slot) {
  if (slot === 'morning') return 'Morning';
  if (slot === 'evening') return 'Evening';
  if (slot === 'full_day') return 'Full Day';
  return '';
}

const SECTION_ORDER = [
  { key: 'venue', label: 'VENUE', categories: ['venue', 'hall'] },
  { key: 'groom', label: 'GROOM', categories: ['groom_package', 'groom_suit', 'groom_shoes', 'groom_accessories'] },
  { key: 'bride', label: 'BRIDE', categories: ['bride_package', 'bride_dress', 'bride_traditional', 'bride_accessories'] },
  { key: 'cake', label: 'CAKE', categories: ['cake'] },
  { key: 'decoration', label: 'DECORATION', categories: ['decoration'] },
  { key: 'other', label: 'OTHER', categories: ['photography', 'makeup', 'hair', 'henna', 'catering', 'transportation', 'other'] },
];

function groupItems(items) {
  const sections = [];
  const used = new Set();
  for (const section of SECTION_ORDER) {
    const sectionItems = items.filter((item) => section.categories.includes(item.category));
    if (!sectionItems.length) continue;
    sectionItems.forEach((item) => used.add(item._id));
    sections.push({ ...section, items: sectionItems, total: sectionItems.reduce((s, i) => s + i.subtotal, 0) });
  }
  const remainder = items.filter((item) => !used.has(item._id));
  if (remainder.length) {
    sections.push({ key: 'misc', label: 'OTHER', items: remainder, total: remainder.reduce((s, i) => s + i.subtotal, 0) });
  }
  return sections;
}

export default function WeddingCartPage() {
  const navigate = useNavigate();
  const { activeWeddingId } = useActiveWedding();
  const { refreshCart } = useWeddingCart();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    if (!activeWeddingId) return;
    setLoading(true);
    try {
      const result = await getCart(activeWeddingId);
      setData(result);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [activeWeddingId]);

  async function handleRemove(id) {
    try {
      await removeCartItem(id, activeWeddingId);
      await load();
      await refreshCart();
    } catch (requestError) {
      await showApiError(requestError, 'Could not remove item');
    }
  }

  async function handleCheckout() {
    setSubmitting(true);
    setError('');
    try {
      await checkoutCart(activeWeddingId);
      await refreshCart();
      await showSuccess('Booking Requests Sent', 'Vendors will review your requests.');
      navigate('/bookings');
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError, 'Checkout failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeWeddingId) {
    return (
      <div className="rounded-2xl border border-stone-100 bg-white p-8 text-center">
        <p className="text-stone-600">Create or join a wedding before using the booking cart.</p>
        <Link to="/weddings" className="mt-4 inline-flex text-brand-700 font-semibold">Go to Our Wedding</Link>
      </div>
    );
  }

  if (loading) return <p className="text-stone-500">Loading cart…</p>;

  const items = data?.items || [];
  const total = data?.summary?.total || 0;
  const sections = groupItems(items);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-stone-900">Wedding Booking Cart</h1>
          <p className="mt-2 text-stone-500">Shared with your partner. Confirm to send booking requests to vendors.</p>
        </div>
        <Link to="/marketplace" className="text-sm font-semibold text-brand-700">+ Add more</Link>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      {!items.length ? (
        <div className="mt-8 rounded-2xl border border-stone-100 bg-white p-10 text-center text-stone-500">
          Your cart is empty. Browse the marketplace to add halls, packages, and cakes.
        </div>
      ) : (
        <>
          <div className="mt-8 space-y-6">
            {sections.map((section) => (
              <section key={section.key} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">{section.label}</h2>
                <ul className="mt-4 space-y-4">
                  {section.items.map((item) => (
                    <li key={item._id} className="flex gap-4 border-b border-stone-50 pb-4 last:border-0 last:pb-0">
                      <ListingImage
                        listing={item.listing}
                        src={item.image}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-stone-900">{item.itemName}</p>
                        <p className="text-sm text-stone-500">{item.vendorName || item.vendorProfile?.businessName}</p>
                        {item.bookingDate ? (
                          <p className="mt-1 text-sm text-stone-600">
                            {formatWeddingDate(item.bookingDate)}
                            {item.timeSlot ? ` · ${slotLabel(item.timeSlot)}` : ''}
                          </p>
                        ) : null}
                        {item.quantity > 1 ? <p className="text-sm text-stone-500">Qty: {item.quantity}</p> : null}
                        <p className="mt-1 text-sm text-stone-500">
                          Added by {item.addedBy?.firstName} ({coupleRoleLabel(item.addedBy?.role)})
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-semibold text-brand-700">{formatBudget(item.subtotal)}</p>
                        <button type="button" onClick={() => handleRemove(item._id)} className="text-stone-400 hover:text-red-600">
                          <FiTrash2 />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}

      {items.length ? (
        <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50 p-6">
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{formatBudget(total)}</span>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={handleCheckout}
            className="mt-6 w-full rounded-full bg-brand-600 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Submitting…' : 'Confirm Booking Requests'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
