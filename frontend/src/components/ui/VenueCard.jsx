import { Link } from 'react-router-dom';
import { FiMapPin, FiUsers } from 'react-icons/fi';
import StatusBadge from './StatusBadge.jsx';
import VenueImage from './VenueImage.jsx';
import { venueCover } from '../../utils/media.js';

export default function VenueCard({ venue, to, match, compact = false }) {
  const flags = match || venue.match || {};
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-sm">
      <VenueImage
        src={venueCover(venue)}
        alt={venue.name}
        entity={venue}
        className={compact ? 'h-40 w-full object-cover' : 'h-52 w-full object-cover'}
      />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-semibold text-app-text">{venue.name}</h3>
        <p className="mt-2 flex items-start gap-1.5 text-sm text-app-muted">
          <FiMapPin className="mt-0.5 shrink-0" />
          {[venue.district, venue.city].filter(Boolean).join(', ') || venue.location}
        </p>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-app-muted">
          <FiUsers /> {venue.capacityLabel || 'Capacity on request'}
        </p>
        <p className="mt-3 text-base font-semibold text-app-text">
          {venue.quoteRequired || !venue.priceAmount ? 'Request Quote' : venue.priceLabel}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {flags.capacity === 'suitable' ? <StatusBadge tone="success">Suitable for your guest count</StatusBadge> : null}
          {flags.capacity === 'not_suitable' ? <StatusBadge tone="danger">{`Not suitable — capacity ${venue.capacityMax || 'limited'}`}</StatusBadge> : null}
          {flags.availability === 'available' ? <StatusBadge tone="success">Available</StatusBadge> : null}
          {flags.availability === 'booked' ? <StatusBadge tone="danger">Booked</StatusBadge> : null}
          {flags.budget === 'within' ? <StatusBadge tone="success">Within budget</StatusBadge> : null}
          {flags.budget === 'over' ? <StatusBadge tone="danger">Over budget</StatusBadge> : null}
          {!venue.bookable ? <StatusBadge tone="warning">Quote to book</StatusBadge> : null}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to={to || `/venues/${venue._id}`} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            View Venue
          </Link>
          <Link to={to || `/venues/${venue._id}`} className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700">
            Check Availability
          </Link>
        </div>
      </div>
    </article>
  );
}
