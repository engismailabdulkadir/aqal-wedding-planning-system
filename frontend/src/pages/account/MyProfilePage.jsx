import { useState } from 'react';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import ChangePasswordModal from '../../components/account/ChangePasswordModal.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getDashboardPath } from '../../utils/dashboardPath.js';
import {
  formatMemberSince,
  getAccountStatus,
  getFullName,
  getRoleLabel,
} from '../../utils/userDisplay.js';

function InfoItem({ label, value }) {
  return (
    <div className="rounded-2xl border border-app-border bg-app-inset px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-app-muted">{label}</p>
      <p className="mt-1.5 text-sm font-semibold text-app-text">{value || '—'}</p>
    </div>
  );
}

export default function MyProfilePage() {
  const { user } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);

  if (!user) return null;

  const fullName = getFullName(user);
  const roleLabel = getRoleLabel(user.role);
  const status = getAccountStatus(user);
  const dashboardPath = getDashboardPath(user.role);
  const displayName = fullName || user.username;

  return (
    <div className="mx-auto max-w-5xl">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-6 text-white shadow-soft sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-200">Account Overview</p>
            <h1 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">My Profile</h1>
            <p className="mt-2 truncate text-xl font-semibold text-white/95">{displayName}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                @{user.username}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                {roleLabel}
              </span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white">
                {status}
              </span>
            </div>
          </div>
          <Link
            to={dashboardPath}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-full border border-white/25 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20"
          >
            <FiArrowLeft />
            Back to Dashboard
          </Link>
        </div>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-app-text">Account Information</h2>
          <p className="mt-1 text-sm text-app-muted">
            Personal and access details associated with this account.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <InfoItem label="Full Name" value={fullName} />
            <InfoItem label="Username" value={user.username} />
            <InfoItem label="Role" value={roleLabel} />
            <InfoItem label="Account Status" value={status} />
            <InfoItem label="Password Status" value="Password set" />
            <InfoItem label="Member Since" value={formatMemberSince(user.createdAt)} />
          </div>
        </section>

        <section className="rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm">
          <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-50 text-brand-700">
            <FiShield className="text-lg" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-600">Security</p>
          <h2 className="mt-1 text-lg font-semibold text-app-text">Protect your account</h2>
          <p className="mt-2 text-sm leading-6 text-app-muted">
            Keep your sign-in secure by using a strong password and updating it when necessary.
          </p>
          <div className="mt-5 rounded-2xl border border-app-border bg-app-inset px-4 py-3">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-app-muted">Status</p>
            <p className="mt-1 text-sm font-semibold text-app-text">Password set</p>
          </div>
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="mt-5 w-full rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
          >
            Change Password
          </button>
        </section>
      </div>

      <ChangePasswordModal isOpen={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}
