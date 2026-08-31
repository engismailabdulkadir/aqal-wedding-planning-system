import { useEffect, useState } from 'react';
import Modal from '../common/Modal.jsx';
import ModalFooter, { ModalCancelButton, ModalSubmitButton } from '../common/ModalFooter.jsx';
import ListingImage from '../ui/ListingImage.jsx';
import { getHallSlots } from '../../services/cartService.js';
import { bookHall } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget } from '../../utils/weddingFormat.js';

function toDateInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function todayInputValue() {
  const today = new Date();
  return new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function slotLabel(slot) {
  if (slot === 'morning') return 'Morning';
  if (slot === 'evening') return 'Evening';
  if (slot === 'full_day') return 'Full Day';
  return slot;
}

export default function HallBookingModal({
  isOpen,
  onClose,
  listing,
  weddingId,
  defaultDate,
  onSuccess,
}) {
  const [date, setDate] = useState('');
  const [timeSlot, setTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [hallSlots, setHallSlots] = useState(null);
  const [availabilityChecked, setAvailabilityChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDate(toDateInput(defaultDate) || '');
    setTimeSlot('');
    setNotes('');
    setHallSlots(null);
    setAvailabilityChecked(false);
    setError('');
  }, [isOpen, listing?._id, defaultDate]);

  useEffect(() => {
    if (!isOpen) return;
    setHallSlots(null);
    setAvailabilityChecked(false);
    setTimeSlot('');
  }, [date, isOpen]);

  if (!listing) return null;

  const meta = listing.metadata || {};

  async function checkAvailability() {
    if (!date) return;
    setChecking(true);
    setError('');
    try {
      const data = await getHallSlots(listing._id, date);
      setHallSlots(data);
      setAvailabilityChecked(true);
      if (timeSlot && !data?.slots?.[timeSlot]) setTimeSlot('');
    } catch (err) {
      setHallSlots(null);
      setAvailabilityChecked(false);
      setError(getApiError(err));
    } finally {
      setChecking(false);
    }
  }

  async function confirmBooking(event) {
    event.preventDefault();
    if (!date || !timeSlot || !availabilityChecked || !weddingId) return;
    setSubmitting(true);
    setError('');
    try {
      const result = await bookHall({
        listingId: listing._id,
        bookingDate: date,
        timeSlot,
        notes,
      }, weddingId);
      onSuccess?.(result);
      onClose();
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  const dirty = Boolean(date || timeSlot || notes);
  const selectedPrice = availabilityChecked && timeSlot && hallSlots?.prices?.[timeSlot];

  return (
    <Modal
      as="form"
      onSubmit={confirmBooking}
      isOpen={isOpen}
      onClose={onClose}
      title={`Book ${listing.name}`}
      subtitle={listing.vendorProfile?.businessName || 'Wedding Hall'}
      size="lg"
      loading={submitting}
      dirty={dirty}
      footer={(
        <ModalFooter>
          <ModalCancelButton onClick={onClose} disabled={submitting}>Cancel</ModalCancelButton>
          <ModalSubmitButton
            loading={submitting}
            disabled={!date || !timeSlot || !availabilityChecked}
          >
            Confirm Booking
          </ModalSubmitButton>
        </ModalFooter>
      )}
    >
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        <ListingImage listing={listing} className="h-36 w-full rounded-2xl object-cover md:h-full md:min-h-[180px]" />
        <div className="space-y-1 text-sm text-stone-600">
          <p>
            {meta.district ? `${meta.district}, ` : ''}
            {listing.city}
          </p>
          {meta.address ? <p>{meta.address}</p> : null}
          <p>
            Capacity:{' '}
            {meta.capacity != null && meta.capacity !== '' ? `${meta.capacity} guests` : 'Not specified'}
          </p>
          {meta.morningPrice != null && <p>Morning: {formatBudget(meta.morningPrice)}</p>}
          {meta.eveningPrice != null && <p>Evening: {formatBudget(meta.eveningPrice)}</p>}
          {meta.morningPrice != null && meta.eveningPrice != null && (
            <p>Full Day: {formatBudget(Number(meta.morningPrice) + Number(meta.eveningPrice))}</p>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Date
          <input
            type="date"
            min={todayInputValue()}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-1 w-full rounded-xl border border-stone-200 p-3 text-stone-800"
            required
          />
        </label>

        <button
          type="button"
          disabled={checking || !date}
          onClick={checkAvailability}
          className="w-full rounded-full border border-brand-300 bg-white py-3 text-sm font-semibold text-brand-700 disabled:opacity-50"
        >
          {checking ? 'Checking…' : 'Check Availability'}
        </button>

        {availabilityChecked && hallSlots ? (
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm dark:border-stone-700 dark:bg-stone-800">
            <p className="font-semibold text-stone-800 dark:text-stone-100">Available slots</p>
            <ul className="mt-2 space-y-1 text-stone-600 dark:text-stone-300">
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
        ) : null}

        <fieldset className="space-y-2 text-sm" disabled={!availabilityChecked}>
          <legend className="font-medium text-stone-800 dark:text-stone-100">Select time slot</legend>
          {['morning', 'evening', 'full_day'].map((slot) => {
            const available = availabilityChecked && hallSlots?.slots?.[slot];
            return (
              <label
                key={slot}
                className={`flex items-center gap-2 ${!available ? 'text-stone-400' : 'text-stone-700 dark:text-stone-200'}`}
              >
                <input
                  type="radio"
                  name="hallTimeSlot"
                  value={slot}
                  disabled={!available}
                  checked={timeSlot === slot}
                  onChange={() => setTimeSlot(slot)}
                />
                {slotLabel(slot)}
                {hallSlots?.prices?.[slot] != null ? ` — ${formatBudget(hallSlots.prices[slot])}` : ''}
                {availabilityChecked && !available ? ' (Unavailable)' : ''}
              </label>
            );
          })}
        </fieldset>

        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Notes
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={3}
            placeholder="Optional message for the vendor"
            className="mt-1 w-full rounded-xl border border-stone-200 p-3 text-stone-800"
          />
        </label>

        {selectedPrice != null ? (
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Booking amount: {formatBudget(selectedPrice)}
          </p>
        ) : null}
      </div>
    </Modal>
  );
}
