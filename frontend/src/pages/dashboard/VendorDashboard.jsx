import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard } from '../../components/ui/index.js';
import { getMyListings, getVendorOrders, getVendorPayments, getVendorProfile } from '../../services/planningService.js';
import { formatBudget } from '../../utils/weddingFormat.js';

export default function VendorDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getVendorProfile(), getMyListings(), getVendorOrders(), getVendorPayments()])
      .then(([profile, listings, orders, payments]) => setData({
        profile: profile.vendor,
        listings: listings.listings || [],
        orders: orders.orders || [],
        payments: payments.payments || [],
        received: payments.summary?.received || 0,
      }))
      .catch((e) => setError(e.response?.data?.message || 'Could not load vendor dashboard'));
  }, []);

  const orders = data?.orders || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const pending = orders.filter((o) => o.status === 'pending');
  const confirmed = orders.filter((o) => o.status === 'confirmed');
  const inProgress = orders.filter((o) => o.status === 'in_progress');
  const completed = orders.filter((o) => o.status === 'completed');
  const upcoming = orders.filter((o) => ['confirmed', 'in_progress'].includes(o.status) && o.eventDate && new Date(o.eventDate) >= today);
  const paymentsPending = orders.filter((o) => o.paymentStatus !== 'paid' && !['cancelled', 'rejected'].includes(o.status)).reduce((n, o) => n + Number(o.balance || 0), 0);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Vendor Workspace" title="Business Dashboard" description="Manage your listings, bookings, and payments." />
      {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Active Listings', data?.listings?.filter((x) => x.active).length || 0],
          ['New Orders', pending.length],
          ['Pending Confirmations', pending.length],
          ['Confirmed Orders', confirmed.length],
          ['Upcoming Services', upcoming.length + inProgress.length],
          ['Completed Orders', completed.length],
          ['Amount Earned', formatBudget(data?.received || 0)],
          ['Payments Pending', formatBudget(paymentsPending)],
        ].map(([k, v]) => (
          <StatCard key={k} label={k} value={v} />
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/vendor/profile" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Edit profile</Link>
        <Link to="/vendor/listings" className="rounded-full border px-5 py-3 text-sm font-semibold text-brand-700">Manage listings</Link>
        <Link to="/vendor/orders" className="rounded-full border px-5 py-3 text-sm font-semibold text-brand-700">View orders</Link>
        <Link to="/vendor/availability" className="rounded-full border px-5 py-3 text-sm font-semibold text-brand-700">Availability</Link>
      </div>
    </div>
  );
}
