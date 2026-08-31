import { useEffect, useState } from 'react';
import ValidationRecoveryPanel from '../../validation/ValidationRecoveryPanel.jsx';
import { getHallAvailability, getVenueAvailability, getVenues, replaceHallBooking } from '../../../services/venueService.js';
import { getApiError, parseApiError } from '../../../utils/apiError.js';
import { formatBudget, formatSlot, formatWeddingDate } from '../../../utils/weddingFormat.js';
import ChangeSummary from './ChangeSummary.jsx';

const SLOTS = ['morning', 'evening', 'full_day'];

export default function HallChangePanel({
  wedding,
  booking,
  mode = 'hall',
  onChanged,
  onChooseHallTab,
}) {
  const venueId = booking?.venue?._id || wedding?.selectedVenue?._id || wedding?.selectedVenue;
  const hallId = booking?.hall?._id || wedding?.selectedHall?._id || wedding?.selectedHall;
  const [intent, setIntent] = useState(mode === 'datetime' ? 'datetime' : null);
  const [venues, setVenues] = useState([]);
  const [venue, setVenue] = useState(null);
  const [date, setDate] = useState(booking?.bookingDate || wedding?.weddingDate?.slice(0, 10) || '');
  const [grid, setGrid] = useState(null);
  const [hallSlots, setHallSlots] = useState(null);
  const [selected, setSelected] = useState(null);
  const [preview, setPreview] = useState(null);
  const [recovery, setRecovery] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setDate(booking?.bookingDate || wedding?.weddingDate?.slice(0, 10) || '');
    setIntent(mode === 'datetime' ? 'datetime' : null);
    setSelected(null);
    setPreview(null);
    setRecovery(null);
  }, [booking?._id, mode, wedding?.weddingDate]);

  useEffect(() => {
    if (intent !== 'venue') return;
    getVenues().then((data) => setVenues(data.venues || [])).catch((e) => setError(getApiError(e)));
  }, [intent]);

  useEffect(() => {
    if (!date || (intent !== 'hall' && intent !== 'venue' && intent !== 'datetime')) return;
    const targetVenue = intent === 'venue' ? venue?._id : venueId;
    if (!targetVenue) return;
    const context = {
      expectedGuests: wedding?.expectedGuests,
      estimatedBudget: wedding?.estimatedBudget,
      excludeBookingId: booking?._id,
    };
    getVenueAvailability(targetVenue, date, context)
      .then(setGrid)
      .catch((e) => setError(getApiError(e)));
  }, [intent, venue?._id, venueId, date, wedding?.expectedGuests, wedding?.estimatedBudget, booking?._id]);

  useEffect(() => {
    if (intent !== 'slot' && intent !== 'datetime') return;
    if (!hallId || !date) return;
    getHallAvailability(hallId, date, { excludeBookingId: booking?._id })
      .then((data) => setHallSlots(data.data))
      .catch((e) => setError(getApiError(e)));
  }, [intent, hallId, date, booking?._id]);

  async function review(hall, slotType, nextDate = date) {
    setBusy(true);
    setError('');
    setRecovery(null);
    try {
      const data = await replaceHallBooking({
        hall,
        date: nextDate,
        slotType,
        preview: true,
      }, wedding._id);
      setPreview(data);
    } catch (e) {
      const parsed = parseApiError(e);
      if (parsed.code === 'HALL_SLOT_UNAVAILABLE' && intent === 'datetime') {
        setRecovery({
          code: 'DATE_HALL_UNAVAILABLE',
          message: parsed.message,
          details: {
            newDate: nextDate,
            hallName: booking?.hall?.hallName,
            ...parsed.details,
          },
        });
      } else if (parsed.code) {
        setRecovery(parsed);
      } else {
        setError(parsed.message);
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirm(confirmOverBudget = false) {
    if (!preview?.next) return;
    setBusy(true);
    setError('');
    try {
      const data = await replaceHallBooking({
        hall: preview.next.hallId,
        date: preview.next.date,
        slotType: preview.next.slotType,
        confirm: true,
        confirmOverBudget,
      }, wedding._id);
      setPreview(null);
      setSelected(null);
      setIntent(mode === 'datetime' ? 'datetime' : null);
      onChanged?.(data.message || 'Hall booking updated.');
    } catch (e) {
      const parsed = parseApiError(e);
      if (parsed.code) setRecovery(parsed);
      else setError(parsed.message);
    } finally {
      setBusy(false);
    }
  }

  const currentHallName = booking?.hall?.hallName || wedding?.selectedHall?.hallName || 'Not selected';
  const currentVenueName = booking?.venue?.name || wedding?.selectedVenue?.name || wedding?.venue || 'Not selected';
  const currentSlot = booking?.slotType || wedding?.selectedSlot;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Fact label="Venue" value={currentVenueName} />
        <Fact label="Hall" value={currentHallName} />
        <Fact label="Slot" value={formatSlot(currentSlot)} />
        <Fact label="Date" value={formatWeddingDate(booking?.bookingDate || wedding?.weddingDate)} />
        <Fact label="Capacity" value={booking?.hall?.capacity ? `${booking.hall.capacity} guests` : '—'} />
        <Fact label="Price" value={formatBudget(booking?.basePrice || 0)} />
        <Fact label="Paid" value={formatBudget(booking?.amountPaid || 0)} />
        <Fact label="Status" value={booking ? `${booking.status} · ${booking.paymentStatus}` : 'No hall reserved'} />
      </div>

      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {recovery && (
        <ValidationRecoveryPanel
          error={recovery}
          onChooseAnotherHall={() => { setRecovery(null); setIntent('hall'); setPreview(null); }}
          onUpdateGuestCount={onChooseHallTab}
          onUpdateBudget={onChooseHallTab}
          onChooseAnotherSlot={() => { setRecovery(null); setIntent('slot'); setPreview(null); }}
          onKeepCurrentDate={() => { setRecovery(null); setDate(booking?.bookingDate || ''); setPreview(null); }}
          onDismiss={() => setRecovery(null)}
        />
      )}

      {mode !== 'datetime' && (
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setIntent('venue'); setPreview(null); }} className={chip(intent === 'venue')}>Change Venue</button>
          <button type="button" onClick={() => { setIntent('hall'); setPreview(null); }} className={chip(intent === 'hall')}>Change Hall</button>
          <button type="button" onClick={() => { setIntent('slot'); setPreview(null); }} className={chip(intent === 'slot')}>Change Time Slot</button>
        </div>
      )}

      {mode === 'datetime' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">Wedding Date
            <input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPreview(null); setRecovery(null); }} className="mt-2 w-full rounded-xl border px-4 py-3" />
          </label>
          <div>
            <p className="text-sm font-medium text-stone-700">Time slot</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(hallSlots?.slots || SLOTS.map((slotType) => ({ slot: slotType, available: true }))).map((slot) => {
                const key = slot.slot || slot.slotType;
                const available = slot.available !== false;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!available || (key === currentSlot && date === booking?.bookingDate)}
                    onClick={() => {
                      if (key === currentSlot && date === booking?.bookingDate) return;
                      review(hallId, key, date);
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${currentSlot === key ? 'bg-brand-600 text-white' : available ? 'bg-white text-stone-700 shadow-sm' : 'cursor-not-allowed bg-stone-100 text-stone-400'}`}
                  >
                    {formatSlot(key)}{slot.price != null ? ` · ${formatBudget(slot.price)}` : ''}{!available ? ' · unavailable' : ''}
                  </button>
                );
              })}
            </div>
          </div>
          {booking && date && date !== booking.bookingDate && (
            <button type="button" disabled={busy} onClick={() => review(hallId, currentSlot, date)} className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
              Review Change
            </button>
          )}
        </div>
      )}

      {intent === 'venue' && (
        <div className="grid gap-3 sm:grid-cols-2">
          {venues.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => { setVenue(item); setSelected(null); setPreview(null); }}
              className={`rounded-2xl border p-4 text-left ${venue?._id === item._id ? 'border-brand-500 bg-brand-50' : 'border-stone-200 bg-white'}`}
            >
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-stone-500">{item.city}</p>
            </button>
          ))}
        </div>
      )}

      {(intent === 'hall' || (intent === 'venue' && venue)) && grid?.halls ? (
        <HallCards
          halls={grid.halls}
          location={grid.venue?.city}
          expectedGuests={wedding?.expectedGuests}
          currentHallId={hallId}
          selected={selected}
          onSelect={(choice) => { setSelected(choice); setPreview(null); }}
        />
      ) : null}

      {intent === 'slot' && (
        <div className="space-y-3">
          <p className="text-sm text-stone-500">Availability for {currentHallName} on {formatWeddingDate(date)}.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {(hallSlots?.slots || []).map((slot) => (
              <button
                key={slot.slot}
                type="button"
                disabled={!slot.available}
                onClick={() => { setSelected({ hallId, slot: slot.slot, price: slot.price }); setPreview(null); }}
                className={`rounded-2xl border p-4 text-left ${selected?.slot === slot.slot ? 'border-brand-500 bg-brand-50' : 'border-stone-200 bg-white'} ${!slot.available ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <p className="font-semibold">{formatSlot(slot.slot)}</p>
                <p className="mt-1 text-sm text-stone-500">{slot.available ? formatBudget(slot.price) : 'Unavailable for this Hall and date.'}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && !preview && (
        <button type="button" disabled={busy} onClick={() => review(selected.hallId, selected.slot, date)} className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          Review Change
        </button>
      )}

      {preview && (
        <ChangeSummary summary={preview} confirming={busy} onCancel={() => setPreview(null)} onConfirm={() => confirm(Boolean(preview.budget?.overBudget))} />
      )}

      {!booking && (
        <p className="text-sm text-stone-500">No hall is reserved yet. Browse venues to hold a hall, then return here to manage it.</p>
      )}
    </div>
  );
}

function Fact({ label, value }) {
  return (
    <div className="rounded-2xl bg-stone-50 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 font-medium text-stone-900">{value}</p>
    </div>
  );
}

function chip(active) {
  return `rounded-full px-4 py-2 text-sm font-semibold ${active ? 'bg-brand-600 text-white' : 'bg-white text-stone-700 shadow-sm'}`;
}

function HallCards({ halls, location, expectedGuests, currentHallId, selected, onSelect }) {
  return (
    <div className="grid gap-4">
      {halls.map((hall) => (
        <article key={hall.hallId} className={`rounded-2xl border p-5 ${String(currentHallId) === String(hall.hallId) ? 'border-brand-200 bg-brand-50/40' : 'border-stone-200 bg-white'}`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="font-display text-2xl font-semibold">{hall.hallName}</h3>
              <p className="mt-1 text-sm text-stone-500">
                Capacity {hall.capacity}
                {location ? ` · ${location}` : ''}
                {String(currentHallId) === String(hall.hallId) ? ' · current hall' : ''}
              </p>
              {hall.facilities?.length ? <p className="mt-1 text-sm text-stone-500">{hall.facilities.join(' · ')}</p> : null}
              {hall.capacityStatus && !hall.capacityStatus.suitable ? (
                <p className="mt-2 text-sm font-semibold text-red-700">Not suitable for {expectedGuests} guests</p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {SLOTS.map((slotKey) => {
              const slot = hall.slots?.[slotKey];
              if (!slot) return <div key={slotKey} className="rounded-xl bg-stone-50 px-3 py-3 text-sm text-stone-300">—</div>;
              const isSelected = selected?.hallId === hall.hallId && selected?.slot === slotKey;
              const blocked = !slot.available || (hall.capacityStatus && !hall.capacityStatus.suitable);
              return (
                <button
                  key={slotKey}
                  type="button"
                  disabled={blocked}
                  onClick={() => onSelect({ hallId: hall.hallId, hallName: hall.hallName, slot: slotKey, price: slot.price })}
                  className={`rounded-xl px-3 py-3 text-left text-sm ${isSelected ? 'bg-brand-600 text-white' : blocked ? 'cursor-not-allowed bg-stone-100 text-stone-400' : 'bg-emerald-50 text-emerald-900'}`}
                >
                  <span className="block font-semibold">{formatSlot(slotKey)}</span>
                  <span className="block mt-1">{blocked ? (slot.available ? 'Capacity issue' : 'Unavailable') : formatBudget(slot.price)}</span>
                </button>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}
