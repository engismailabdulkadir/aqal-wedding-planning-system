import Modal from '../common/Modal.jsx';
import ModalFooter, { ModalCancelButton } from '../common/ModalFooter.jsx';
import ListingImage from '../ui/ListingImage.jsx';
import { formatBudget } from '../../utils/weddingFormat.js';
import { SERVICE_LABELS } from '../../utils/media.js';

export default function HallDetailsModal({ isOpen, onClose, listing, onBookHall }) {
  if (!listing) return null;

  const meta = listing.metadata || {};
  const isHall = listing.category === 'venue' || listing.category === 'hall';
  const morning = meta.morningPrice;
  const evening = meta.eveningPrice;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={listing.name}
      subtitle={listing.vendorProfile?.businessName || 'Venue'}
      size="lg"
      footer={(
        <ModalFooter>
          <ModalCancelButton onClick={onClose}>Close</ModalCancelButton>
          {isHall && onBookHall ? (
            <button
              type="button"
              onClick={() => onBookHall(listing)}
              className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Book Hall
            </button>
          ) : null}
        </ModalFooter>
      )}
    >
      <div className="space-y-5">
        <ListingImage listing={listing} className="h-48 w-full rounded-2xl object-cover" />
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-brand-50 px-3 py-1 font-semibold text-brand-700">
            {SERVICE_LABELS[listing.category] || listing.category}
          </span>
          {listing.available ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">Available</span>
          ) : (
            <span className="rounded-full bg-stone-100 px-3 py-1 font-semibold text-stone-600">Unavailable</span>
          )}
        </div>
        <p className="text-sm leading-7 text-stone-600">{listing.description || 'No description provided.'}</p>
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="font-semibold text-stone-500">Location</dt>
            <dd className="mt-1 text-stone-800">
              {meta.address ? `${meta.address}, ` : ''}
              {meta.district ? `${meta.district}, ` : ''}
              {listing.city || '—'}
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-stone-500">Capacity</dt>
            <dd className="mt-1 text-stone-800">
              {meta.capacity != null && meta.capacity !== '' ? `${meta.capacity} guests` : 'Not specified'}
            </dd>
          </div>
          {isHall && morning != null && (
            <div>
              <dt className="font-semibold text-stone-500">Morning</dt>
              <dd className="mt-1 text-stone-800">{formatBudget(morning)}</dd>
            </div>
          )}
          {isHall && evening != null && (
            <div>
              <dt className="font-semibold text-stone-500">Evening</dt>
              <dd className="mt-1 text-stone-800">{formatBudget(evening)}</dd>
            </div>
          )}
          {isHall && morning != null && evening != null && (
            <div>
              <dt className="font-semibold text-stone-500">Full Day</dt>
              <dd className="mt-1 text-stone-800">{formatBudget(Number(morning) + Number(evening))}</dd>
            </div>
          )}
        </dl>
      </div>
    </Modal>
  );
}
