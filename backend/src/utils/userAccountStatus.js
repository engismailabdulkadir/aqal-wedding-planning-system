export const ACCOUNT_STATUSES = ['active', 'inactive', 'blocked'];
export const PROTECTED_ADMIN_USERNAME = 'shuriye';

export function resolveAccountStatus(user) {
  if (!user) return 'inactive';
  if (user.accountStatus && ACCOUNT_STATUSES.includes(user.accountStatus)) {
    return user.accountStatus;
  }
  return user.isActive ? 'active' : 'blocked';
}

export function syncIsActiveFromAccountStatus(accountStatus) {
  return accountStatus === 'active';
}

export function getLoginDeniedMessage(accountStatus) {
  if (accountStatus === 'inactive') {
    return 'Your account is inactive. Please contact the administrator.';
  }
  if (accountStatus === 'blocked') {
    return 'Your account has been blocked. Please contact the administrator.';
  }
  return 'Your account is inactive. Please contact the administrator.';
}

export function isProtectedAdminUser(user) {
  return String(user?.username || '').toLowerCase() === PROTECTED_ADMIN_USERNAME;
}

export function assertValidAccountStatus(status) {
  if (!ACCOUNT_STATUSES.includes(status)) {
    return 'Status must be active, inactive, or blocked';
  }
  return null;
}
