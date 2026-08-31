import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FilterBar, LoadingSkeleton, PageHeader, SearchBar, ServiceCard, fieldClass } from '../../components/ui/index.js';
import { getListings } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { SERVICE_LABELS } from '../../utils/media.js';

export default function ServicesPage() {
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    category: params.get('category') || '',
    city: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    rentalOrPurchase: '',
    district: '',
    minCapacity: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: params.get('category') || '',
      search: params.get('search') || current.search,
    }));
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      getListings({
        search: filters.search || undefined,
        category: filters.category || undefined,
        city: filters.city || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        sort: filters.sort || undefined,
        rentalOrPurchase: filters.rentalOrPurchase || undefined,
        district: filters.district || undefined,
        minCapacity: filters.minCapacity || undefined,
      })
        .then(setData)
        .catch((requestError) => setError(getApiError(requestError)))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [filters]);

  return (
    <div className="mx-auto max-w-[1500px] px-4 py-10 sm:px-6">
      <PageHeader eyebrow="Wedding Marketplace" title="Wedding Services" description="Browse halls, bride and groom services, salons, flowers, catering, and more." />
      <FilterBar>
        <SearchBar value={filters.search} onChange={(value) => setFilters({ ...filters, search: value })} placeholder="Search wedding services..." className="md:col-span-2" />
        <select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })} className={fieldClass}>
          <option value="">All categories</option>
          {(data?.categories || Object.keys(SERVICE_LABELS)).map((category) => <option key={category} value={category}>{SERVICE_LABELS[category] || category}</option>)}
        </select>
        <input value={filters.city} onChange={(event) => setFilters({ ...filters, city: event.target.value })} placeholder="City" className={fieldClass} />
        <input value={filters.minPrice} onChange={(event) => setFilters({ ...filters, minPrice: event.target.value })} placeholder="Min price" type="number" className={fieldClass} />
        <input value={filters.maxPrice} onChange={(event) => setFilters({ ...filters, maxPrice: event.target.value })} placeholder="Max price" type="number" className={fieldClass} />
        {(filters.category === 'venue' || filters.category === 'hall') && (
          <>
            <input value={filters.district} onChange={(event) => setFilters({ ...filters, district: event.target.value })} placeholder="District" className={fieldClass} />
            <input value={filters.minCapacity} onChange={(event) => setFilters({ ...filters, minCapacity: event.target.value })} placeholder="Min capacity" type="number" className={fieldClass} />
          </>
        )}
        <select value={filters.rentalOrPurchase} onChange={(event) => setFilters({ ...filters, rentalOrPurchase: event.target.value })} className={fieldClass}>
          <option value="">Rental / Purchase</option>
          <option value="rental">Rental</option>
          <option value="purchase">Purchase</option>
        </select>
        <select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })} className={fieldClass}>
          <option value="newest">Newest</option>
          <option value="price_asc">Price Low to High</option>
          <option value="price_desc">Price High to Low</option>
        </select>
      </FilterBar>
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      {loading ? <LoadingSkeleton /> : data?.listings?.length ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {data.listings.map((listing) => <ServiceCard key={listing._id} listing={listing} />)}
        </div>
      ) : <div className="mt-8 rounded-2xl border border-stone-100 bg-white p-10 text-center text-stone-500">No wedding services available yet.</div>}
    </div>
  );
}
