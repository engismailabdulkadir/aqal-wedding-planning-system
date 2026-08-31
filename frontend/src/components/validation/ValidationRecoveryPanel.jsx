import { FiAlertTriangle } from 'react-icons/fi';
import { formatBudget } from '../../utils/weddingFormat.js';

function RecoveryPanel({ title, children, actions }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="flex gap-3">
        <FiAlertTriangle className="mt-0.5 shrink-0 text-amber-600" />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-amber-950">{title}</h3>
          <div className="mt-2 space-y-2 text-sm text-amber-900">{children}</div>
          {actions?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={action.onClick}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${action.primary ? 'bg-brand-600 text-white hover:bg-brand-700' : 'border border-amber-300 bg-white text-amber-900 hover:bg-amber-100'}`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function ValidationRecoveryPanel({
  error,
  onChooseAnotherHall,
  onUpdateGuestCount,
  onUpdateBudget,
  onChooseAnotherSlot,
  onChooseAnotherDate,
  onKeepCurrentDate,
  onChooseAnotherService,
  onIncreaseBudget,
  onDismiss,
}) {
  if (!error?.code) return null;

  if (error.code === 'HALL_CAPACITY_EXCEEDED' || error.code === 'HALL_CAPACITY_BELOW_MINIMUM') {
    const { expectedGuests, hallCapacity, hallName, minimumCapacity } = error.details || {};
    const title = error.code === 'HALL_CAPACITY_BELOW_MINIMUM' ? 'Guest count is below hall minimum' : 'Hall capacity is too small';
    return (
      <RecoveryPanel
        title={title}
        actions={[
          { label: 'Update Guest Count', onClick: onUpdateGuestCount, primary: true },
          { label: 'Choose Another Hall', onClick: onChooseAnotherHall },
        ]}
      >
        <p>
          This hall supports <strong>{hallCapacity}</strong> guests, but your Wedding has{' '}
          <strong>{expectedGuests}</strong> expected guests.
        </p>
        {error.code === 'HALL_CAPACITY_BELOW_MINIMUM' ? (
          <p>
            <strong>{hallName || 'This hall'}</strong> requires a minimum of <strong>{minimumCapacity}</strong> guests.
          </p>
        ) : null}
        {error.message && error.code === 'HALL_CAPACITY_BELOW_MINIMUM' ? <p>{error.message}</p> : null}
        {onDismiss && <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold text-amber-800 underline">Dismiss</button>}
      </RecoveryPanel>
    );
  }

  if (error.code === 'BUDGET_EXCEEDED') {
    const details = error.details || {};
    const { totalBudget, hallCost, itemCost, servicePrice, difference, overBy, remainingBudget, itemKind, category } = details;
    const isHall = itemKind === 'hall' || category === 'hall' || (!itemKind && !category);
    const gap = difference ?? overBy;
    const price = servicePrice ?? itemCost ?? hallCost;

    if (!isHall) {
      return (
        <RecoveryPanel
          title={error.message || 'This service exceeds your remaining wedding budget.'}
          actions={[
            { label: 'Choose Another Service', onClick: onChooseAnotherService, primary: true },
            { label: 'Increase Budget', onClick: onIncreaseBudget || onUpdateBudget },
          ]}
        >
          <p>Service Price: <strong>{formatBudget(price)}</strong></p>
          <p>Remaining Budget: <strong>{formatBudget(remainingBudget)}</strong></p>
          <p>Over Budget By: <strong>{formatBudget(gap)}</strong></p>
          {onDismiss && <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold text-amber-800 underline">Dismiss</button>}
        </RecoveryPanel>
      );
    }

    return (
      <RecoveryPanel
        title="This hall exceeds your current wedding budget"
        actions={[
          { label: 'Update Wedding Budget', onClick: onUpdateBudget, primary: true },
          { label: 'Choose Another Hall', onClick: onChooseAnotherHall },
        ]}
      >
        <p>Wedding Budget: <strong>{formatBudget(totalBudget)}</strong></p>
        <p>Hall Cost: <strong>{formatBudget(hallCost)}</strong></p>
        <p>Difference: <strong>{formatBudget(gap)}</strong></p>
        {onDismiss && <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold text-amber-800 underline">Dismiss</button>}
      </RecoveryPanel>
    );
  }

  if (error.code === 'DATE_HALL_UNAVAILABLE') {
    const { newDate, hallName } = error.details || {};
    return (
      <RecoveryPanel
        title="Your current hall is not available on the new date"
        actions={[
          { label: 'Choose Another Hall', onClick: onChooseAnotherHall, primary: true },
          { label: 'Keep Current Date', onClick: onKeepCurrentDate || onDismiss },
        ]}
      >
        <p>
          Your current Hall{hallName ? <> (<strong>{hallName}</strong>)</> : null} is not available
          {newDate ? <> on <strong>{newDate}</strong></> : ' on the selected date'}.
        </p>
        {onDismiss && <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold text-amber-800 underline">Dismiss</button>}
      </RecoveryPanel>
    );
  }

  if (error.code === 'BUDGET_NOW_INSUFFICIENT') {
    const { overBy, totalBudget, totalPlannedCost } = error.details || {};
    return (
      <RecoveryPanel
        title="Selections exceed the new budget"
        actions={[
          { label: 'Review Budget', onClick: onUpdateBudget, primary: true },
          ...(onDismiss ? [{ label: 'Keep Budget Change', onClick: onDismiss }] : []),
        ]}
      >
        <p>Your current wedding selections exceed the new budget by <strong>{formatBudget(overBy)}</strong>.</p>
        <p>Budget: <strong>{formatBudget(totalBudget)}</strong> · Planned: <strong>{formatBudget(totalPlannedCost)}</strong></p>
        <p className="text-xs">Bookings were not deleted. Choose what to change.</p>
      </RecoveryPanel>
    );
  }

  if (error.code === 'HALL_SLOT_UNAVAILABLE') {
    return (
      <RecoveryPanel
        title="This hall slot is no longer available"
        actions={[
          { label: 'Choose Another Time Slot', onClick: onChooseAnotherSlot, primary: true },
          { label: 'Choose Another Hall', onClick: onChooseAnotherHall },
          ...(onChooseAnotherDate ? [{ label: 'Choose Another Date', onClick: onChooseAnotherDate }] : []),
        ]}
      >
        <p>The selected date or slot was just booked by another customer. Pick another option to continue.</p>
        {onDismiss && <button type="button" onClick={onDismiss} className="mt-2 text-xs font-semibold text-amber-800 underline">Dismiss</button>}
      </RecoveryPanel>
    );
  }

  return (
    <RecoveryPanel title="Unable to continue" actions={onDismiss ? [{ label: 'Dismiss', onClick: onDismiss }] : []}>
      <p>{error.message}</p>
    </RecoveryPanel>
  );
}
