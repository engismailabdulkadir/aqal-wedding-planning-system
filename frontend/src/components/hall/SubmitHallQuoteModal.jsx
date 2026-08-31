import { useState } from 'react';
import FormModal, { fieldClass } from '../common/FormModal.jsx';
import { formatBudget } from '../../utils/weddingFormat.js';

export default function SubmitHallQuoteModal({
  isOpen,
  onClose,
  quote,
  onSubmit,
  loading = false,
  error = '',
}) {
  const [totalPrice, setTotalPrice] = useState(quote?.totalPrice ?? '');
  const [requiredDeposit, setRequiredDeposit] = useState(quote?.requiredDeposit ?? '');
  const [notes, setNotes] = useState(quote?.notes || '');
  const [expiresAt, setExpiresAt] = useState('');
  const [localError, setLocalError] = useState('');

  const dirty = String(totalPrice) !== '' || String(requiredDeposit) !== '' || Boolean(notes) || Boolean(expiresAt);

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError('');
    const total = Number(totalPrice);
    const deposit = Number(requiredDeposit || 0);
    if (!(total > 0)) {
      setLocalError('Total booking price must be greater than 0.');
      return;
    }
    if (deposit < 0) {
      setLocalError('Required deposit cannot be negative.');
      return;
    }
    if (deposit > total) {
      setLocalError('Required deposit cannot exceed the total booking price.');
      return;
    }
    await onSubmit?.({
      totalPrice: total,
      requiredDeposit: deposit,
      notes,
      expiresAt: expiresAt || undefined,
    });
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title="Prepare Hall Quote"
      subtitle={`${quote?.hall?.hallName || 'Hall'} · ${quote?.bookingDate || ''} · ${quote?.slotType || ''}`}
      loading={loading}
      dirty={dirty}
      error={localError || error}
      onSubmit={handleSubmit}
      submitLabel="Send Quote"
    >
      <div className="rounded-2xl border border-app-border bg-app-inset px-4 py-3 text-sm text-app-muted">
        <p><span className="font-semibold text-app-text">Wedding:</span> {quote?.wedding?.weddingName || '—'}</p>
        <p className="mt-1"><span className="font-semibold text-app-text">Guests:</span> {quote?.guestCount ?? quote?.wedding?.expectedGuests ?? '—'}</p>
        <p className="mt-1"><span className="font-semibold text-app-text">Couple:</span> {[quote?.wedding?.partner1Name, quote?.wedding?.partner2Name].filter(Boolean).join(' & ') || '—'}</p>
      </div>

      <label className="block text-sm font-medium text-app-text">
        Total Booking Price *
        <input
          required
          type="number"
          min="0.01"
          step="0.01"
          value={totalPrice}
          onChange={(event) => setTotalPrice(event.target.value)}
          className={fieldClass}
          placeholder="300"
        />
      </label>

      <label className="block text-sm font-medium text-app-text">
        Required Deposit *
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={requiredDeposit}
          onChange={(event) => setRequiredDeposit(event.target.value)}
          className={fieldClass}
          placeholder="150"
        />
        {Number(totalPrice) > 0 && Number(requiredDeposit) >= 0 ? (
          <span className="mt-1 block text-xs text-app-muted">
            Remaining after deposit: {formatBudget(Math.max(0, Number(totalPrice) - Number(requiredDeposit || 0)))}
          </span>
        ) : null}
      </label>

      <label className="block text-sm font-medium text-app-text">
        Quote expiry (optional)
        <input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className={fieldClass} />
      </label>

      <label className="block text-sm font-medium text-app-text">
        Notes (optional)
        <textarea
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className={`${fieldClass} resize-none`}
          placeholder="Includes hall, lighting and sound system."
        />
      </label>
    </FormModal>
  );
}
