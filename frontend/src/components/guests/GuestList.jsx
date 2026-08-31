import { FiEdit2, FiMail, FiPhone, FiTrash2, FiUser } from 'react-icons/fi';

const categoryLabels = { family: 'Family', friend: 'Friend', relative: 'Relative', colleague: 'Colleague', vip: 'VIP', other: 'Other' };
const sideLabels = { bride: 'Bride', groom: 'Groom', shared: 'Shared', partner1: 'Bride', partner2: 'Groom' };
const invitationLabels = { not_sent: 'Not sent', sent: 'Sent', viewed: 'Viewed' };

function Contact({ guest }) {
  if (!guest.phone && !guest.email) return <span className="text-xs text-stone-400">No contact information</span>;
  return (
    <div className="space-y-1 text-xs text-stone-500">
      {guest.phone && <p className="flex items-center gap-1.5"><FiPhone /> {guest.phone}</p>}
      {guest.email && <p className="flex items-center gap-1.5"><FiMail /> <span className="max-w-44 truncate">{guest.email}</span></p>}
    </div>
  );
}

function Actions({ guest, onEdit, onDelete, deleting }) {
  return (
    <div className="flex gap-1">
      <button onClick={() => onEdit(guest)} className="rounded-lg p-2 text-stone-500 hover:bg-brand-50 hover:text-brand-700" aria-label={`Edit ${guest.firstName}`}><FiEdit2 /></button>
      <button disabled={deleting === guest._id} onClick={() => onDelete(guest)} className="rounded-lg p-2 text-stone-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label={`Delete ${guest.firstName}`}><FiTrash2 /></button>
    </div>
  );
}

function invitationText(guest) {
  if (guest.rsvpStatus === 'accepted') return 'RSVP accepted';
  if (guest.rsvpStatus === 'declined') return 'RSVP declined';
  return invitationLabels[guest.invitationStatus] || 'Not sent';
}

function GuestList({ guests, onEdit, onDelete, deleting }) {
  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead>
            <tr className="border-b bg-stone-50 text-xs uppercase tracking-wide text-stone-400">
              <th className="px-5 py-4 font-semibold">Guest</th>
              <th className="px-5 py-4 font-semibold">Contact</th>
              <th className="px-5 py-4 font-semibold">Side</th>
              <th className="px-5 py-4 font-semibold">RSVP</th>
              <th className="px-5 py-4 font-semibold">Attending</th>
              <th className="px-5 py-4 font-semibold">Table</th>
              <th className="px-5 py-4 font-semibold">Invitation</th>
              <th className="px-5 py-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest._id} className="border-b last:border-0">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-600"><FiUser /></span>
                    <div>
                      <p className="font-semibold text-stone-800">{guest.firstName} {guest.lastName}</p>
                      <p className="mt-0.5 text-xs text-stone-400">{categoryLabels[guest.category]}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4"><Contact guest={guest} /></td>
                <td className="px-5 py-4 text-stone-600">{sideLabels[guest.side]}</td>
                <td className="px-5 py-4"><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold capitalize text-amber-700">{guest.rsvpStatus}</span></td>
                <td className="px-5 py-4 text-stone-600">{guest.numberAttending || 0}</td>
                <td className="px-5 py-4 text-stone-600">{guest.tableNumber || '—'}</td>
                <td className="px-5 py-4 text-stone-600">{invitationText(guest)}</td>
                <td className="px-5 py-4"><Actions guest={guest} onEdit={onEdit} onDelete={onDelete} deleting={deleting} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-4 p-4 lg:hidden">
        {guests.map((guest) => (
          <article key={guest._id} className="rounded-2xl border border-stone-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><FiUser /></span>
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-stone-900">{guest.firstName} {guest.lastName}</h3>
                  <p className="mt-1 text-xs text-stone-400">{categoryLabels[guest.category]} • {sideLabels[guest.side]}</p>
                </div>
              </div>
              <Actions guest={guest} onEdit={onEdit} onDelete={onDelete} deleting={deleting} />
            </div>
            <div className="mt-4 rounded-xl bg-stone-50 p-3"><Contact guest={guest} /></div>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-stone-400">RSVP</p><span className="mt-1 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold capitalize text-amber-700">{guest.rsvpStatus}</span></div>
              <div><p className="text-xs text-stone-400">Invitation</p><p className="mt-1 font-medium text-stone-700">{invitationText(guest)}</p></div>
              <div><p className="text-xs text-stone-400">Attending</p><p className="mt-1 font-medium text-stone-700">{guest.numberAttending || 0}</p></div>
              <div><p className="text-xs text-stone-400">Table</p><p className="mt-1 font-medium text-stone-700">{guest.tableNumber || '—'}</p></div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

export default GuestList;
