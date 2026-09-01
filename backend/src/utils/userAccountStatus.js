// ============================================================
// ACCOUNT STATUS
// ============================================================

// Saddex xaaladood oo account-ku yeelan karo
export const ACCOUNT_STATUSES = [
  'active',
  'inactive',
  'blocked',
];


// Username-ka admin-ka la ilaaliyo
export const PROTECTED_ADMIN_USERNAME = 'shuriye';


// ============================================================
// RESOLVE ACCOUNT STATUS
// ============================================================

// Function-kan wuxuu go'aamiyaa xaaladda saxda ah ee account-ka.
export function resolveAccountStatus(user) {

  // Haddii user aanu jirin
  if (!user) return 'inactive';

  // Haddii accountStatus sax yahay
  if (
    user.accountStatus &&
    ACCOUNT_STATUSES.includes(user.accountStatus)
  ) {
    return user.accountStatus;
  }

  // Haddii accountStatus hore u jirin,
  // isActive ayaa laga go'aaminayaa.
  return user.isActive
    ? 'active'
    : 'blocked';
}


// accountStatus -> isActive
export function syncIsActiveFromAccountStatus(
  accountStatus
) {

  return accountStatus === 'active';
}


// ============================================================
// LOGIN DENIED MESSAGE
// ============================================================

// Message-ka user-ka loo soo bandhigayo marka login la diido.
export function getLoginDeniedMessage(
  accountStatus
) {

  if (accountStatus === 'inactive') {
    return 'Your account is inactive. Please contact the administrator.';
  }

  if (accountStatus === 'blocked') {
    return 'Your account has been blocked. Please contact the administrator.';
  }

  return 'Your account is inactive. Please contact the administrator.';
}


// ============================================================
// PROTECTED ADMIN
// ============================================================

// Hubi admin-ka protected-ka ah.
export function isProtectedAdminUser(user) {

  return (
    String(user?.username || '').toLowerCase() ===
    PROTECTED_ADMIN_USERNAME
  );
}


// ============================================================
// VALIDATE ACCOUNT STATUS
// ============================================================

// Hubi status-ka inuu yahay mid system-ku aqbalayo.
export function assertValidAccountStatus(status) {

  if (!ACCOUNT_STATUSES.includes(status)) {
    return 'Status must be active, inactive, or blocked';
  }

  return null;
}