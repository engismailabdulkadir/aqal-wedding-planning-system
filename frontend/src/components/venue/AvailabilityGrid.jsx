import { formatBudget } from '../../utils/weddingFormat.js';

function capacityLabel(status, expectedGuests) {
  if (!expectedGuests || !status?.issue) return null;
  if (status.issue === 'too_small') return `Not suitable for ${expectedGuests} guests`;
  if (status.issue === 'below_minimum') return 'Guest count below hall minimum';
  return null;
}

export default function AvailabilityGrid({
  venueName,
  halls,
  selected,
  onSelect,
  expectedGuests,
  recommendations = [],
  onWhyCantSelect,
  acceptsQuotes = true,
}) {
  if (!halls?.length) return <p className="text-sm text-stone-400">No halls available.</p>;

  function cell(hall, slotKey) {
    const slot = hall.slots?.[slotKey];
    if (!slot) return <td className="px-3 py-3 text-stone-300">—</td>;
    const isSelected = selected?.hallId === hall.hallId && selected?.slot === slotKey;
    const held = slot.status === 'held';
    const booked = slot.status === 'booked' || slot.available === false;
    const capacityBlocked = hall.capacityStatus && !hall.capacityStatus.suitable;
    const quotesReady = acceptsQuotes !== false && hall.acceptsQuotes !== false && slot.requestable !== false;

    if (held) {
      return (
        <td className="px-3 py-3">
          <span className="block rounded-xl bg-amber-50 px-3 py-2 text-center text-xs font-semibold text-amber-800">Temporarily Reserved</span>
        </td>
      );
    }
    if (booked) {
      return (
        <td className="px-3 py-3">
          <span className="block rounded-xl bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-400">Booked</span>
        </td>
      );
    }
    if (capacityBlocked) {
      return (
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={() => onWhyCantSelect?.(hall)}
            className="block w-full rounded-xl bg-red-50 px-3 py-2 text-center text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Capacity issue
          </button>
        </td>
      );
    }
    if (slot.quoteRequired || Number(slot.price) <= 0) {
      if (!quotesReady) {
        return (
          <td className="px-3 py-3">
            <span className="block rounded-xl bg-stone-100 px-3 py-2 text-center text-xs font-semibold text-stone-500">
              Not Available Yet
            </span>
          </td>
        );
      }
      return (
        <td className="px-3 py-3">
          <button
            type="button"
            onClick={() => onSelect?.({
              hallId: hall.hallId,
              hallName: hall.hallName,
              slot: slotKey,
              price: slot.price,
              deposit: slot.deposit,
              quoteRequired: true,
              requestable: true,
            })}
            className={`block w-full rounded-xl px-3 py-2 text-center text-xs font-semibold ${isSelected ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-800 hover:bg-brand-100'}`}
          >
            Request Quote
          </button>
        </td>
      );
    }
    return (
      <td className="px-3 py-3">
        <button
          type="button"
          onClick={() => onSelect?.({ hallId: hall.hallId, hallName: hall.hallName, slot: slotKey, price: slot.price, deposit: slot.deposit, quoteRequired: slot.quoteRequired })}
          className={`block w-full rounded-xl px-3 py-2 text-center text-xs font-semibold ${isSelected ? 'bg-brand-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}
        >
          Available · ${slot.price}
        </button>
      </td>
    );
  }

  return (
    <div className="space-y-4">
      {!acceptsQuotes ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <p className="font-semibold">Not Available Yet</p>
          <p className="mt-1">This venue is not currently accepting quote requests.</p>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">
        {venueName && <div className="border-b px-5 py-4"><h3 className="font-display text-2xl font-semibold">{venueName}</h3></div>}
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className="px-5 py-4">Hall</th>
              <th className="px-3 py-4">Morning</th>
              <th className="px-3 py-4">Evening</th>
              <th className="px-3 py-4">Full Day</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {halls.map((hall) => {
              const capacityNote = capacityLabel(hall.capacityStatus, expectedGuests);
              const suitable = hall.capacityStatus?.suitable ?? true;
              return (
                <tr key={hall.hallId} className={!suitable ? 'bg-red-50/40' : undefined}>
                  <td className="px-5 py-4">
                    <p className="font-semibold">{hall.hallName}</p>
                    {hall.capacity ? <p className="mt-1 text-xs text-stone-500">Capacity: {hall.capacity} guests</p> : null}
                    {hall.facilities?.length ? <p className="mt-1 text-xs text-stone-500">{hall.facilities.slice(0, 4).join(' · ')}</p> : null}
                    {capacityNote ? (
                      <p className="mt-1 text-xs font-semibold text-red-700">{capacityNote}</p>
                    ) : expectedGuests ? (
                      <p className="mt-1 text-xs font-semibold text-emerald-700">Suitable for {expectedGuests} guests</p>
                    ) : null}
                    {!suitable && onWhyCantSelect ? (
                      <button type="button" onClick={() => onWhyCantSelect(hall)} className="mt-2 text-xs font-semibold text-brand-700 underline">Why can&apos;t I select this hall?</button>
                    ) : null}
                  </td>
                  {cell(hall, 'morning')}
                  {cell(hall, 'evening')}
                  {cell(hall, 'full_day')}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {recommendations.length > 0 && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <h4 className="font-semibold text-emerald-900">Recommended alternatives</h4>
          <p className="mt-1 text-sm text-emerald-800">These halls fit your guest count and have availability on the selected date.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {recommendations.map((hall) => (
              <div key={hall.hallId} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="font-semibold text-stone-900">{hall.hallName}</p>
                <p className="mt-1 text-xs text-stone-500">Capacity {hall.capacity}</p>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {hall.lowestAvailablePrice != null ? formatBudget(hall.lowestAvailablePrice) : 'Available'}
                </p>
                <p className="text-xs text-stone-500">{hall.availableSlotCount} slot(s) available</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
