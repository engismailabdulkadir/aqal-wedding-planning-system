import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EmptyState, FilterBar, LoadingSkeleton, PageHeader, SearchBar, VenueCard, fieldClass } from '../../components/ui/index.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getBudget } from '../../services/budgetService.js';
import { getVenues } from '../../services/venueService.js';
import { getApiError } from '../../utils/apiError.js';

export default function VenuesPage() {
  const [params, setParams] = useSearchParams();
  const { activeWedding, activeWeddingId } = useActiveWedding();
  const [venues, setVenues] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [remainingBudget, setRemainingBudget] = useState(null);
  const [filters, setFilters] = useState({
    search: params.get('search') || '',
    city: params.get('city') || 'Mogadishu',
    district: params.get('district') || '',
    guests: params.get('guests') || '',
    date: params.get('date') || '',
    slotType: params.get('slotType') || '',
    maxPrice: params.get('maxPrice') || '',
    amenity: params.get('amenity') || '',
  });

  useEffect(() => {
    if (!activeWeddingId) return;
    getBudget(activeWeddingId).then((data) => setRemainingBudget(data.budget?.remainingBudget)).catch(() => setRemainingBudget(null));
  }, [activeWeddingId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const query = {
        search: filters.search || undefined,
        city: filters.city || undefined,
        district: filters.district || undefined,
        guests: filters.guests || undefined,
        date: filters.date || undefined,
        slotType: filters.slotType || undefined,
        maxPrice: filters.maxPrice || undefined,
        amenities: filters.amenity || undefined,
        expectedGuests: activeWedding?.expectedGuests || filters.guests || undefined,
        remainingBudget: remainingBudget ?? undefined,
        estimatedBudget: activeWedding?.estimatedBudget || undefined,
      };
      getVenues(query)
        .then((data) => {
          setVenues(data.venues || []);
          setDistricts(data.meta?.districts || []);
          setError('');
        })
        .catch((requestError) => setError(getApiError(requestError)))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [filters, activeWedding?.expectedGuests, activeWedding?.estimatedBudget, remainingBudget]);

  const contextNote = useMemo(() => {
    if (!activeWedding) return null;
    return `Planning for ${activeWedding.expectedGuests || '—'} guests${activeWedding.weddingDate ? ` · ${new Date(activeWedding.weddingDate).toLocaleDateString()}` : ''}${remainingBudget != null ? ` · remaining budget $${remainingBudget}` : ''}`;
  }, [activeWedding, remainingBudget]);

  function update(key, value) {
    const next = { ...filters, [key]: value };
    setFilters(next);
    const nextParams = new URLSearchParams();
    Object.entries(next).forEach(([field, fieldValue]) => {
      if (fieldValue) nextParams.set(field, fieldValue);
    });
    setParams(nextParams, { replace: true });
  }

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Venues" title="Wedding halls in Mogadishu" description={contextNote || 'Search by name, district, guest count, date, and amenities. Prices appear only when verified.'} />
      <FilterBar>
        <SearchBar value={filters.search} onChange={(value) => update('search', value)} placeholder="Search venue name" className="md:col-span-2" />
        <input value={filters.city} onChange={(event) => update('city', event.target.value)} placeholder="City" className={fieldClass} />
        <select value={filters.district} onChange={(event) => update('district', event.target.value)} className={fieldClass}>
          <option value="">All districts</option>
          {districts.map((district) => <option key={district}>{district}</option>)}
        </select>
        <input type="number" min="1" value={filters.guests} onChange={(event) => update('guests', event.target.value)} placeholder="Guest capacity" className={fieldClass} />
        <input type="date" value={filters.date} onChange={(event) => update('date', event.target.value)} className={fieldClass} />
        <select value={filters.slotType} onChange={(event) => update('slotType', event.target.value)} className={fieldClass}>
          <option value="">Any session</option>
          <option value="morning">Morning</option>
          <option value="evening">Evening</option>
          <option value="full_day">Full Day</option>
        </select>
        <input type="number" min="0" value={filters.maxPrice} onChange={(event) => update('maxPrice', event.target.value)} placeholder="Max price (published only)" className={fieldClass} />
        <select value={filters.amenity} onChange={(event) => update('amenity', event.target.value)} className={fieldClass}>
          <option value="">Amenities</option>
          <option>Parking</option>
          <option>Air Conditioning</option>
          <option>Stage</option>
          <option>Sound System</option>
          <option>Security</option>
          <option>Catering</option>
        </select>
      </FilterBar>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      {loading ? <LoadingSkeleton /> : venues.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {venues.map((venue) => <VenueCard key={venue._id} venue={venue} />)}
        </div>
      ) : <div className="mt-8"><EmptyState title="No venues match these filters" description="Try another district, date, or guest count." /></div>}
    </div>
  );
}
