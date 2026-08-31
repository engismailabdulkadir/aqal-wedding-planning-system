/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { FiCalendar, FiEdit3, FiMapPin, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { Link, useLocation, useParams } from 'react-router-dom';
import { LoadingState, PageHeader } from '../../components/customer/PageState.jsx';
import InvitePartnerCard from '../../components/wedding/InvitePartnerCard.jsx';
import JoinRequestsPanel from '../../components/wedding/JoinRequestsPanel.jsx';
import { StatusBadge } from '../../components/ui/index.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { useAuth } from '../../hooks/useAuth.js';
import { getWedding, getWeddingOverview } from '../../services/weddingService.js';
import { getWeddingMembers } from '../../services/weddingMemberService.js';
import { getApiError } from '../../utils/apiError.js';
import { oppositeCoupleRole } from '../../utils/roles.js';
import { formatBudget, formatWeddingDate } from '../../utils/weddingFormat.js';

export default function WeddingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { selectWedding, activeWeddingId, refreshWeddings } = useActiveWedding();
  const [wedding, setWedding] = useState(null);
  const [overview, setOverview] = useState(null);
  const [partnerInvite, setPartnerInvite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const justCreated = Boolean(location.state?.justCreated);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([getWedding(id), getWeddingOverview(id)])
      .then(([weddingData, overviewData]) => {
        if (!active) return;
        setWedding(weddingData.wedding);
        setOverview(overviewData.overview);
        if (activeWeddingId !== id) selectWedding(id);
        if (weddingData.wedding?.isOwner) {
          getWeddingMembers(id)
            .then((memberData) => {
              if (active) setPartnerInvite(memberData.partnerInvite || null);
            })
            .catch(() => {});
        }
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id, activeWeddingId, selectWedding]);

  useEffect(() => {
    if (justCreated) refreshWeddings(id);
  }, [justCreated, id, refreshWeddings]);

  if (loading) return <LoadingState />;
  if (error || !wedding) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Wedding not found</h1>
        <p className="mt-3 text-sm text-stone-500">{error}</p>
        <Link to="/weddings" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">Back to Our Wedding</Link>
      </div>
    );
  }

  const partnerRole = wedding.isOwner ? oppositeCoupleRole(user?.role) : null;
  const plannerName = wedding.planner
    ? `${wedding.planner.firstName || ''} ${wedding.planner.lastName || ''}`.trim()
    : '';
  const venueLabel = overview?.venueName || wedding.selectedVenue?.name || null;
  const hallLabel = overview?.hallName || wedding.selectedHall?.hallName || null;
  const servicesSelected = Number(overview?.confirmedVendors || 0) + Number(overview?.pendingVendors || 0);
  const bookingsCount = Number(overview?.confirmedBookings || 0) + Number(overview?.pendingBookings || 0);
  const hasPlanningStarted = Boolean(venueLabel || hallLabel || servicesSelected || bookingsCount);
  const bookingCta = hasPlanningStarted ? 'Continue Planning' : 'Start Booking';

  return (
    <div className="mx-auto max-w-4xl">
      {justCreated ? (
        <p className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Wedding profile saved. Review the summary below, then start booking when you are ready.
        </p>
      ) : null}

      <PageHeader
        eyebrow="Our Wedding"
        title={wedding.weddingName}
        description={`${wedding.partner1Name} & ${wedding.partner2Name}`}
      />

      {wedding.isOwner && partnerRole ? (
        <InvitePartnerCard
          weddingId={wedding._id}
          weddingName={wedding.weddingName}
          partnerRole={partnerRole}
          existingInvite={partnerInvite}
        />
      ) : null}

      <JoinRequestsPanel weddingId={wedding._id} isOwner={wedding.isOwner} />

      <section className="mt-6 rounded-3xl border border-stone-100 bg-white p-6 shadow-sm sm:p-8 dark:border-stone-700 dark:bg-stone-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-600">Wedding Profile</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-stone-900 dark:text-stone-50">{wedding.weddingName}</h2>
          </div>
          <StatusBadge value={wedding.status || 'planning'} />
        </div>

        <dl className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Wedding Date</dt>
            <dd className="mt-1 flex items-center gap-2 text-base font-semibold text-stone-900 dark:text-stone-50">
              <FiCalendar className="text-brand-600" /> {formatWeddingDate(wedding.weddingDate)}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">City</dt>
            <dd className="mt-1 flex items-center gap-2 text-base font-semibold text-stone-900 dark:text-stone-50">
              <FiMapPin className="text-brand-600" /> {wedding.city || '—'}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Expected Guests</dt>
            <dd className="mt-1 flex items-center gap-2 text-base font-semibold text-stone-900 dark:text-stone-50">
              <FiUsers className="text-brand-600" /> {wedding.expectedGuests}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Estimated Budget</dt>
            <dd className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-50">{formatBudget(wedding.estimatedBudget)}</dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Planner</dt>
            <dd className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-50">{plannerName || 'Not Assigned'}</dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Venue</dt>
            <dd className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-50">
              {venueLabel ? `${venueLabel}${hallLabel ? ` · ${hallLabel}` : ''}` : 'Not Booked'}
            </dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Services</dt>
            <dd className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-50">{servicesSelected} Selected</dd>
          </div>
          <div className="rounded-2xl bg-stone-50 px-4 py-4 dark:bg-stone-800/60">
            <dt className="text-xs font-semibold uppercase tracking-wide text-stone-400">Bookings</dt>
            <dd className="mt-1 text-base font-semibold text-stone-900 dark:text-stone-50">{bookingsCount}</dd>
          </div>
        </dl>

        {wedding.description ? (
          <p className="mt-6 text-sm leading-6 text-stone-600 dark:text-stone-300">{wedding.description}</p>
        ) : null}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={`/weddings/${wedding._id}/bookings`}
            onClick={() => selectWedding(wedding._id)}
            className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <FiShoppingBag /> {bookingCta}
          </Link>
          <Link
            to={`/weddings/${wedding._id}/edit`}
            className="inline-flex items-center gap-2 rounded-full border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-100"
          >
            <FiEdit3 /> Edit Wedding
          </Link>
          <Link to="/weddings" className="rounded-full border border-stone-200 px-6 py-3 text-sm font-semibold text-stone-600 dark:border-stone-600">
            Our Wedding
          </Link>
        </div>
      </section>
    </div>
  );
}
