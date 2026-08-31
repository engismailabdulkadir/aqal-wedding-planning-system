import { useEffect, useState } from 'react';
import {
  FiBriefcase,
  FiCalendar,
  FiCreditCard,
  FiHeart,
  FiShoppingBag,
  FiUsers,
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard } from '../../components/ui/index.js';
import { getAdminDashboard } from '../../services/roleService.js';

function ChartPlaceholder({ title, items, labelKey = 'month', valueKey = 'count' }) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-stone-800">{title}</h3>
        <p className="mt-4 text-sm text-stone-400">No data yet — charts will populate as activity grows.</p>
      </div>
    );
  }
  const max = Math.max(...items.map((i) => i[valueKey]), 1);
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-stone-800">{title}</h3>
      <div className="mt-4 space-y-2">
        {items.slice(-6).map((item) => (
          <div key={item[labelKey]} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 text-stone-500">{item[labelKey]}</span>
            <div className="h-2 flex-1 rounded-full bg-stone-100">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(item[valueKey] / max) * 100}%` }} />
            </div>
            <span className="w-8 text-right font-medium">{item[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch((e) => setError(e.response?.data?.message || 'Could not load dashboard'));
  }, []);

  const s = data?.summary;

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="System Administration" title="Admin Dashboard" description="Real-time platform totals from MongoDB." />

      {error && <p className="mt-6 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}

      {s && (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={FiUsers} label="Total Users" value={s.totalUsers} />
            <StatCard icon={FiUsers} label="Customers" value={s.totalCustomers} />
            <StatCard icon={FiBriefcase} label="Wedding Planners" value={s.totalPlanners} />
            <StatCard icon={FiShoppingBag} label="Vendors" value={s.totalVendors} />
            <StatCard icon={FiHeart} label="Total Weddings" value={s.totalWeddings} />
            <StatCard icon={FiCalendar} label="Upcoming Weddings" value={s.upcomingWeddings} />
            <StatCard icon={FiHeart} label="Completed Weddings" value={s.completedWeddings} />
            <StatCard icon={FiShoppingBag} label="Total Services" value={s.totalServices} />
            <StatCard icon={FiCalendar} label="Total Bookings" value={s.totalBookings} />
            <StatCard icon={FiShoppingBag} label="Total Orders" value={s.totalOrders} />
            <StatCard icon={FiShoppingBag} label="Pending Orders" value={s.pendingOrders} />
            <StatCard icon={FiShoppingBag} label="Confirmed Orders" value={s.confirmedOrders} />
            <StatCard icon={FiCreditCard} label="Total Payments" value={s.totalPayments} />
            <StatCard icon={FiCreditCard} label="Pending Payments" value={s.pendingPayments} />
            <StatCard icon={FiCreditCard} label="Completed Payments" value={s.completedPayments} />
            <StatCard icon={FiCreditCard} label="Total Revenue" value={s.totalRevenue?.toLocaleString()} suffix=" USD" />
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-2">
            <ChartPlaceholder title="Weddings by Month" items={data.charts?.weddingsByMonth} />
            <ChartPlaceholder title="Revenue by Month" items={data.charts?.revenueByMonth} />
            <ChartPlaceholder title="Bookings by Month" items={data.charts?.bookingsByMonth} />
            <ChartPlaceholder title="Customer Growth" items={data.charts?.customerGrowth} />
            <ChartPlaceholder title="Vendor Growth" items={data.charts?.vendorGrowth} />
            <ChartPlaceholder title="Services by Category" items={data.charts?.servicesByCategory} labelKey="category" />
            <ChartPlaceholder title="Orders by Status" items={data.charts?.ordersByStatus} labelKey="status" />
            <ChartPlaceholder title="Weddings by Status" items={data.charts?.weddingsByStatus} labelKey="status" />
          </div>
        </>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <Link to="/admin/users/manage" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Manage Users</Link>
        <Link to="/admin/venues" className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-700">Venues</Link>
        <Link to="/admin/customers" className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-700">Customers</Link>
        <Link to="/admin/weddings" className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-700">Weddings</Link>
        <Link to="/admin/vendors" className="rounded-full border border-brand-200 px-5 py-3 text-sm font-semibold text-brand-700">Vendors</Link>
      </div>
    </div>
  );
}
