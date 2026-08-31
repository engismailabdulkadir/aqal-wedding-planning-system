import { getRoleLabel } from './roles.js';

export function getFullName(user) {
  if (!user) return '';
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || '';
}

export function resolveAccountStatus(user) {
  if (!user) return 'inactive';
  if (user.accountStatus) return user.accountStatus;
  return user.isActive ? 'active' : 'blocked';
}

export function getAccountStatusLabel(user) {
  const status = resolveAccountStatus(user);
  if (status === 'inactive') return 'Inactive';
  if (status === 'blocked') return 'Blocked';
  return 'Active';
}

/** Backward-compatible alias used by profile and legacy pages. */
export function getAccountStatus(user) {
  return getAccountStatusLabel(user);
}

export function accountStatusClass(status) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
  if (status === 'inactive') return 'bg-stone-100 text-stone-600 ring-1 ring-stone-200';
  if (status === 'blocked') return 'bg-red-50 text-red-700 ring-1 ring-red-100';
  return 'bg-stone-100 text-stone-600';
}

export function isProtectedAdminUser(user) {
  return String(user?.username || '').toLowerCase() === 'shuriye';
}

export function getProfilePath(role) {
  const normalized = role === 'planner' ? 'wedding_planner' : role;
  if (normalized === 'admin') return '/admin/profile';
  if (normalized === 'wedding_planner') return '/planner/profile';
  if (normalized === 'vendor') return '/vendor/account';
  return '/profile';
}

export function formatMemberSince(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export { getRoleLabel };
