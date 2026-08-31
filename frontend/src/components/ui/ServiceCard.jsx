import { Link } from 'react-router-dom';
import ListingImage from './ListingImage.jsx';
import StatusBadge from './StatusBadge.jsx';
import { SERVICE_LABELS } from '../../utils/media.js';
import { formatBudget } from '../../utils/weddingFormat.js';

function isHallListing(listing) {
  return listing.category === 'venue' || listing.category === 'hall';
}

export default function ServiceCard({ listing, inWorkspace = false, weddingId, onBookHall, onViewDetails }) {
  const price = listing.discountPrice ?? listing.price;
  const rental = listing.metadata?.rentalOrPurchase;
  const meta = listing.metadata || {};
  const isHall = isHallListing(listing);
  const workspaceListingPath = weddingId ? `/weddings/${weddingId}/bookings/listings/${listing._id}` : null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
      <div className="relative overflow-hidden bg-app-inset">
        <ListingImage listing={listing} className="h-48 w-full object-cover" />
        <span className="absolute left-3 top-3 rounded-full bg-app-surface px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-brand-700">
          {SERVICE_LABELS[listing.category] || listing.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold text-app-text">{listing.name}</h3>
        <p className="mt-1 text-sm text-app-muted">{listing.vendorProfile?.businessName}</p>
        {isHall ? (
          <div className="mt-3 space-y-1 text-sm text-app-muted">
            <p>{meta.district ? `${meta.district}, ` : ''}{listing.city}</p>
            <p>Capacity: {meta.capacity != null && meta.capacity !== '' ? `${meta.capacity} Guests` : 'Not specified'}</p>
            {meta.morningPrice != null && <p>Morning: {formatBudget(meta.morningPrice)}</p>}
            {meta.eveningPrice != null && <p>Evening: {formatBudget(meta.eveningPrice)}</p>}
            {meta.morningPrice != null && meta.eveningPrice != null && (
              <p>Full Day: {formatBudget(Number(meta.morningPrice) + Number(meta.eveningPrice))}</p>
            )}
          </div>
        ) : (
          <p className="mt-3 text-lg font-semibold text-app-text">{formatBudget(price)}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {rental ? <StatusBadge tone="info">{rental}</StatusBadge> : null}
          {listing.available ? <StatusBadge tone="success">Available</StatusBadge> : <StatusBadge tone="neutral">Unavailable</StatusBadge>}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {inWorkspace && isHall ? (
            <>
              <button
                type="button"
                onClick={() => onViewDetails?.(listing)}
                className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                View Details
              </button>
              <button
                type="button"
                onClick={() => onBookHall?.(listing)}
                className="inline-flex rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Book Hall
              </button>
            </>
          ) : inWorkspace && workspaceListingPath ? (
            <>
              <Link to={workspaceListingPath} className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                View Details
              </Link>
              <Link
                to={workspaceListingPath}
                className="inline-flex rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                Book Now
              </Link>
            </>
          ) : (
            <>
              <Link to={`/services/${listing._id}`} className="inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                View Details
              </Link>
              <Link
                to={`/services/${listing._id}`}
                className="inline-flex rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50"
              >
                {isHall ? 'Book Hall' : 'Book Now'}
              </Link>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
