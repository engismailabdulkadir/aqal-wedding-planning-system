import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ValidationRecoveryPanel from '../../components/validation/ValidationRecoveryPanel.jsx';
import AvailabilityGrid from '../../components/venue/AvailabilityGrid.jsx';
import { PageHeader, StatusBadge, VenueImage, fieldClass } from '../../components/ui/index.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getVenue, getVenueAvailability, holdHallBooking, requestHallQuote } from '../../services/venueService.js';
import { getApiError, parseApiError } from '../../utils/apiError.js';
import { venueCover } from '../../utils/media.js';
import { buildVenueReturnPath, buildWeddingEditPath } from '../../utils/returnTo.js';
import { formatBudget, formatWeddingDate } from '../../utils/weddingFormat.js';

const AMENITY_KEYS = [
  ['parking', 'Parking'],
  ['airConditioning', 'Air Conditioning'],
  ['stage', 'Stage'],
  ['soundSystem', 'Sound System'],
  ['security', 'Security'],
  ['catering', 'Catering'],
];

export default function VenueDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { activeWedding, activeWeddingId } = useActiveWedding();
  const [venue, setVenue] = useState(null);
  const [halls, setHalls] = useState([]);
  const [hero, setHero] = useState('');
  const [date, setDate] = useState(searchParams.get('date') || location.state?.date || '');
  const [grid, setGrid] = useState(null);
  const [selected, setSelected] = useState(location.state?.selected || null);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(null);
  const [hold, setHold] = useState(null);
  const [quoteNotice, setQuoteNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(location.state?.message || '');

  const returnPath = buildVenueReturnPath(id, { date });
  const weddingDateKey = activeWedding?.weddingDate
    ? new Date(new Date(activeWedding.weddingDate).getTime() - new Date(activeWedding.weddingDate).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
    : '';

  useEffect(() => {
    if (!weddingDateKey) return;
    setDate(weddingDateKey);
  }, [weddingDateKey]);

  useEffect(() => {
    getVenue(id)
      .then((data) => {
        setVenue(data.venue);
        setHalls(data.halls || data.venue?.halls || []);
        setHero(venueCover(data.venue));
      })
      .catch((requestError) => setError(getApiError(requestError)));
  }, [id]);

  useEffect(() => {
    if (!date) return;
    const context = activeWedding
      ? { expectedGuests: activeWedding.expectedGuests, estimatedBudget: activeWedding.estimatedBudget }
      : {};
    getVenueAvailability(id, date, context)
      .then(setGrid)
      .catch((requestError) => setError(getApiError(requestError)));
  }, [id, date, activeWedding?.expectedGuests, activeWedding?.estimatedBudget]);

  useEffect(() => {
    if (location.state?.revalidateHall && date) {
      const context = activeWedding
        ? { expectedGuests: activeWedding.expectedGuests, estimatedBudget: activeWedding.estimatedBudget }
        : {};
      getVenueAvailability(id, date, context).then(setGrid).catch((requestError) => setError(getApiError(requestError)));
      setSelected(location.state?.selected || null);
      setHold(null);
      setRecovery(null);
    }
  }, [location.state?.revalidateHall]);

  function showCapacityRecovery(hall) {
    if (!activeWedding) return;
    setRecovery({
      code: 'HALL_CAPACITY_EXCEEDED',
      message: `This hall supports ${hall.capacity} guests, but your Wedding has ${activeWedding.expectedGuests} expected guests.`,
      details: {
        expectedGuests: activeWedding.expectedGuests,
        hallCapacity: hall.capacity,
        hallName: hall.hallName,
        hallId: hall.hallId,
      },
    });
  }

  async function reserve() {
    setBusy(true);
    setError('');
    setRecovery(null);
    try {
      const data = await holdHallBooking({ hall: selected.hallId, date, slotType: selected.slot }, activeWeddingId);
      setHold(data.booking);
    } catch (requestError) {
      const parsed = parseApiError(requestError);
      if (parsed.code) setRecovery(parsed);
      else setError(parsed.message);
    } finally {
      setBusy(false);
    }
  }

  async function requestQuote() {
    if (!activeWeddingId || !selected) return;
    setBusy(true);
    setError('');
    setQuoteNotice('');
    setRecovery(null);
    try {
      const result = await requestHallQuote({
        hall: selected.hallId,
        slotType: selected.slot,
      }, activeWeddingId);
      setQuoteNotice(result.message || 'Quote request sent. The venue will respond with total price and deposit.');
      setNotice('');
    } catch (requestError) {
      const parsed = parseApiError(requestError);
      if (parsed.code === 'HALL_CAPACITY_EXCEEDED' || parsed.code === 'HALL_CAPACITY_BELOW_MINIMUM') {
        setRecovery(parsed);
      } else {
        setError(parsed.message);
      }
    } finally {
      setBusy(false);
    }
  }

  function goEdit(focus) {
    navigate(buildWeddingEditPath(activeWeddingId, { returnTo: returnPath, focus }), {
      state: { returnState: { date, selected } },
    });
  }

  if (!venue && !error) return <p className="p-8 text-stone-400">Loading venue…</p>;
  if (!venue) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Venue not found</h1>
        <p className="mt-3 text-sm text-stone-600">{error}</p>
        <Link to="/venues" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">Back to venues</Link>
      </div>
    );
  }

  const gallery = venue.galleryImages?.length ? venue.galleryImages : [venueCover(venue)];
  const amenities = venue.amenityList?.length
    ? venue.amenityList
    : AMENITY_KEYS.filter(([key]) => venue[key]).map(([, label]) => label);
  const acceptsQuotes = Boolean(grid?.venue?.acceptsQuotes ?? venue.acceptsQuotes);
  const canReserve = selected && acceptsQuotes && venue.bookable && !selected.quoteRequired && Number(selected.price) > 0;
  const canRequestQuote = Boolean(selected && activeWeddingId && acceptsQuotes && !canReserve && selected.requestable !== false);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/venues" className="text-sm font-semibold text-brand-700">← Venues</Link>
      <div className="mt-4 overflow-hidden rounded-[2rem] border border-stone-100 bg-white shadow-sm">
        <VenueImage src={hero} alt={venue.name} entity={venue} className="h-[42vh] min-h-64 w-full object-cover" width={1600} />
        {gallery.length > 1 ? (
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-4">
            {gallery.slice(0, 8).map((image) => (
              <button key={image} type="button" onClick={() => setHero(image)} className="overflow-hidden rounded-xl">
                <img src={image} alt="" loading="lazy" className="h-20 w-full object-cover sm:h-24" />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_.8fr]">
        <div>
          <PageHeader title={venue.name} description={`${venue.district ? `${venue.district}, ` : ''}${venue.city}`} />
          <p className="mt-3 text-stone-600">{venue.location || venue.address}</p>
          {venue.description ? <p className="mt-5 leading-7 text-stone-600">{venue.description}</p> : null}
          <div className="mt-6 flex flex-wrap gap-2">
            <StatusBadge tone="info">{venue.capacityLabel}</StatusBadge>
            <StatusBadge tone={acceptsQuotes ? (venue.quoteRequired ? 'warning' : 'success') : 'warning'}>
              {acceptsQuotes ? venue.priceLabel : 'Not Available Yet'}
            </StatusBadge>
            {acceptsQuotes ? (
              venue.bookable
                ? <StatusBadge tone="success">Online booking</StatusBadge>
                : <StatusBadge tone="warning">Request quote to book</StatusBadge>
            ) : (
              <StatusBadge tone="warning">Quotes unavailable</StatusBadge>
            )}
          </div>
          {amenities.length ? (
            <div className="mt-8">
              <h2 className="font-display text-2xl font-semibold">Amenities</h2>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {amenities.map((item) => <li key={item} className="rounded-xl border border-stone-100 bg-white px-4 py-3 text-sm">{item}</li>)}
              </ul>
            </div>
          ) : null}
          {halls.length ? (
            <div className="mt-8">
              <h2 className="font-display text-2xl font-semibold">Hall options</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {halls.map((hall) => (
                  <article key={hall._id} className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm">
                    <h3 className="font-semibold text-stone-900">{hall.hallName}</h3>
                    <p className="mt-1 text-sm text-stone-500">Up to {hall.capacity} guests</p>
                    {hall.description ? <p className="mt-2 text-sm text-stone-600">{hall.description}</p> : null}
                    {acceptsQuotes && (hall.quoteRequired || hall.priceStatus === 'quote_required') ? (
                      <p className="mt-3 text-sm font-semibold text-brand-700">Request Quote</p>
                    ) : !acceptsQuotes ? (
                      <p className="mt-3 text-sm font-semibold text-stone-500">Not Available Yet</p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          ) : null}
          {venue.vendorProfile?.businessName ? (
            <p className="mt-8 text-sm text-stone-500">Managed by {venue.vendorProfile.businessName}</p>
          ) : (
            <p className="mt-8 text-sm text-stone-500">This listing is currently unclaimed. Admin can later link it to a verified vendor.</p>
          )}
        </div>
        <aside className="h-fit rounded-2xl border border-stone-100 bg-white p-6 shadow-sm">
          <h2 className="font-display text-2xl font-semibold">Plan this venue</h2>
          <p className="mt-2 text-sm text-stone-500">Capacity {venue.capacityLabel}</p>
          {venue.priceLabel && acceptsQuotes ? <p className="mt-1 text-lg font-semibold">{venue.priceLabel}</p> : (
            <p className="mt-1 text-lg font-semibold text-brand-700">{acceptsQuotes ? 'Quote-based pricing' : 'Not Available Yet'}</p>
          )}
          {activeWedding ? (
            <p className="mt-4 text-sm text-stone-600">Planning for {activeWedding.weddingName} · {activeWedding.expectedGuests} guests</p>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Create a wedding to reserve a hall.</p>
          )}
          <a href="#availability" className="mt-6 block rounded-full bg-brand-600 px-5 py-3 text-center text-sm font-semibold text-white">Check Availability</a>
          <p className="mt-3 text-center text-sm text-stone-500">
            {acceptsQuotes
              ? 'Select a hall and slot below, then request a professional quote.'
              : (venue.quoteUnavailableReason || 'This venue is not currently accepting quote requests.')}
          </p>
        </aside>
      </div>

      {notice ? <p className="mt-6 rounded-xl bg-emerald-50 p-3 text-emerald-700">{notice}</p> : null}
      {quoteNotice ? (
        <div className="mt-6 rounded-xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-900">
          <p className="font-semibold">Quote request submitted</p>
          <p className="mt-1">{quoteNotice}</p>
          <Link to="/quotes" className="mt-3 inline-flex font-semibold text-brand-700">View my quotes →</Link>
        </div>
      ) : null}
      {location.state?.warnings?.length > 0 && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Please review after your update:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {location.state.warnings.map((warning) => <li key={warning.code + warning.message}>{warning.message}</li>)}
          </ul>
        </div>
      )}
      {error ? <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      {recovery ? (
        <div className="mt-4">
          <ValidationRecoveryPanel
            error={recovery}
            onChooseAnotherHall={() => { setRecovery(null); setSelected(null); setHold(null); }}
            onUpdateGuestCount={() => goEdit('expectedGuests')}
            onUpdateBudget={() => goEdit('estimatedBudget')}
            onChooseAnotherSlot={() => { setRecovery(null); setSelected(null); }}
            onChooseAnotherDate={() => { setRecovery(null); setSelected(null); if (activeWeddingId) navigate(`/weddings/${activeWeddingId}/bookings`); }}
            onDismiss={() => setRecovery(null)}
          />
        </div>
      ) : null}

      <div id="availability" className="mt-10">
        <h2 className="font-display text-2xl font-semibold">Availability calendar</h2>
        {activeWedding ? (
          <div className="mt-4 max-w-md rounded-2xl border border-stone-100 bg-stone-50 p-4 dark:border-stone-700 dark:bg-stone-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Wedding Date</p>
            <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">{formatWeddingDate(activeWedding.weddingDate)}</p>
            <p className="mt-1 text-sm text-stone-500">Hall booking uses this date automatically from your wedding profile.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link to={`/weddings/${activeWeddingId}/bookings`} className="text-sm font-semibold text-brand-700">Change Wedding Date</Link>
              <span className="text-stone-300">·</span>
              <p className="text-sm text-stone-500">Then choose Venue, Hall, and Morning / Evening / Full Day</p>
            </div>
          </div>
        ) : (
          <label className="mt-4 block max-w-xs text-sm font-medium">Wedding date
            <input type="date" value={date} onChange={(event) => { setDate(event.target.value); setSelected(null); setHold(null); setRecovery(null); }} className={`mt-1 ${fieldClass}`} />
          </label>
        )}
        <div className="mt-6">
          <AvailabilityGrid
            venueName={venue.name}
            halls={grid?.halls || []}
            selected={selected}
            onSelect={setSelected}
            expectedGuests={activeWedding?.expectedGuests}
            recommendations={grid?.recommendations || []}
            onWhyCantSelect={showCapacityRecovery}
            acceptsQuotes={acceptsQuotes}
          />
        </div>
        {selected && !hold && canReserve ? (
          <button disabled={busy || !activeWeddingId} onClick={reserve} className="mt-5 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50">
            Select for Wedding · {selected.hallName} {selected.slot}
          </button>
        ) : null}
        {selected && !hold && canRequestQuote ? (
          <button
            disabled={busy || !activeWeddingId}
            onClick={requestQuote}
            className="mt-5 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            Request Quote · {selected.hallName} · {selected.slot}
          </button>
        ) : null}
        {selected && !acceptsQuotes ? (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            <p className="font-semibold">Not Available Yet</p>
            <p className="mt-1">{venue.quoteUnavailableReason || grid?.venue?.quoteUnavailableReason || 'This venue is not currently accepting quote requests.'}</p>
          </div>
        ) : null}
        {selected && acceptsQuotes && !canReserve && !canRequestQuote ? (
          <p className="mt-5 rounded-2xl bg-brand-50 p-5 text-sm text-brand-800">Create or select a wedding profile before requesting a hall quote.</p>
        ) : null}
        {hold ? (
          <div className="mt-5 rounded-2xl bg-amber-50 p-5">
            <p className="font-semibold text-amber-900">Temporarily reserved until {new Date(hold.holdExpiresAt).toLocaleTimeString()}</p>
            <button disabled={busy} onClick={() => navigate(`/payments?booking=${hold._id}`)} className="mt-3 rounded-full bg-brand-600 px-5 py-2 text-sm font-semibold text-white">Continue to payment</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
