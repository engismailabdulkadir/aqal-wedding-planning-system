import { useState } from 'react';
import { FiMail, FiUserPlus } from 'react-icons/fi';
import { createPartnerInvite } from '../../services/weddingMemberService.js';
import { coupleRoleLabel } from '../../utils/roles.js';
import { getApiError } from '../../utils/apiError.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';

const inputClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-600 dark:bg-stone-900';

export default function InvitePartnerCard({ weddingId, weddingName, partnerRole, existingInvite }) {
  const [partnerEmail, setPartnerEmail] = useState(existingInvite?.invitedEmail || '');
  const [invite, setInvite] = useState(existingInvite || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!partnerRole) return null;

  async function handleInvite(event) {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const data = await createPartnerInvite(weddingId, partnerEmail.trim());
      setInvite(data.invite);
      await showSuccess('Invite Created', data.message);
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError, 'Could not create invite');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <FiUserPlus className="mt-1 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Invite your {coupleRoleLabel(partnerRole)}</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            Enter your partner&apos;s email for {weddingName || 'your wedding'}. They must register as <strong>{coupleRoleLabel(partnerRole)}</strong> and use the invite code.
          </p>

          <form onSubmit={handleInvite} className="mt-4 space-y-3">
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
              Partner Email
              <span className="relative mt-2 block">
                <FiMail className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  required
                  type="email"
                  value={partnerEmail}
                  onChange={(event) => setPartnerEmail(event.target.value)}
                  className={`${inputClass} pl-11`}
                  placeholder={`${coupleRoleLabel(partnerRole)} email`}
                />
              </span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Creating…' : 'Generate Invite Code'}
            </button>
          </form>

          {invite?.code ? (
            <div className="mt-4 rounded-xl bg-white px-4 py-3 dark:bg-stone-900">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-400">Invite Code</p>
              <p className="mt-1 text-2xl font-bold tracking-widest text-brand-700">{invite.code}</p>
              <p className="mt-1 text-xs text-stone-500">For {coupleRoleLabel(invite.intendedRole)} · expires {new Date(invite.expiresAt).toLocaleDateString()}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
