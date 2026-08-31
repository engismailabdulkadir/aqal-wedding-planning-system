import { useState } from 'react';
import { FiCheck, FiCopy, FiUserPlus } from 'react-icons/fi';
import { showSuccess } from '../../utils/alerts.js';

export default function InviteCodeCard({ inviteCode, weddingName }) {
  const [copied, setCopied] = useState(false);

  if (!inviteCode) return null;

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      showSuccess('Copied', 'Invite code copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-5 dark:border-brand-800 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <FiUserPlus className="mt-1 shrink-0 text-brand-600" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">Share with your partner</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">
            Your partner should register their own account, then use <strong>Join Existing Wedding</strong> and enter this code to join {weddingName || 'your wedding'}.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code className="rounded-xl bg-white px-4 py-2 text-lg font-bold tracking-widest text-brand-700 dark:bg-stone-900">
              {inviteCode}
            </code>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:bg-stone-900"
            >
              {copied ? <FiCheck /> : <FiCopy />}
              {copied ? 'Copied' : 'Copy Code'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
