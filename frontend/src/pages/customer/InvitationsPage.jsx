/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { FiCopy, FiMail, FiPlus, FiSend, FiTrash2 } from 'react-icons/fi';
import { FormModal, fieldClass } from '../../components/common/index.js';
import { ErrorState, LoadingState, PageHeader } from '../../components/customer/PageState.jsx';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { createInvitation, deleteInvitation, getInvitations, updateInvitation } from '../../services/planningService.js';
import { confirmAction, confirmDelete, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';

export default function InvitationsPage() {
  const { activeWeddingId } = useActiveWedding();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      setData(await getInvitations(activeWeddingId));
      setError('');
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (activeWeddingId) load(); }, [activeWeddingId]);

  async function submit() {
    if (!form?.guest) {
      setFormError('Select a guest.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await createInvitation({ guest: form.guest, message: form.message }, activeWeddingId);
      setForm(null);
      await showSuccess('Invitation created', 'The invitation was created successfully.');
      load();
    } catch (err) {
      setFormError(getApiError(err));
      await showApiError(err);
    } finally {
      setSaving(false);
    }
  }

  const act = async (id, kind) => {
    try {
      if (kind === 'delete') {
        const confirmed = await confirmDelete('Delete this invitation?', 'The invitation link will no longer work.');
        if (!confirmed) return;
        await deleteInvitation(id);
        await showSuccess('Invitation deleted successfully.');
      } else {
        const confirmed = await confirmAction({ title: 'Mark this invitation as sent?', confirmButtonText: 'Mark Sent' });
        if (!confirmed) return;
        await updateInvitation(id, { status: 'sent' });
        await showSuccess('Invitation marked as sent.');
      }
      load();
    } catch (err) {
      await showApiError(err);
    }
  };

  const copy = async (token) => {
    await navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    await showSuccess('Link copied', 'The invitation link is on your clipboard.');
  };

  const availableGuests = data?.guests.filter((guest) => !data.invitations.some((invitation) => invitation.guest?._id === guest._id)) || [];

  return (
    <div className="mx-auto max-w-[1500px]">
      <PageHeader
        eyebrow="Guest Experience"
        title="Digital Invitations & RSVP"
        description="Create secure invitations from your real guest list and track every response."
        action={<button type="button" onClick={() => { setForm({ guest: '', message: '' }); setFormError(''); }} className="flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white"><FiPlus /> Add Invitation</button>}
      />
      {loading ? <LoadingState /> : error && !data ? <ErrorState message={error} retry={load} /> : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {[['Total', data.summary.total], ['Draft', data.summary.draft], ['Sent', data.summary.sent], ['Accepted', data.summary.accepted], ['Pending RSVP', data.summary.pending], ['Declined', data.summary.declined]].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-xs text-stone-500">{label}</p>
                <p className="mt-2 text-2xl font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Guest Invitations</h2>
            {data.invitations.length ? (
              <div className="mt-3 divide-y divide-stone-100">
                {data.invitations.map((invitation) => (
                  <div key={invitation._id} className="flex flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">{invitation.guest?.firstName} {invitation.guest?.lastName}</p>
                      <p className="mt-1 text-xs capitalize text-stone-500">Invitation: {invitation.status} • RSVP: {invitation.guest?.rsvpStatus}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invitation.status === 'draft' && <button type="button" onClick={() => act(invitation._id, 'send')} className="flex items-center gap-1 rounded-full bg-brand-600 px-3 py-2 text-xs font-semibold text-white"><FiSend /> Mark Sent</button>}
                      <button type="button" onClick={() => copy(invitation.token)} className="flex items-center gap-1 rounded-full border border-stone-200 px-3 py-2 text-xs font-semibold"><FiCopy /> Copy Link</button>
                      {invitation.status !== 'responded' && <button type="button" onClick={() => act(invitation._id, 'delete')} aria-label="Delete invitation" className="rounded-full p-2 text-red-600"><FiTrash2 /></button>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <FiMail className="mx-auto text-3xl text-stone-300" />
                <p className="mt-3 font-semibold">No invitations yet.</p>
                <p className="mt-1 text-sm text-stone-500">Create an invitation for a guest.</p>
              </div>
            )}
          </div>
        </>
      )}

      <FormModal
        isOpen={Boolean(form)}
        onClose={() => setForm(null)}
        title="Add Invitation"
        loading={saving}
        error={formError}
        onSubmit={submit}
        submitLabel="Create Invitation"
      >
        {form ? (
          <>
            <label className="block text-sm font-medium text-stone-700">
              Guest
              <select required value={form.guest} onChange={(e) => setForm({ ...form, guest: e.target.value })} className={fieldClass}>
                <option value="">Select a guest</option>
                {availableGuests.map((guest) => <option key={guest._id} value={guest._id}>{guest.firstName} {guest.lastName}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Message
              <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Custom invitation message" className={`${fieldClass} min-h-28`} />
            </label>
          </>
        ) : null}
      </FormModal>
    </div>
  );
}
