/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { FiCheck, FiUser, FiX } from 'react-icons/fi';
import {
  acceptJoinRequest,
  getJoinRequests,
  rejectJoinRequest,
} from '../../services/weddingMemberService.js';
import { getApiError } from '../../utils/apiError.js';
import { showApiError, showSuccess } from '../../utils/alerts.js';

function requesterName(request) {
  const user = request.requester;
  if (!user) return 'Partner';
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'Partner';
}

export default function JoinRequestsPanel({ weddingId, isOwner }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  useEffect(() => {
    if (!weddingId || !isOwner) {
      setRequests([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError('');
    getJoinRequests(weddingId)
      .then((data) => {
        if (active) setRequests(data.requests || []);
      })
      .catch((requestError) => {
        if (active) setError(getApiError(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [weddingId, isOwner]);

  if (!isOwner) return null;

  async function handleAccept(joinRequestId) {
    setActingId(joinRequestId);
    try {
      await acceptJoinRequest(joinRequestId);
      setRequests((current) => current.filter((item) => item._id !== joinRequestId));
      await showSuccess('Partner Accepted', 'Your partner can now access the shared wedding dashboard.');
    } catch (requestError) {
      await showApiError(requestError, 'Could not accept request');
    } finally {
      setActingId('');
    }
  }

  async function handleReject(joinRequestId) {
    setActingId(joinRequestId);
    try {
      await rejectJoinRequest(joinRequestId);
      setRequests((current) => current.filter((item) => item._id !== joinRequestId));
      await showSuccess('Request Rejected', 'The join request was declined.');
    } catch (requestError) {
      await showApiError(requestError, 'Could not reject request');
    } finally {
      setActingId('');
    }
  }

  if (loading) {
    return (
      <section className="mt-6 rounded-2xl border border-stone-100 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900">
        <p className="text-sm text-stone-500">Checking partner requests…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {error}
      </section>
    );
  }

  if (!requests.length) return null;

  return (
    <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/20">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Partner Join Requests</h3>
      <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">Approve your partner before they can access the shared wedding dashboard.</p>
      <ul className="mt-4 space-y-3">
        {requests.map((request) => (
          <li key={request._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 dark:bg-stone-900">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <FiUser />
              </span>
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-50">{requesterName(request)}</p>
                <p className="text-xs text-stone-500">
                  @{request.requester?.username} · wants to join as {request.requestedRole}
                  {request.invitation?.code ? ` · code ${request.invitation.code}` : ''}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={actingId === request._id}
                onClick={() => handleAccept(request._id)}
                className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                <FiCheck /> Accept
              </button>
              <button
                type="button"
                disabled={actingId === request._id}
                onClick={() => handleReject(request._id)}
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 px-4 py-2 text-sm font-semibold text-stone-700 dark:border-stone-600"
              >
                <FiX /> Reject
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
