import { formatBudget, formatSlot, formatWeddingDate } from '../../../utils/weddingFormat.js';

export default function ChangeSummary({ summary, onCancel, onConfirm, confirming }) {
  if (!summary) return null;
  const current = summary.current;
  const next = summary.next;
  return (
    <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5">
      <h3 className="font-semibold text-stone-900">Review change</h3>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-stone-500">Current Hall</dt>
          <dd className="font-medium">{current?.hallName || 'None'}</dd>
        </div>
        <div>
          <dt className="text-stone-500">New Hall</dt>
          <dd className="font-medium">{next?.hallName}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Current Slot</dt>
          <dd className="font-medium">{formatSlot(current?.slotType)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">New Slot</dt>
          <dd className="font-medium">{formatSlot(next?.slotType)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Current Date</dt>
          <dd className="font-medium">{current?.date ? formatWeddingDate(current.date) : '—'}</dd>
        </div>
        <div>
          <dt className="text-stone-500">New Date</dt>
          <dd className="font-medium">{next?.date ? formatWeddingDate(next.date) : '—'}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Old Price</dt>
          <dd className="font-medium">{formatBudget(current?.price || 0)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">New Price</dt>
          <dd className="font-medium">{formatBudget(next?.price || 0)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">Payment already made</dt>
          <dd className="font-medium">{formatBudget(summary.paymentAlreadyMade || 0)}</dd>
        </div>
        <div>
          <dt className="text-stone-500">New amount due</dt>
          <dd className="font-medium">{formatBudget(summary.newAmountDue || 0)}</dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-stone-500">
        Existing payment records stay in history. The previous hall is released only after this reservation succeeds.
      </p>
      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={onCancel} className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700">Cancel</button>
        <button type="button" disabled={confirming} onClick={onConfirm} className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {confirming ? 'Confirming…' : 'Confirm Changes'}
        </button>
      </div>
    </div>
  );
}
