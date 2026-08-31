import { FiCalendar, FiEdit3, FiHeart, FiMapPin, FiPlus, FiShoppingBag, FiUsers } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { LoadingState, PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { useCreateWedding } from '../../hooks/useCreateWedding.js';
import { formatBudget, formatWeddingDate } from '../../utils/weddingFormat.js';

function hasStartedPlanning(wedding) {
  return Boolean(wedding.selectedVenue || wedding.selectedHall || wedding.selectedSlot);
}

export default function MyWeddingsPage() {
  const { weddings, activeWeddingId, loading, selectWedding } = useActiveWedding();
  const { openCreateWedding } = useCreateWedding();

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Wedding Portfolio"
        title="My Weddings"
        description="Create a wedding profile first. Booking venues and services comes next."
        action={(
          <button type="button" onClick={openCreateWedding} className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
            <FiPlus /> Create New Wedding
          </button>
        )}
      />
      {loading ? <LoadingState /> : weddings.length ? (
        <div className="mt-7 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {weddings.map((wedding) => {
            const planningStarted = hasStartedPlanning(wedding);
            return (
              <article
                key={wedding._id}
                className={`rounded-2xl border bg-white p-6 shadow-sm dark:bg-stone-900 ${
                  wedding._id === activeWeddingId ? 'border-brand-300 ring-2 ring-brand-100' : 'border-stone-100 dark:border-stone-700'
                }`}
              >
                <div className="flex justify-between gap-2">
                  <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold capitalize text-brand-700">{wedding.status || 'planning'}</span>
                  {wedding._id === activeWeddingId ? <span className="text-xs font-semibold text-emerald-600">Current Wedding</span> : null}
                </div>
                <h2 className="mt-5 font-display text-2xl font-semibold">{wedding.weddingName}</h2>
                <p className="mt-3 flex items-center gap-2 text-sm text-stone-500"><FiCalendar />{formatWeddingDate(wedding.weddingDate)}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-stone-500"><FiUsers />{wedding.expectedGuests} Guests</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-stone-500"><FiMapPin />{wedding.city}</p>
                <p className="mt-2 text-sm font-semibold text-stone-700 dark:text-stone-200">Budget {formatBudget(wedding.estimatedBudget)}</p>
                <div className="mt-6 flex flex-wrap gap-2 border-t border-stone-100 pt-4 dark:border-stone-700">
                  <Link
                    to={`/weddings/${wedding._id}`}
                    onClick={() => selectWedding(wedding._id)}
                    className="rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold dark:border-stone-600"
                  >
                    View Wedding
                  </Link>
                  <Link
                    to={`/weddings/${wedding._id}/bookings`}
                    onClick={() => selectWedding(wedding._id)}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-brand-600 px-4 py-2 text-center text-sm font-semibold text-white"
                  >
                    <FiShoppingBag /> {planningStarted ? 'Continue Planning' : 'Start Booking'}
                  </Link>
                  <Link to={`/weddings/${wedding._id}/edit`} className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold dark:border-stone-600">
                    <FiEdit3 /> Edit
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="mt-8 rounded-2xl bg-white p-10 text-center shadow-sm dark:bg-stone-900">
          <FiHeart className="mx-auto text-4xl text-brand-300" />
          <h2 className="mt-4 text-xl font-semibold">You haven&apos;t created a wedding yet.</h2>
          <p className="mt-2 text-sm text-stone-500">Create your wedding profile first, or join your partner&apos;s wedding with an invite code.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button type="button" onClick={openCreateWedding} className="inline-flex rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">
              Create Your First Wedding
            </button>
            <Link to="/weddings/join" className="inline-flex rounded-full border border-stone-200 px-5 py-3 text-sm font-semibold text-stone-700 dark:border-stone-600">
              Join Existing Wedding
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
