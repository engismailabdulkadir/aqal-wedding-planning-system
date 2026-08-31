export const ROLES = {
  ADMIN: 'admin',
  GROOM: 'groom',
  BRIDE: 'bride',
  WEDDING_PLANNER: 'wedding_planner',
  VENDOR: 'vendor',
};

export const COUPLE_ROLES = [ROLES.GROOM, ROLES.BRIDE];

export function normalizeUserRole(role) {
  if (role === 'customer') return ROLES.GROOM;
  if (role === 'planner') return ROLES.WEDDING_PLANNER;
  return role;
}

export function isCoupleRole(role) {
  const normalized = normalizeUserRole(role);
  return normalized === ROLES.GROOM || normalized === ROLES.BRIDE;
}

export function isWeddingPlannerRole(role) {
  const normalized = normalizeUserRole(role);
  return normalized === ROLES.WEDDING_PLANNER;
}

export function userHasRole(userRole, allowedRoles) {
  const normalized = normalizeUserRole(userRole);
  return allowedRoles.some((allowed) => normalizeUserRole(allowed) === normalized)
    || (isCoupleRole(userRole) && allowedRoles.some((allowed) => isCoupleRole(allowed)));
}

export function getRoleLabel(role) {
  const labels = {
    admin: 'Admin',
    groom: 'Groom',
    bride: 'Bride',
    wedding_planner: 'Wedding Planner',
    vendor: 'Vendor',
    customer: 'Groom',
    planner: 'Wedding Planner',
  };
  return labels[normalizeUserRole(role)] || labels[role] || String(role || 'User');
}

export function getDashboardPath(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === ROLES.GROOM || normalized === ROLES.BRIDE) return '/dashboard';
  if (normalized === ROLES.VENDOR) return '/vendor/dashboard';
  if (normalized === ROLES.WEDDING_PLANNER) return '/planner/dashboard';
  if (normalized === ROLES.ADMIN) return '/admin/dashboard';
  return '/';
}

export function oppositeCoupleRole(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === ROLES.GROOM) return ROLES.BRIDE;
  if (normalized === ROLES.BRIDE) return ROLES.GROOM;
  return null;
}

export function coupleRoleLabel(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === ROLES.GROOM) return 'Groom';
  if (normalized === ROLES.BRIDE) return 'Bride';
  return 'Partner';
}
