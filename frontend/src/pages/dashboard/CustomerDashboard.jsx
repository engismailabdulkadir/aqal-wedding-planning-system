/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { FiCalendar, FiCheckCircle, FiCheckSquare, FiClock, FiCreditCard, FiDollarSign, FiEdit3, FiHeart, FiPlus, FiShoppingBag, FiUserPlus, FiUsers } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import EmptyState from '../../components/dashboard/EmptyState.jsx';
import QuickAction from '../../components/dashboard/QuickAction.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import JoinRequestsPanel from '../../components/wedding/JoinRequestsPanel.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getBudget } from '../../services/budgetService.js';
import { getGuests } from '../../services/guestService.js';
import { getTasks } from '../../services/taskService.js';
import { getWeddingOverview } from '../../services/weddingService.js';
import { getMyMembership } from '../../services/weddingMemberService.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getApiError } from '../../utils/apiError.js';
import { formatTaskDate } from '../../utils/filterTasks.js';
import { formatBudget, formatWeddingDate, getDaysRemainingLabel } from '../../utils/weddingFormat.js';

function SectionCard({ title, children, action, to }) {
  return <section className="rounded-2xl border border-stone-100 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><h2 className="text-lg font-semibold text-stone-900">{title}</h2>{action && <Link to={to} className="text-xs font-semibold text-brand-700 hover:text-brand-900">{action}</Link>}</div><div className="mt-5">{children}</div></section>;
}

function DashboardSkeleton() {
  return <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Loading wedding dashboard">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white shadow-sm"><div className="m-5 h-4 w-24 rounded bg-stone-100" /><div className="mx-5 mt-4 h-7 w-32 rounded bg-stone-100" /></div>)}</div>;
}

function CustomerDashboard() {
  const { user } = useAuth();
  const { activeWedding: wedding, activeWeddingId, loading: weddingsLoading, error: weddingsError, refreshWeddings } = useActiveWedding();
  const location = useLocation();
  const [budget, setBudget] = useState(null);
  const [guestData, setGuestData] = useState(null);
  const [taskData, setTaskData] = useState(null);
  const [bookingData, setBookingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingMembership, setPendingMembership] = useState(null);
  const flashMessage = typeof location.state?.message === 'string' ? location.state.message : '';

  async function loadDashboard() {
    setLoading(true);
    setError('');
    if (!activeWeddingId) {
      setBudget(null);
      setGuestData(null);
      setTaskData(null);
      setBookingData(null);
      setLoading(false);
      return;
    }
    try {
      const [budgetData, guestsData, tasksData, overviewData] = await Promise.all([
        getBudget(activeWeddingId),
        getGuests(activeWeddingId),
        getTasks(activeWeddingId),
        getWeddingOverview(activeWeddingId),
      ]);
      setBudget(budgetData.budget);
      setGuestData(guestsData);
      setTaskData(tasksData);
      setBookingData(overviewData.overview);
    } catch (requestError) {
      setError(getApiError(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (weddingsLoading) return;
    if (activeWeddingId) {
      setPendingMembership(null);
      return;
    }
    let active = true;
    getMyMembership()
      .then((data) => {
        if (!active) return;
        const membership = data.membership;
        setPendingMembership(membership?.status === 'pending' ? membership : null);
      })
      .catch(() => {
        if (active) setPendingMembership(null);
      });
    return () => { active = false; };
  }, [weddingsLoading, activeWeddingId]);

  useEffect(() => {
    if (weddingsLoading) return;
    if (!activeWeddingId) {
      setBudget(null);
      setGuestData(null);
      setTaskData(null);
      setBookingData(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      getBudget(activeWeddingId),
      getGuests(activeWeddingId),
      getTasks(activeWeddingId),
      getWeddingOverview(activeWeddingId),
    ]).then(([budgetData, guestsData, tasksData, overviewData]) => {
      if (!active) return;
      setBudget(budgetData.budget);
      setGuestData(guestsData);
      setTaskData(tasksData);
      setBookingData(overviewData.overview);
    }).catch((requestError) => {
      if (active) setError(getApiError(requestError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [activeWeddingId, weddingsLoading]);

  useEffect(() => {
    if (flashMessage && activeWeddingId) refreshWeddings(activeWeddingId);
  }, [flashMessage, activeWeddingId, refreshWeddings]);

  const stats = [
    { icon: FiCalendar, label: 'Wedding Date', value: wedding ? formatWeddingDate(wedding.weddingDate) : 'Not Set Yet' },
    { icon: FiClock, label: 'Days Remaining', value: wedding ? getDaysRemainingLabel(wedding.weddingDate) : '—' },
    { icon: FiDollarSign, label: 'Total Budget', value: wedding ? formatBudget(wedding.estimatedBudget) : '$0' },
    { icon: FiCreditCard, label: 'Amount Spent', value: formatBudget(budget?.totalPaid || budget?.totalSpent || 0) },
    { icon: FiUsers, label: 'Guests', value: String(guestData?.count || 0), helper: wedding ? `of ${wedding.expectedGuests} expected` : undefined },
    { icon: FiCheckCircle, label: 'Tasks Completed', value: `${taskData?.summary?.completionPercentage || 0}%`, helper: taskData?.summary ? `${taskData.summary.completed} of ${taskData.summary.total} tasks` : undefined },
    { icon: FiShoppingBag, label: 'Confirmed Vendors', value: String(bookingData?.confirmedVendors || 0) },
    { icon: FiCalendar, label: 'Bookings', value: String(bookingData?.confirmedBookings || 0) },
  ];
  const actions = [
    wedding
      ? {
          icon: FiShoppingBag,
          label: (wedding.selectedVenue || wedding.selectedHall) ? 'Continue Planning' : 'Start Booking',
          to: `/weddings/${wedding._id}/bookings`,
        }
      : { icon: FiHeart, label: 'Create Wedding', to: '/weddings/new' },
    wedding ? { icon: FiEdit3, label: 'Edit Wedding', to: `/weddings/${wedding._id}/edit` } : { icon: FiShoppingBag, label: 'Explore Vendors', to: '/vendors' },
    { icon: FiUserPlus, label: 'Add Guest', to: '/guests' },
    { icon: FiCheckSquare, label: 'Add Task', to: '/tasks' },
    { icon: FiCreditCard, label: 'Manage Budget', to: '/budget' },
  ];
  const showSkeleton = weddingsLoading || loading;
  const venueBooked = Boolean(bookingData?.venueName || wedding?.selectedVenue || wedding?.selectedHall);
  const servicesSelected = Number(bookingData?.confirmedVendors || 0) + Number(bookingData?.pendingVendors || 0);
  const bookingsTotal = Number(bookingData?.confirmedBookings || 0) + Number(bookingData?.pendingBookings || 0);
  const planningProgress = Number(bookingData?.tasksPercentage || 0);

  return (
    <div className="mx-auto max-w-[1500px]">
      {flashMessage && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{flashMessage}</div>}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-brand-600">Our Wedding Dashboard</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Welcome back, {user?.firstName || 'there'}</h1>
          <p className="mt-2 text-sm text-stone-500 sm:text-base">Plan and manage your wedding from one place.</p>
        </div>
        {!showSkeleton && !error && (
          <Link
            to={wedding ? `/weddings/${wedding._id}/bookings` : '/weddings/new'}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            {wedding ? <FiShoppingBag /> : <FiPlus />}
            {wedding ? ((wedding.selectedVenue || wedding.selectedHall) ? 'Continue Planning' : 'Start Booking') : 'Create Wedding'}
          </Link>
        )}
      </div>

      {showSkeleton ? <DashboardSkeleton /> : (error || weddingsError) ? (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          <p className="font-semibold">Could not load your dashboard</p>
          <p className="mt-1 text-sm">{error || weddingsError}</p>
          <button onClick={loadDashboard} className="mt-4 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white">Try Again</button>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</div>
          <div className="mt-8">
            {wedding ? (
              <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-7 text-white shadow-soft sm:p-9">
                <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Our Wedding</p>
                    <h2 className="mt-3 font-display text-3xl font-semibold">{wedding.weddingName}</h2>
                    <p className="mt-2 text-sm text-brand-100">{wedding.partner1Name} &amp; {wedding.partner2Name}{wedding.city ? ` • ${wedding.city}` : ''}</p>
                    <p className="mt-2 text-sm text-brand-100">
                      {formatWeddingDate(wedding.weddingDate)}
                      {wedding.expectedGuests ? ` • ${wedding.expectedGuests} guests` : ''}
                      {` • Budget ${formatBudget(wedding.estimatedBudget)}`}
                    </p>
                    <div className="mt-4 grid gap-2 text-sm text-brand-50 sm:grid-cols-3">
                      <p>Venue: {venueBooked ? (bookingData?.venueName || wedding.selectedVenue?.name || 'Booked') : 'Not Booked'}</p>
                      <p>Services: {servicesSelected} Selected</p>
                      <p>Bookings: {bookingsTotal}</p>
                    </div>
                    <p className="mt-3 text-sm text-brand-100">Planning progress {planningProgress}%</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link
                      to={`/weddings/${wedding._id}/bookings`}
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-semibold text-brand-800 hover:bg-brand-50"
                    >
                      <FiShoppingBag /> {(wedding.selectedVenue || wedding.selectedHall) ? 'Continue Planning' : 'Start Booking'}
                    </Link>
                    <Link
                      to={`/weddings/${wedding._id}`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      View Summary
                    </Link>
                    <Link
                      to={`/weddings/${wedding._id}/edit`}
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                    >
                      <FiEdit3 /> Edit Wedding
                    </Link>
                  </div>
                </div>
              </section>
            ) : pendingMembership ? (
              <section className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/20">
                <FiHeart className="mx-auto text-4xl text-amber-500" />
                <h2 className="mt-4 text-xl font-semibold text-stone-900 dark:text-stone-50">Waiting for partner approval</h2>
                <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                  Your join request as <strong>{pendingMembership.memberRole}</strong> is pending.
                  Your partner must accept it before you can access the shared wedding dashboard.
                </p>
              </section>
            ) : (
              <EmptyState
                icon={FiHeart}
                title="You haven't created a wedding yet."
                description="Create your wedding profile or join an existing wedding with an invite code from your partner."
                action="Create Wedding"
                to="/weddings/new"
              />
            )}
            {!wedding && !pendingMembership ? (
              <div className="mt-4 text-center">
                <Link to="/weddings/join" className="text-sm font-semibold text-brand-700 hover:text-brand-900">
                  Join Existing Wedding
                </Link>
              </div>
            ) : null}
            {wedding?.isOwner ? (
              <JoinRequestsPanel weddingId={wedding._id} isOwner={wedding.isOwner} />
            ) : null}
          </div>
          <section className="mt-8">
            <h2 className="text-lg font-semibold text-stone-900">Quick Actions</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{actions.map((action) => <QuickAction key={action.label} {...action} />)}</div>
          </section>
          <div className="mt-8 grid gap-6 xl:grid-cols-2">
            <SectionCard title="Upcoming Tasks" action="View tasks" to="/tasks">
              {taskData?.tasks?.filter((task) => task.status !== 'completed' && task.dueDate).slice(0, 5).length ? (
                <div className="divide-y divide-stone-100">
                  {taskData.tasks.filter((task) => task.status !== 'completed' && task.dueDate).slice(0, 5).map((task) => (
                    <div key={task._id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-stone-800">{task.title}</p>
                        <p className="mt-1 text-xs text-stone-500">{formatTaskDate(task.dueDate)}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${task.priority === 'high' ? 'bg-red-50 text-red-700' : task.priority === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {task.priority ? task.priority[0].toUpperCase() + task.priority.slice(1) : 'Normal'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl bg-stone-50 p-6 text-center">
                  <FiCheckSquare className="mx-auto text-2xl text-stone-300" />
                  <p className="mt-3 font-medium text-stone-700">No upcoming tasks.</p>
                  <p className="mt-1 text-sm leading-6 text-stone-500">{wedding ? 'Add a task with a due date to see it here.' : 'Create your wedding first to build your checklist.'}</p>
                </div>
              )}
            </SectionCard>
            <SectionCard title="Budget Overview" action="Manage budget" to="/budget">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">Used</p><p className="mt-2 font-semibold text-stone-900">{formatBudget(budget?.totalPaid || budget?.totalSpent || 0)}</p></div>
                <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">Remaining</p><p className={`mt-2 font-semibold ${budget?.remainingBudget < 0 ? 'text-red-600' : 'text-stone-900'}`}>{budget?.remainingBudget < 0 ? `${formatBudget(Math.abs(budget.remainingBudget))} over` : formatBudget(budget?.remainingBudget || 0)}</p></div>
                <div className="rounded-xl bg-stone-50 p-4"><p className="text-xs text-stone-500">Budget</p><p className="mt-2 text-sm font-semibold text-stone-900">{wedding ? formatBudget(wedding.estimatedBudget) : 'Not configured'}</p></div>
              </div>
              <div className="mt-5 h-2 overflow-hidden rounded-full bg-stone-100"><div className={`h-full rounded-full ${budget?.remainingBudget < 0 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min(Math.max(budget?.budgetUsagePercentage || 0, 0), 100)}%` }} /></div>
            </SectionCard>
            <SectionCard title="Guest Overview" action="Manage guests" to="/guests">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['Added', guestData?.summary?.totalGuests || 0], ['Accepted', guestData?.summary?.accepted || 0], ['Pending', guestData?.summary?.pending || 0], ['Declined', guestData?.summary?.declined || 0]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-stone-100 p-4 text-center">
                    <p className="text-2xl font-semibold text-stone-900">{value}</p>
                    <p className="mt-1 text-xs text-stone-500">{label}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Vendor Overview" action="View workspace" to="/workspace">
              {(bookingData?.confirmedBookings || bookingData?.pendingBookings) ? (
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[['Pending', bookingData.pendingBookings || 0], ['Confirmed', bookingData.confirmedBookings || 0], ['Completed', bookingData.completedBookings || 0]].map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-stone-50 p-4">
                      <p className="text-2xl font-semibold">{value}</p>
                      <p className="mt-1 text-xs text-stone-500">{label}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center rounded-xl bg-stone-50 p-6 text-center">
                  <FiShoppingBag className="text-2xl text-stone-300" />
                  <p className="mt-3 font-medium text-stone-700">No vendors booked yet.</p>
                  <Link to="/vendors" className="mt-4 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50">Explore Vendors</Link>
                </div>
              )}
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

export default CustomerDashboard;
