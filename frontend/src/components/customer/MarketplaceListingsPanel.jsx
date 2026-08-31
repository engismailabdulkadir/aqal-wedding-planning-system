import { useEffect, useState } from 'react';
import HallBookingModal from './HallBookingModal.jsx';
import HallDetailsModal from './HallDetailsModal.jsx';
import { LoadingState } from './PageState.jsx';
import { SearchBar, ServiceCard } from '../ui/index.js';
import { getListings } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { showSuccess } from '../../utils/alerts.js';
import { MARKETPLACE_FILTERS, marketplaceEmptyMessage } from '../../utils/marketplaceCategories.js';

export default function MarketplaceListingsPanel({
  title = 'Wedding Marketplace',
  description = 'Browse active vendor listings. Both partners see the same services.',
  showSearch = true,
  className = '',
  inWorkspace = false,
  weddingId,
  weddingDate,
  onBookingComplete,
}) {
  const [listings, setListings] = useState([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailsListing, setDetailsListing] = useState(null);
  const [bookingListing, setBookingListing] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getListings({
        category: category === 'all' ? undefined : category,
        search: search.trim() || undefined,
      })
        .then((data) => {
          setListings(data.listings || []);
          setError('');
        })
        .catch((err) => {
          setListings([]);
          setError(getApiError(err));
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [category, search]);

  function openBookHall(listing) {
    setDetailsListing(null);
    setBookingListing(listing);
  }

  async function handleBookingSuccess(result) {
    await showSuccess(
      'Booking request submitted',
      result?.message || 'Waiting for vendor confirmation.',
    );
    onBookingComplete?.(result);
  }

  return (
    <section className={className}>
      <div className="mb-5">
        <h2 className="font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </div>

      {showSearch ? (
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search vendor listings..."
          className="mb-4 max-w-xl"
        />
      ) : null}

      <div className="flex flex-wrap gap-2">
        {MARKETPLACE_FILTERS.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setCategory(filter.key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              category === filter.key
                ? 'bg-brand-600 text-white'
                : 'border border-stone-200 bg-white text-stone-700 hover:border-brand-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      {loading ? (
        <div className="mt-6"><LoadingState /></div>
      ) : listings.length ? (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {listings.map((listing) => (
            <ServiceCard
              key={listing._id}
              listing={listing}
              inWorkspace={inWorkspace}
              weddingId={weddingId}
              onBookHall={inWorkspace ? openBookHall : undefined}
              onViewDetails={inWorkspace ? setDetailsListing : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-200 bg-white p-10 text-center dark:border-stone-700 dark:bg-stone-900">
          <p className="text-sm text-stone-500">{marketplaceEmptyMessage(category)}</p>
        </div>
      )}
      {inWorkspace ? (
        <>
          <HallDetailsModal
            isOpen={Boolean(detailsListing)}
            onClose={() => setDetailsListing(null)}
            listing={detailsListing}
            onBookHall={openBookHall}
          />
          <HallBookingModal
            isOpen={Boolean(bookingListing)}
            onClose={() => setBookingListing(null)}
            listing={bookingListing}
            weddingId={weddingId}
            defaultDate={weddingDate}
            onSuccess={handleBookingSuccess}
          />
        </>
      ) : null}
    </section>
  );
}
