import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ErrorState, LoadingState } from '../../components/customer/PageState.jsx';
import ValidationRecoveryPanel from '../../components/validation/ValidationRecoveryPanel.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getBudget } from '../../services/budgetService.js';
import { createAppointment, createRental, createSelection, getListing, getListingAvailability, bookHall } from '../../services/planningService.js';
import { addToCart, getHallSlots } from '../../services/cartService.js';
import { useWeddingCart } from '../../context/CartContext.jsx';
import { confirmAction } from '../../utils/alerts.js';
import { getApiError, parseApiError } from '../../utils/apiError.js';
import { buildWeddingEditPath } from '../../utils/returnTo.js';
import { formatBudget } from '../../utils/weddingFormat.js';
import ListingImage from '../../components/ui/ListingImage.jsx';
import BookingAccessGate from '../../components/forms/BookingAccessGate.jsx';
import { SERVICE_LABELS } from '../../utils/media.js';

function formatBookingDate(dateStr) {
  if (!dateStr) return '';
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function slotLabel(slot) {
  if (slot === 'morning') return 'Morning';
  if (slot === 'evening') return 'Evening';
  if (slot === 'full_day') return 'Full Day';
  return slot;
}
function serviceBudgetMessage(category) {
  if (category === 'videography') return 'This videography package exceeds your remaining wedding budget.';
  if (category === 'photography') return 'This photography package exceeds your remaining wedding budget.';
  if (category === 'catering') return 'This catering package exceeds your remaining wedding budget.';
  return 'This service exceeds your remaining wedding budget.';
}

export default function ServiceDetailsPage({ layout = 'catalog', weddingId: weddingIdProp } = {}) {
  const { id, weddingId: routeWeddingId } = useParams();
  const navigate = useNavigate();
  const workspaceWeddingId = weddingIdProp || routeWeddingId;
  const isWorkspace = layout === 'workspace' && workspaceWeddingId;
  const backPath = isWorkspace ? `/weddings/${workspaceWeddingId}/bookings` : '/services';
  const backLabel = isWorkspace ? '← Back to Booking Center' : '← Back to services';
  const { activeWeddingId, activeWedding } = useActiveWedding();
  const [listing, setListing] = useState(null);
  const [budget, setBudget] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [guestCount, setGuestCount] = useState(100);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [rentalStart, setRentalStart] = useState('');
  const [rentalEnd, setRentalEnd] = useState('');
  const [availability, setAvailability] = useState(null);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cartSaving, setCartSaving] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [timeSlot, setTimeSlot] = useState('');
  const [hallSlots, setHallSlots] = useState(null);
  const { refreshCart } = useWeddingCart();

  useEffect(() => {
    getListing(id).then((x) => setListing(x.listing)).catch((e) => setError(getApiError(e))).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!activeWedding) return;
    if (Number(activeWedding.expectedGuests) > 0) setGuestCount(Number(activeWedding.expectedGuests));
    const weddingDay = activeWedding.weddingDate
      ? new Date(new Date(activeWedding.weddingDate).getTime() - new Date(activeWedding.weddingDate).getTimezoneOffset() * 60000).toISOString().slice(0, 10)
      : '';
    if (weddingDay) setDate((current) => current || weddingDay);
  }, [activeWedding]);

  useEffect(() => {
    if (!activeWeddingId) return;
    getBudget(activeWeddingId).then((data) => setBudget(data.budget)).catch(() => setBudget(null));
  }, [activeWeddingId]);

  useEffect(() => {
    if (!listing) return;
    const params = listing.availabilityType === 'appointment' && date ? { date }
      : listing.availabilityType === 'rental_period' && rentalStart && rentalEnd ? { start: rentalStart, end: rentalEnd }
        : listing.availabilityType === 'inventory' && rentalStart ? { start: rentalStart, end: rentalEnd || rentalStart }
          : date ? { date } : {};
    if (!Object.keys(params).length) return;
    getListingAvailability(id, params).then(setAvailability).catch(() => setAvailability(null));
  }, [listing, id, date, rentalStart, rentalEnd]);

  const isHall = listing && (listing.category === 'venue' || listing.category === 'hall') && listing.availabilityType === 'slot';

  useEffect(() => {
    if (!isHall) return;
    setHallSlots(null);
    setAvailabilityChecked(false);
    setTimeSlot('');
  }, [isHall, date]);

  const price = listing ? (listing.discountPrice ?? listing.price) : 0;
  const qty = listing && (listing.category === 'catering' || listing.availabilityType === 'capacity') ? guestCount : quantity;
  const serviceTotal = Number(price) * Number(qty || 1);
  const remainingBudget = Number(budget?.remainingBudget ?? 0);
  const overBudgetBy = serviceTotal - remainingBudget;
  const isOverBudget = Boolean(budget) && serviceTotal > remainingBudget;
  const allowOverBudget = false;

  const budgetError = listing && isOverBudget ? {
    code: 'BUDGET_EXCEEDED',
    message: serviceBudgetMessage(listing.category),
    details: {
      itemKind: listing.category === 'hall' ? 'hall' : 'service',
      category: listing.category,
      servicePrice: serviceTotal,
      remainingBudget,
      overBy: overBudgetBy,
    },
  } : recovery;

  function goIncreaseBudget() {
    navigate(buildWeddingEditPath(activeWeddingId, {
      returnTo: isWorkspace ? `/weddings/${workspaceWeddingId}/bookings/listings/${id}` : `/services/${id}`,
      focus: 'estimatedBudget',
    }));
  }

  const select = async (replace = false, confirmOverBudget = false) => {
    if (isOverBudget && !allowOverBudget && !confirmOverBudget) return;
    if (isOverBudget && allowOverBudget && !confirmOverBudget) {
      const ok = await confirmAction({
        title: 'This service exceeds your remaining budget',
        text: `${serviceBudgetMessage(listing.category)} Service price: ${formatBudget(serviceTotal)}. Remaining: ${formatBudget(remainingBudget)}. Over by: ${formatBudget(overBudgetBy)}.`,
        confirmButtonText: 'Continue anyway',
        danger: true,
      });
      if (!ok) return;
      return select(replace, true);
    }
    try {
      setError('');
      setRecovery(null);
      await createSelection({
        listing: id,
        quantity: listing.category === 'catering' ? guestCount : quantity,
        guestCount,
        replace,
        confirmOverBudget,
      }, activeWeddingId);
      navigate('/selections', { state: { message: 'Service selected successfully.' } });
    } catch (e) {
      const parsed = parseApiError(e);
      if (e.response?.status === 409 && listing.category === 'hall') {
        const replaceHall = await confirmAction({
          title: 'Replace current hall?',
          text: parsed.message,
          confirmButtonText: 'Replace Hall',
          danger: true,
        });
        if (replaceHall) return select(true, confirmOverBudget);
      }
      if (parsed.code === 'BUDGET_EXCEEDED') {
        setRecovery(parsed);
        return;
      }
      setError(parsed.message);
    }
  };

  const bookAppointment = async () => {
    if (isOverBudget && !allowOverBudget) return;
    try {
      await createAppointment({ listing: id, date, time }, activeWeddingId);
      navigate('/selections', { state: { message: 'Appointment reserved.' } });
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const bookRental = async () => {
    if (isOverBudget && !allowOverBudget) return;
    try {
      await createRental({ listing: id, rentalStart, rentalEnd, quantity }, activeWeddingId);
      navigate('/selections', { state: { message: 'Rental reserved.' } });
    } catch (e) {
      setError(getApiError(e));
    }
  };

  const addToWeddingCart = async () => {
    setCartSaving(true);
    setError('');
    try {
      await addToCart({
        listingId: id,
        bookingDate: isHall ? date : (date || activeWedding?.weddingDate),
        timeSlot: isHall ? timeSlot : undefined,
        quantity: isHall ? 1 : quantity,
      }, activeWeddingId);
      await refreshCart();
      navigate('/wedding-cart');
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setCartSaving(false);
    }
  };

  const checkAvailability = async () => {
    if (!date) return;
    setCheckingAvailability(true);
    setError('');
    try {
      const data = await getHallSlots(id, date);
      setHallSlots(data);
      setAvailabilityChecked(true);
      if (timeSlot && !data?.slots?.[timeSlot]) setTimeSlot('');
    } catch (e) {
      setHallSlots(null);
      setAvailabilityChecked(false);
      setError(getApiError(e));
    } finally {
      setCheckingAvailability(false);
    }
  };

  const submitHallBooking = async () => {
    if (!date || !timeSlot || !availabilityChecked) return;
    setBookingSaving(true);
    setError('');
    try {
      const result = await bookHall({
        listingId: id,
        bookingDate: date,
        timeSlot,
      }, activeWeddingId);
      navigate('/bookings', { state: { message: result.message || 'Hall booking request submitted.' } });
    } catch (e) {
      setError(getApiError(e));
    } finally {
      setBookingSaving(false);
    }
  };

  const meta = listing?.metadata || {};
  const hallPrice = isHall && timeSlot && hallSlots?.prices ? hallSlots.prices[timeSlot] : null;

  if (loading) return <LoadingState />;
  if (!listing) return <ErrorState message={error} />;

  const selectDisabled = isOverBudget && !allowOverBudget;
  const showSelect = listing.availabilityType === 'none' || listing.availabilityType === 'date' || listing.availabilityType === 'capacity';

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={backPath} className="text-sm font-semibold text-brand-700">{backLabel}</Link>
      {budgetError && (
        <div className="mt-5">
          <ValidationRecoveryPanel
            error={budgetError}
            onChooseAnotherService={() => navigate(backPath)}
            onIncreaseBudget={goIncreaseBudget}
            onUpdateBudget={goIncreaseBudget}
            onDismiss={() => setRecovery(null)}
          />
        </div>
      )}
      <div className="mt-5 overflow-hidden rounded-3xl border border-stone-100 bg-white shadow-sm">
        <ListingImage listing={listing} className="h-64 w-full object-cover" />
        <div className="grid gap-6 p-7 md:grid-cols-[1fr_280px]">
        <main>
          <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">{SERVICE_LABELS[listing.category] || listing.category.replaceAll('_', ' ')}</span>
          <h1 className="mt-4 font-display text-4xl font-semibold">{listing.name}</h1>
          <p className="mt-2 text-stone-500">{listing.vendorProfile?.businessName} · {listing.city}</p>
          <p className="mt-6 leading-7 text-stone-600">{listing.description || 'No description provided.'}</p>
          {isHall && (
            <p className="mt-4 text-sm text-stone-600">
              Capacity: {meta.capacity != null && meta.capacity !== '' ? `${meta.capacity} guests` : 'Not specified'}
            </p>
          )}
          {listing.metadata?.packageIncludes?.length ? (
            <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-stone-600">
              {listing.metadata.packageIncludes.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ) : null}
        </main>
        <aside className="rounded-2xl bg-brand-50 p-5">
          <p className="text-sm text-stone-500">Price</p>
          <p className="mt-1 text-3xl font-semibold text-brand-800">
            {isHall && hallPrice != null ? formatBudget(hallPrice) : formatBudget(price)}
          </p>
          {isHall && meta.morningPrice != null && (
            <div className="mt-3 space-y-1 text-sm text-stone-600">
              <p>Morning: {formatBudget(meta.morningPrice)}</p>
              <p>Evening: {formatBudget(meta.eveningPrice)}</p>
              <p>Full Day: {formatBudget(Number(meta.morningPrice) + Number(meta.eveningPrice))}</p>
            </div>
          )}
          {budget && (
            <p className="mt-2 text-xs text-stone-500">Remaining budget {formatBudget(remainingBudget)}</p>
          )}
          <BookingAccessGate>
          {isHall && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">Select Date
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full rounded-xl border p-3" />
              </label>
              <button
                type="button"
                disabled={checkingAvailability || !date}
                onClick={checkAvailability}
                className="w-full rounded-full border border-brand-300 bg-white py-3 text-sm font-semibold text-brand-700 disabled:opacity-50"
              >
                {checkingAvailability ? 'Checking…' : 'Check Availability'}
              </button>
              {availabilityChecked && hallSlots && (
                <div className="rounded-xl border border-stone-200 bg-white p-3 text-sm">
                  <p className="font-semibold text-stone-800">{formatBookingDate(date)}</p>
                  <ul className="mt-2 space-y-1 text-stone-600">
                    {['morning', 'evening', 'full_day'].map((slot) => {
                      const available = hallSlots.slots?.[slot];
                      return (
                        <li key={slot}>
                          {slotLabel(slot)}:{' '}
                          <span className={available ? 'font-medium text-emerald-700' : 'font-medium text-red-600'}>
                            {available ? 'Available' : 'Unavailable'}
                          </span>
                          {hallSlots.prices?.[slot] != null ? ` · ${formatBudget(hallSlots.prices[slot])}` : ''}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <fieldset className="space-y-2 text-sm" disabled={!availabilityChecked}>
                <legend className="font-medium">Select Time Slot</legend>
                {['morning', 'evening', 'full_day'].map((slot) => {
                  const available = availabilityChecked && hallSlots?.slots?.[slot];
                  return (
                    <label key={slot} className={`flex items-center gap-2 ${!available ? 'text-stone-400' : ''}`}>
                      <input
                        type="radio"
                        name="timeSlot"
                        value={slot}
                        disabled={!available}
                        checked={timeSlot === slot}
                        onChange={() => setTimeSlot(slot)}
                      />
                      {slotLabel(slot)}
                      {hallSlots?.prices?.[slot] != null ? ` · ${formatBudget(hallSlots.prices[slot])}` : ''}
                      {availabilityChecked && !available ? ' (Unavailable)' : ''}
                    </label>
                  );
                })}
              </fieldset>
              <button
                type="button"
                disabled={bookingSaving || !date || !timeSlot || !availabilityChecked}
                onClick={submitHallBooking}
                className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {bookingSaving ? 'Confirming…' : 'Confirm Booking'}
              </button>
              <button
                type="button"
                disabled={cartSaving || !date || !timeSlot || !availabilityChecked}
                onClick={addToWeddingCart}
                className="w-full rounded-full border border-stone-200 py-3 text-sm font-semibold text-stone-700 disabled:opacity-50"
              >
                Add to Wedding Cart
              </button>
            </div>
          )}
          {!isHall && listing.listingType === 'product' && (
            <div className="mt-4 space-y-3">
              <label className="block text-sm">Quantity
                <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3" />
              </label>
              <button disabled={cartSaving} onClick={addToWeddingCart} className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white disabled:opacity-50">
                Add to Wedding
              </button>
            </div>
          )}
          {listing.availabilityType === 'appointment' && !isHall && (
            <div className="mt-4 space-y-3">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border p-3" />
              <select value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border p-3">
                <option value="">Select time</option>
                {availability?.slots?.filter((s) => s.available).map((s) => <option key={s.time} value={s.time}>{s.time}</option>)}
              </select>
              <button disabled={selectDisabled} onClick={bookAppointment} className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Book appointment</button>
            </div>
          )}
          {listing.availabilityType === 'rental_period' && (
            <div className="mt-4 space-y-3">
              <input type="date" value={rentalStart} onChange={(e) => setRentalStart(e.target.value)} className="w-full rounded-xl border p-3" />
              <input type="date" value={rentalEnd} onChange={(e) => setRentalEnd(e.target.value)} className="w-full rounded-xl border p-3" />
              {availability && <p className="text-sm">{availability.remaining} of {availability.quantity} available</p>}
              <button disabled={selectDisabled} onClick={bookRental} className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Reserve rental</button>
            </div>
          )}
          {listing.availabilityType === 'capacity' && (
            <label className="mt-4 block text-sm">Guest count<input type="number" min="1" value={guestCount} onChange={(e) => setGuestCount(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3" /></label>
          )}
          {showSelect ? (
            <>
              {listing.availabilityType !== 'capacity' && (
                <label className="mt-4 block text-sm">Quantity<input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="mt-1 w-full rounded-xl border p-3" /></label>
              )}
              <button
                disabled={selectDisabled}
                onClick={() => select(false)}
                title={selectDisabled ? serviceBudgetMessage(listing.category) : undefined}
                className="mt-5 w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Select for wedding
              </button>
              {selectDisabled && (
                <p className="mt-2 text-xs text-red-700">{serviceBudgetMessage(listing.category)}</p>
              )}
            </>
          ) : null}
          </BookingAccessGate>
          {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        </aside>
        </div>
      </div>
    </div>
  );
}
