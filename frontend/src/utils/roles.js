// Roles-ka system-ka isticmaalo
export const ROLES = {
  ADMIN: 'admin',
  GROOM: 'groom',
  BRIDE: 'bride',
  WEDDING_PLANNER: 'wedding_planner',
  VENDOR: 'vendor',
};

// Roles-ka labada qof ee wedding-ka
export const COUPLE_ROLES = [
  ROLES.GROOM,
  ROLES.BRIDE,
];

// Normalize role si legacy roles loo taageero
export function normalizeUserRole(role) {

  // customer horey loo isticmaali jiray, hadda Groom ayuu noqonayaa
  if (role === 'customer') {
    return ROLES.GROOM;
  }

  // planner horey loo isticmaali jiray, hadda Wedding Planner
  if (role === 'planner') {
    return ROLES.WEDDING_PLANNER;
  }

  return role;
}

// Hubi in user-ku yahay Groom ama Bride
export function isCoupleRole(role) {
  const normalized = normalizeUserRole(role);

  return (
    normalized === ROLES.GROOM ||
    normalized === ROLES.BRIDE
  );
}

// Hubi in user-ku yahay Wedding Planner
export function isWeddingPlannerRole(role) {
  const normalized = normalizeUserRole(role);

  return normalized === ROLES.WEDDING_PLANNER;
}

// Hubi in user-ku leeyahay mid ka mid ah roles-ka la oggol yahay
export function userHasRole(
  userRole,
  allowedRoles
) {
  const normalized =
    normalizeUserRole(userRole);

  return (
    allowedRoles.some(
      (allowed) =>
        normalizeUserRole(allowed) ===
        normalized
    )
    ||
    (
      isCoupleRole(userRole) &&
      allowedRoles.some(
        (allowed) =>
          isCoupleRole(allowed)
      )
    )
  );
}

// Role-ka u beddel magaca user-ku arki karo
export function getRoleLabel(role) {
  const labels = {
    admin: 'Admin',
    groom: 'Groom',
    bride: 'Bride',
    wedding_planner: 'Wedding Planner',
    vendor: 'Vendor',

    // Legacy roles
    customer: 'Groom',
    planner: 'Wedding Planner',
  };

  return (
    labels[normalizeUserRole(role)] ||
    labels[role] ||
    String(role || 'User')
  );
}

// Go'aami dashboard-ka role kasta
export function getDashboardPath(role) {
  const normalized =
    normalizeUserRole(role);

  // Groom iyo Bride dashboard-ka guud
  if (
    normalized === ROLES.GROOM ||
    normalized === ROLES.BRIDE
  ) {
    return '/dashboard';
  }

  // Vendor dashboard
  if (normalized === ROLES.VENDOR) {
    return '/vendor/dashboard';
  }

  // Planner dashboard
  if (
    normalized === ROLES.WEDDING_PLANNER
  ) {
    return '/planner/dashboard';
  }

  // Admin dashboard
  if (normalized === ROLES.ADMIN) {
    return '/admin/dashboard';
  }

  // Haddii role aan la aqoon
  return '/';
}

// Hel role-ka ka soo horjeeda Groom/Bride
export function oppositeCoupleRole(role) {
  const normalized =
    normalizeUserRole(role);

  if (normalized === ROLES.GROOM) {
    return ROLES.BRIDE;
  }

  if (normalized === ROLES.BRIDE) {
    return ROLES.GROOM;
  }

  return null;
}

// Magaca role-ka couple-ka
export function coupleRoleLabel(role) {
  const normalized =
    normalizeUserRole(role);

  if (normalized === ROLES.GROOM) {
    return 'Groom';
  }

  if (normalized === ROLES.BRIDE) {
    return 'Bride';
  }

  return 'Partner';
}