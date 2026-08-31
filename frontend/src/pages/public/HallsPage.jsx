import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, VenueImage } from '../../components/ui/index.js';
import { getHalls } from '../../services/venueService.js';
import { getApiError } from '../../utils/apiError.js';
import { venueCover } from '../../utils/media.js';

export default function HallsPage() {
  const [halls, setHalls] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getHalls().then((data) => setHalls(data.halls || [])).catch((requestError) => setError(getApiError(requestError)));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <PageHeader eyebrow="Halls" title="Independent banquet halls" description="Each hall is booked on its own date and time slot. Reserving Hall A never blocks Hall C in the same hotel." />
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {halls.map((hall) => (
          <article key={hall._id} className="overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm">
            <VenueImage src={hall.coverImage || venueCover(hall.venue)} alt={hall.hallName} entity={hall.venue} className="h-40 w-full object-cover" />
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{hall.venue?.name}</p>
              <h2 className="mt-2 font-display text-2xl font-semibold">{hall.hallName}</h2>
              <p className="mt-2 text-sm text-stone-500">{hall.capacity} guests · {hall.venue?.city}</p>
              <Link to={`/halls/${hall._id}`} className="mt-5 inline-block text-sm font-semibold text-brand-700">View hall</Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
