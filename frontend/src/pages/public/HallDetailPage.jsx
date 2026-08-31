import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PageHeader, VenueImage } from '../../components/ui/index.js';
import { getHall } from '../../services/venueService.js';
import { getApiError } from '../../utils/apiError.js';
import { venueCover } from '../../utils/media.js';

export default function HallDetailPage() {
  const { id } = useParams();
  const [hall, setHall] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getHall(id)
      .then((data) => setHall(data.hall))
      .catch((requestError) => setError(getApiError(requestError)));
  }, [id]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Hall not found</h1>
        <p className="mt-3 text-sm text-stone-600">{error}</p>
        <Link to="/halls" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">Back to Halls</Link>
      </div>
    );
  }

  if (!hall) return <p className="p-8 text-stone-400">Loading hall…</p>;

  const venueId = hall.venue?._id || hall.venue;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link to="/halls" className="text-sm font-semibold text-brand-700">← Halls</Link>
      <div className="mt-4 overflow-hidden rounded-3xl border border-stone-100 shadow-sm">
        <VenueImage src={hall.coverImage || venueCover(hall.venue)} alt={hall.hallName} entity={hall.venue} className="h-64 w-full object-cover" width={1400} />
      </div>
      <PageHeader eyebrow={hall.venue?.name} title={hall.hallName} description={`${hall.capacity} guests · ${hall.venue?.city || ''}`} />
      {hall.description ? <p className="mt-4 text-stone-600">{hall.description}</p> : null}
      <Link to={venueId ? `/venues/${venueId}` : '/venues'} className="mt-8 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">
        Check availability
      </Link>
    </div>
  );
}
