// ============================================================
// USER ROLES
// ============================================================

// Dhammaan roles-ka system-ka
export const ROLES = {
  ADMIN: 'admin',
  GROOM: 'groom',
  BRIDE: 'bride',
  WEDDING_PLANNER: 'wedding_planner',
  VENDOR: 'vendor',
};


// Groom iyo Bride waxaa loo arkaa Couple roles
export const COUPLE_ROLES = [
  ROLES.GROOM,
  ROLES.BRIDE,
];


// Roles-ka qofku public ahaan iska register-gareyn karo
// Admin halkan kuma jiro.
export const PUBLIC_REGISTER_ROLES = [
  ROLES.GROOM,
  ROLES.BRIDE,
  ROLES.WEDDING_PLANNER,
  ROLES.VENDOR,
];


// Roles-kii hore ee system-ka
const LEGACY_CUSTOMER = 'customer';
const LEGACY_PLANNER = 'planner';


// ============================================================
// ROLE NORMALIZATION
// ============================================================

// Haddii system-kii hore uu leeyahay customer,
// waxaa loo beddelayaa groom.
export function normalizeUserRole(role) {

  if (role === LEGACY_CUSTOMER) {
    return ROLES.GROOM;
  }

  // planner-kii hore waxaa loo beddelayaa wedding_planner
  if (role === LEGACY_PLANNER) {
    return ROLES.WEDDING_PLANNER;
  }

  return role;
}


// ============================================================
// COUPLE ROLE CHECK
// ============================================================

// Hubi user-ku inuu yahay Groom ama Bride.
export function isCoupleRole(role) {

  const normalized = normalizeUserRole(role);

  return (
    normalized === ROLES.GROOM ||
    normalized === ROLES.BRIDE
  );
}


// ============================================================
// WEDDING PLANNER ROLE CHECK
// ============================================================

// Hubi user-ku inuu yahay Wedding Planner.
export function isWeddingPlannerRole(role) {

  const normalized = normalizeUserRole(role);

  return normalized === ROLES.WEDDING_PLANNER;
}


// ============================================================
// ROLE MATCHING
// ============================================================

// Hubi user role iyo allowed role inay isku mid yihiin.
export function roleMatches(userRole, allowedRole) {

  const userNorm = normalizeUserRole(userRole);
  const allowedNorm = normalizeUserRole(allowedRole);

  // Haddii roles-ku isku mid yihiin
  if (userNorm === allowedNorm) return true;

  // Groom iyo Bride labaduba couple ayay yihiin
  if (
    isCoupleRole(userRole) &&
    isCoupleRole(allowedRole)
  ) {
    return true;
  }

  return false;
}


// ============================================================
// USER HAS ROLE
// ============================================================

// Hubi user-ka inuu leeyahay mid ka mid ah roles-ka la oggol yahay.
export function userHasRole(userRole, allowedRoles) {

  return allowedRoles.some(
    (allowed) => roleMatches(userRole, allowed)
  );
}


// ============================================================
// EXPAND ALLOWED ROLES
// ============================================================

// Role-yada qaarkood waxaa loo beddelayaa roles badan.
// Tusaale:
// groom -> groom + bride
export function expandAllowedRoles(roles) {

  const expanded = new Set();

  for (const role of roles) {

    // Customer/Groom/Bride dhammaantood couple ayay yihiin
    if (
      role === LEGACY_CUSTOMER ||
      role === ROLES.GROOM ||
      role === ROLES.BRIDE
    ) {

      expanded.add(ROLES.GROOM);
      expanded.add(ROLES.BRIDE);

      continue;
    }


    // Planner-kii hore iyo Wedding Planner
    if (
      role === LEGACY_PLANNER ||
      role === ROLES.WEDDING_PLANNER
    ) {

      expanded.add(ROLES.WEDDING_PLANNER);
      expanded.add(LEGACY_PLANNER);

      continue;
    }


    // Role kasta oo kale sida admin/vendor
    expanded.add(role);
  }

  return [...expanded];
}


// ============================================================
// OPPOSITE COUPLE ROLE
// ============================================================

// Haddii user-ku Groom yahay -> Bride
// Haddii Bride yahay -> Groom
export function oppositeCoupleRole(role) {

  const normalized = normalizeUserRole(role);

  if (normalized === ROLES.GROOM) {
    return ROLES.BRIDE;
  }

  if (normalized === ROLES.BRIDE) {
    return ROLES.GROOM;
  }

  return null;
}


// ============================================================
// ROLE LABEL
// ============================================================

// Role technical ah u beddel magaca user-ku arki karo.
export function coupleRoleLabel(role) {

  const normalized = normalizeUserRole(role);

  if (normalized === ROLES.GROOM) {
    return 'Groom';
  }

  if (normalized === ROLES.BRIDE) {
    return 'Bride';
  }

  return 'Partner';
}


// ============================================================
// BOOKING OWNER
// ============================================================

// Go'aami cidda booking-ka iska leh.
export function bookingOwnerFromUserRole(role) {

  const normalized = normalizeUserRole(role);

  if (normalized === ROLES.GROOM) {
    return 'groom';
  }

  if (normalized === ROLES.BRIDE) {
    return 'bride';
  }

  return 'shared';
}


// Query loo isticmaali karo marka la raadinayo Groom ama Bride
export const COUPLE_ROLE_QUERY = {
  $in: [
    ROLES.GROOM,
    ROLES.BRIDE,
  ],
};


// Categories-ka booking-ka Groom
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


// Categories-ka booking-ka Bride
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


// Booking ownership options
export const BOOKING_OWNERS = [
  'groom',
  'bride',
  'shared',
];


// Roles-kii hore ee aan public registration loo oggolayn
const LEGACY_REJECTED_ROLES = new Set([
  LEGACY_CUSTOMER,
  'couple',
  'couple_customer',
  'couple / customer',
]);


// ============================================================
// PUBLIC REGISTRATION ROLE
// ============================================================

// Function-kan wuxuu hubiyaa role-ka qofku dooranayo marka uu signup sameynayo.
export function parsePublicRegistrationRole(
  input,
  { allowLegacyPlanner = true } = {}
) {

  // Role-ka lowercase iyo trim
  const raw = String(input ?? '')
    .trim()
    .toLowerCase();

  // Haddii role la waayo default-ku waa Groom
  if (!raw) return ROLES.GROOM;

  // Admin public ahaan lama sameyn karo
  if (raw === ROLES.ADMIN) return null;

  // Roles-kii hore qaarkood waa la diiday
  if (LEGACY_REJECTED_ROLES.has(raw)) return null;

  // planner-kii hore -> wedding_planner
  if (
    allowLegacyPlanner &&
    raw === LEGACY_PLANNER
  ) {
    return ROLES.WEDDING_PLANNER;
  }

  // Hubi inuu role-ku ku jiro public roles
  if (PUBLIC_REGISTER_ROLES.includes(raw)) {
    return raw;
  }

  return null;
}


// Hubi role-ku inuu public registration sax u yahay
export function isPublicRegistrationRole(role) {

  return parsePublicRegistrationRole(role) !== null;
}