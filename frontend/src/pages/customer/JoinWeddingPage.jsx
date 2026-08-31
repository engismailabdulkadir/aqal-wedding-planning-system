import { useState } from 'react';
import { FiArrowRight, FiHeart, FiKey } from 'react-icons/fi';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/customer/PageState.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import {
  acceptInvitation,
  verifyInviteCode,
} from '../../services/weddingMemberService.js';
import { getApiError } from '../../utils/apiError.js';
import { coupleRoleLabel, normalizeUserRole } from '../../utils/roles.js';
import { formatWeddingDate } from '../../utils/weddingFormat.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';

const inputClass = 'mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-stone-600 dark:bg-stone-900';

export default function JoinWeddingPage() {
  const navigate = useNavigate();
  const { refreshWeddings } = useActiveWedding();
  const { user } = useAuth();
  const userRole = normalizeUserRole(user?.role);
  const [inviteCode, setInviteCode] = useState('');
  const [verifiedInvitation, setVerifiedInvitation] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function clearVerifiedState() {
    setVerifiedInvitation(null);
  }

  async function handleVerify() {
    const code = inviteCode.trim().toUpperCase();
    if (!code) {
      setError('Enter the invite code from your partner.');
      return;
    }
    setError('');
    setVerifying(true);
    try {
      const data = await verifyInviteCode(code);
      if (data.intendedRole && userRole !== data.intendedRole) {
        clearVerifiedState();
        setError(`This invitation is for the ${coupleRoleLabel(data.intendedRole)}.`);
        return;
      }
      setVerifiedInvitation({
        invitation_id: data.invitation_id,
        invite_code: data.invite_code || code,
        intendedRole: data.intendedRole,
        invitedEmail: data.invitedEmail,
        wedding: data.wedding,
      });
      setInviteCode(code);
    } catch (requestError) {
      clearVerifiedState();
      setError(getApiError(requestError));
    } finally {
      setVerifying(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const code = inviteCode.trim().toUpperCase();
    if (!verifiedInvitation) {
      setError('Verify your invite code before joining.');
      return;
    }

    if (code !== verifiedInvitation.invite_code) {
      clearVerifiedState();
      setError('Invite code changed. Please verify the new code before joining.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const data = await acceptInvitation({ inviteCode: verifiedInvitation.invite_code });
      await refreshWeddings(data.wedding?._id);
      await showSuccess('Joined Wedding', 'You are now connected to your shared wedding dashboard.');
      navigate('/dashboard', { state: { message: 'Welcome to your shared wedding dashboard.' } });
    } catch (requestError) {
      setError(getApiError(requestError));
      await showApiError(requestError, 'Could not join wedding');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        eyebrow="Shared Wedding"
        title="Join Existing Wedding"
        description={`Register as ${coupleRoleLabel(userRole)} first, then enter the invite code your partner shared.`}
      />

      <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-stone-100 bg-white p-6 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        {error ? (
          <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <label className="block text-sm font-medium text-stone-700 dark:text-stone-200">
          Invitation Code *
          <input
            required
            value={inviteCode}
            onChange={(event) => {
              setInviteCode(event.target.value.toUpperCase());
              clearVerifiedState();
            }}
            className={inputClass}
            placeholder="e.g. 7P4K8XQ2"
            autoComplete="off"
          />
        </label>

        <button
          type="button"
          onClick={handleVerify}
          disabled={verifying}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-stone-200 px-5 py-2.5 text-sm font-semibold text-stone-700 dark:border-stone-600"
        >
          <FiKey /> {verifying ? 'Checking…' : 'Verify Code'}
        </button>

        {verifiedInvitation?.wedding ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950/20">
            <div className="flex items-start gap-3">
              <FiHeart className="mt-1 text-emerald-600" />
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Wedding found</p>
                <p className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">
                  {verifiedInvitation.wedding.weddingName}
                </p>
                <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
                  {verifiedInvitation.wedding.partner1Name} & {verifiedInvitation.wedding.partner2Name}
                </p>
                <p className="mt-1 text-sm text-stone-500">
                  {formatWeddingDate(verifiedInvitation.wedding.weddingDate)} · {verifiedInvitation.wedding.city}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  Invitation for: <strong>{coupleRoleLabel(verifiedInvitation.intendedRole)}</strong>
                </p>
              </div>
            </div>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={submitting || !verifiedInvitation}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 font-semibold text-white disabled:opacity-60 sm:w-auto"
        >
          Confirm & Join Wedding <FiArrowRight />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-stone-500">
        Want to create your own wedding instead?{' '}
        <Link to="/weddings" className="font-semibold text-brand-700 hover:text-brand-900">
          Go to Our Wedding
        </Link>
      </p>
    </div>
  );
}
