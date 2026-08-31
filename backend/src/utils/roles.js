export const ROLES = {
  ADMIN: 'admin',
  GROOM: 'groom',
  BRIDE: 'bride',
  WEDDING_PLANNER: 'wedding_planner',
  VENDOR: 'vendor',
};

export const COUPLE_ROLES = [ROLES.GROOM, ROLES.BRIDE];
export const PUBLIC_REGISTER_ROLES = [ROLES.GROOM, ROLES.BRIDE, ROLES.WEDDING_PLANNER, ROLES.VENDOR];

const LEGACY_CUSTOMER = 'customer';
const LEGACY_PLANNER = 'planner';

export function normalizeUserRole(role) {
  if (role === LEGACY_CUSTOMER) return ROLES.GROOM;
  if (role === LEGACY_PLANNER) return ROLES.WEDDING_PLANNER;
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

export function roleMatches(userRole, allowedRole) {
  const userNorm = normalizeUserRole(userRole);
  const allowedNorm = normalizeUserRole(allowedRole);
  if (userNorm === allowedNorm) return true;
  if (isCoupleRole(userRole) && isCoupleRole(allowedRole)) return true;
  return false;
}

export function userHasRole(userRole, allowedRoles) {
  return allowedRoles.some((allowed) => roleMatches(userRole, allowed));
}

export function expandAllowedRoles(roles) {
  const expanded = new Set();
  for (const role of roles) {
    if (role === LEGACY_CUSTOMER || role === ROLES.GROOM || role === ROLES.BRIDE) {
      expanded.add(ROLES.GROOM);
      expanded.add(ROLES.BRIDE);
      continue;
    }
    if (role === LEGACY_PLANNER || role === ROLES.WEDDING_PLANNER) {
      expanded.add(ROLES.WEDDING_PLANNER);
      expanded.add(LEGACY_PLANNER);
      continue;
    }
    expanded.add(role);
  }
  return [...expanded];
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

export function bookingOwnerFromUserRole(role) {
  const normalized = normalizeUserRole(role);
  if (normalized === ROLES.GROOM) return 'groom';
  if (normalized === ROLES.BRIDE) return 'bride';
  return 'shared';
}

export const COUPLE_ROLE_QUERY = { $in: [ROLES.GROOM, ROLES.BRIDE] };

export const GROOM_BOOKING_CATEGORIES = [
  'groom_suit',
  'groom_shoes',
  'groom_watch',
  'groom_accessories',
  'groom_grooming',
  'groom_transportation',
  'groom_other',
  'groom_attire',
  'groom_shoes_legacy',
];

export const BRIDE_BOOKING_CATEGORIES = [
  'wedding_dress',
  'bride_shoes',
  'makeup',
  'hair',
  'jewelry',
  'henna',
  'bride_accessories',
  'bride_transportation',
  'bride_other',
  'bride_dress',
  'bridal_salon',
  'bouquet',
];

export const BOOKING_OWNERS = ['groom', 'bride', 'shared'];

const LEGACY_REJECTED_ROLES = new Set([
  LEGACY_CUSTOMER,
  'couple',
  'couple_customer',
  'couple / customer',
]);

/**
 * Parse and validate a role from public registration payload.
 * Accepts `role` or `account_type`. Returns normalized role or null if invalid/forbidden.
 */
export function parsePublicRegistrationRole(input, { allowLegacyPlanner = true } = {}) {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return ROLES.GROOM;

  if (raw === ROLES.ADMIN) return null;

  if (LEGACY_REJECTED_ROLES.has(raw)) return null;

  if (allowLegacyPlanner && raw === LEGACY_PLANNER) return ROLES.WEDDING_PLANNER;

  if (PUBLIC_REGISTER_ROLES.includes(raw)) return raw;

  return null;
}

export function isPublicRegistrationRole(role) {
  return parsePublicRegistrationRole(role) !== null;
}

