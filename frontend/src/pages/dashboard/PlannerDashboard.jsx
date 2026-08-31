import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader, StatCard } from '../../components/ui/index.js';
import { getPlannerDashboard } from '../../services/venueService.js';
import { formatWeddingDate } from '../../utils/weddingFormat.js';

export default function PlannerDashboard() {
  const [searchParams] = useSearchParams();
  const filter = searchParams.get('filter');
  const view = searchParams.get('view');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPlannerDashboard().then(setData).catch((e) => setError(e.response?.data?.message || 'Could not load planner dashboard'));
  }, []);

  const weddings = useMemo(() => {
    const list = data?.weddings || [];
    if (filter === 'upcoming') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return list.filter((wedding) => wedding.weddingDate && new Date(wedding.weddingDate) >= today);
    }
    return list;
  }, [data, filter]);

  const s = data?.summary;
  const hall = s?.hallBookingStatus;
  const services = s?.serviceStatus;

  const title = filter === 'upcoming'
    ? 'Upcoming Weddings'
    : view === 'tasks'
      ? 'Tasks Coordination'
      : view === 'timeline'
        ? 'Timeline Coordination'
        : view === 'guests'
          ? 'Guests Overview'
          : view === 'services'
            ? 'Selected Services'
            : view === 'bookings'
              ? 'Bookings / Orders'
              : 'Assigned Weddings';

  const description = view
    ? 'Open a wedding below to manage this area in the coordination workspace.'
    : 'Only weddings assigned to you.';

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader eyebrow="Wedding Planner Workspace" title={title} description={description} />
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      {s && !view && !filter && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Assigned Weddings', s.assignedWeddings],
            ['Upcoming Weddings', s.upcomingWeddings],
            ['Weddings This Week', s.weddingsThisWeek],
            ['Pending Tasks', s.pendingTasks],
            ['Overdue Tasks', s.overdueTasks],
            ['Upcoming Deadlines', s.upcomingDeadlines],
            ['Pending Vendor Confirmations', s.pendingVendorConfirmations],
            ['Hall Status', `${hall?.confirmed || 0} confirmed / ${hall?.pending || 0} pending / ${hall?.held || 0} held`],
            ['Service Status', `${services?.confirmed || 0} confirmed / ${services?.pending || 0} pending`],
          ].map(([label, value]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </div>
      )}
      <h2 className="mt-10 font-display text-2xl font-semibold">{filter === 'upcoming' ? 'Upcoming' : 'Assigned'} Weddings</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {weddings.map((w) => (
          <Link
            key={w._id}
            to={`/planner/weddings/${w._id}${view ? `?tab=${view}` : ''}`}
            className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm hover:ring-2 hover:ring-brand-100 dark:border-stone-700 dark:bg-stone-900"
          >
            <h3 className="font-display text-2xl font-semibold">{w.weddingName}</h3>
            <p className="mt-2 text-sm text-stone-500">{w.customer?.firstName} {w.customer?.lastName}</p>
            <p className="mt-2 text-sm text-stone-500">{formatWeddingDate(w.weddingDate)} · {w.selectedVenue?.name || w.city}</p>
            {view ? <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-brand-700">Open {view}</p> : null}
          </Link>
        ))}
        {!weddings.length && <p className="text-stone-400">No weddings found.</p>}
      </div>
    </div>
  );
}
