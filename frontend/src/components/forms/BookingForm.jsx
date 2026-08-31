import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { checkBookingAvailability, createBooking } from '../../api/bookings.js';
import { useAuth } from '../../hooks/useAuth.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { getApiError } from '../../utils/apiError.js';
import { showSuccess } from '../../utils/alerts.js';
import { formatBudget } from '../../utils/weddingFormat.js';
import { buildWeddingEditPath, parseReturnTo } from '../../utils/returnTo.js';
import { isCoupleRole } from '../../utils/roles.js';

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

function buildAuthLink(path, returnPath) {
  const safe = parseReturnTo(returnPath) || returnPath;
  if (!safe) return path;
  return `${path}?returnTo=${encodeURIComponent(safe)}`;
}

/**
 * Vendor booking request form — couple-only, with auth / wedding gates.
 */
export default function BookingForm({
  vendorProfileId,
  services = [],
  startingPrice = 0,
  title = 'Request Booking',
}) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { activeWedding, activeWeddingId, weddings, loading: weddingLoading } = useActiveWedding();
  const location = useLocation();
  const navigate = useNavigate();
  const returnPath = location.pathname;

  const [form, setForm] = useState({ serviceId: '', eventDate: '', customerMessage: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [availability, setAvailability] = useState(null);

  const weddingDateInput = toDateInput(activeWedding?.weddingDate);
  const minDate = todayInputValue();
  const maxDate = weddingDateInput || undefined;

  const hasServices = services.length > 0;

  useEffect(() => {
    if (weddingDateInput && !form.eventDate) {
      setForm((prev) => ({ ...prev, eventDate: weddingDateInput }));
    }
  }, [weddingDateInput, form.eventDate]);

  const selectedService = useMemo(
    () => services.find((s) => String(s._id) === String(form.serviceId)),
    [services, form.serviceId],
  );

  async function handleCheckDate() {
    if (!form.eventDate) {
      setError('Select a booking date first.');
      return;
    }
    setChecking(true);
    setError('');
    try {
      const result = await checkBookingAvailability({
        vendorProfile: vendorProfileId,
        eventDate: form.eventDate,
      }, activeWeddingId);
      setAvailability(result);
      if (!result.available) {
        setError(result.message || 'This date is not available. Please choose another date.');
      }
    } catch (err) {
      setAvailability(null);
      setError(getApiError(err));
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isAuthenticated || !isCoupleRole(user?.role)) return;
    if (!activeWeddingId) return;

    setError('');
    setSubmitting(true);
    try {
      if (form.eventDate) {
        const check = await checkBookingAvailability({
          vendorProfile: vendorProfileId,
          eventDate: form.eventDate,
        }, activeWeddingId);
        if (!check.available) {
          setError(check.message || 'This date is not available. Please choose another date.');
          setAvailability(check);
          return;
        }
      }

      const payload = {
        vendorProfile: vendorProfileId,
        eventDate: form.eventDate,
        customerMessage: form.customerMessage,
      };
      if (form.serviceId) payload.serviceId = form.serviceId;
      if (selectedService) {
        payload.amount = selectedService.price;
      } else if (!hasServices) {
        payload.serviceName = 'General booking request';
        payload.amount = Number(startingPrice) || 0;
      }

      const result = await createBooking(payload, activeWeddingId);
      await showSuccess(
        'Booking request submitted',
        result.message || 'Booking request submitted. Waiting for vendor confirmation.',
      );
      navigate('/bookings', {
        state: { message: 'Booking request submitted. Waiting for vendor confirmation.' },
      });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm text-stone-600">
          Please register or log in to book this service.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to={buildAuthLink('/register', returnPath)}
            className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            Register
          </Link>
          <Link
            to={buildAuthLink('/login', returnPath)}
            className="rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isCoupleRole(user?.role)) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm text-amber-900">
          Only registered bride or groom accounts can request vendor bookings.
        </p>
      </div>
    );
  }

  if (weddingLoading) {
    return <p className="text-sm text-stone-500">Loading your wedding…</p>;
  }

  if (!weddings.length) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm text-stone-600">Create your wedding to start booking vendors.</p>
        <Link
          to={buildAuthLink('/weddings/new', returnPath)}
          className="mt-4 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Create Wedding
        </Link>
      </div>
    );
  }

  if (!activeWedding?.weddingDate) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="mt-3 text-sm text-stone-600">Set your wedding date before making bookings.</p>
        <Link
          to={buildWeddingEditPath(activeWeddingId, { returnTo: returnPath, focus: 'weddingDate' })}
          className="mt-4 inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Set Wedding Date
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-semibold">{title}</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        {hasServices ? (
          <select
            required
            value={form.serviceId}
            onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
            className="w-full rounded-xl border border-stone-200 p-3 text-sm"
          >
            <option value="">Select service</option>
            {services.map((service) => (
              <option key={service._id} value={service._id}>
                {service.name} — {formatBudget(service.price)}
              </option>
            ))}
          </select>
        ) : (
          <p className="text-sm text-stone-500">
            Contact this vendor for available services. Starting price: {formatBudget(startingPrice)}
          </p>
        )}

        <div>
          <input
            required
            type="date"
            min={minDate}
            max={maxDate}
            value={form.eventDate}
            onChange={(e) => {
              setForm({ ...form, eventDate: e.target.value });
              setAvailability(null);
              setError('');
            }}
            className="w-full rounded-xl border border-stone-200 p-3 text-sm"
          />
          <button
            type="button"
            disabled={checking || !form.eventDate}
            onClick={handleCheckDate}
            className="mt-2 text-sm font-semibold text-brand-700 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Check Date'}
          </button>
          {availability?.available ? (
            <p className="mt-2 text-sm text-emerald-700">{availability.message}</p>
          ) : null}
        </div>

        <textarea
          value={form.customerMessage}
          onChange={(e) => setForm({ ...form, customerMessage: e.target.value })}
          placeholder="Optional message for the vendor"
          className="min-h-24 w-full rounded-xl border border-stone-200 p-3 text-sm"
        />

        <button
          type="submit"
          disabled={submitting || (hasServices && !form.serviceId)}
          className="w-full rounded-full bg-brand-600 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? 'Submitting…' : 'Request Booking'}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
