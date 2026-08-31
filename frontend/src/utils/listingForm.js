/** Availability type + category defaults for vendor listing forms. */

export const INVENTORY_CATEGORIES = new Set([
  'groom_suit',
  'groom_shoes',
  'groom_accessories',
  'groom_package',
  'groom_attire',
  'bride_dress',
  'bride_traditional',
  'bride_accessories',
  'bride_package',
  'bride_shoes',
  'accessories',
  'cake',
]);

export const APPOINTMENT_CATEGORIES = new Set([
  'makeup',
  'hair',
  'henna',
  'photography',
  'videography',
  'groom_salon',
  'bridal_salon',
  'decoration',
]);

export const AVAILABILITY_UI_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'hall_slots', label: 'Hall time slots' },
  { value: 'inventory', label: 'Inventory / quantity' },
  { value: 'appointment', label: 'Appointment' },
];

export function apiAvailabilityType(uiValue) {
  if (uiValue === 'hall_slots') return 'slot';
  return uiValue || 'none';
}

export function uiAvailabilityType(apiValue) {
  if (apiValue === 'slot') return 'hall_slots';
  return apiValue || 'none';
}

export function defaultAvailabilityForCategory(category) {
  if (category === 'venue' || category === 'hall') return 'hall_slots';
  if (INVENTORY_CATEGORIES.has(category)) return 'inventory';
  if (APPOINTMENT_CATEGORIES.has(category)) return 'appointment';
  return 'none';
}

export function calcFullDayPrice(morning, evening) {
  const m = Number(morning);
  const e = Number(evening);
  if (!Number.isFinite(m) || !Number.isFinite(e)) return null;
  return m + e;
}

export function isVenueCategory(category) {
  return category === 'venue' || category === 'hall';
}

export const LISTING_CATEGORY_LABELS = {
  venue: 'Wedding Hall / Venue',
  hall: 'Wedding Hall / Venue',
  groom_package: 'Groom Package',
  bride_package: 'Bride Package',
  cake: 'Wedding Cake',
  makeup: 'Makeup & Beauty',
  photography: 'Photography',
  decoration: 'Decoration',
};

/** Permanent server paths only — never blob: preview URLs. */
export function normalizeListingImages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((path) => typeof path === 'string' && path.trim())
    .map((path) => path.trim())
    .filter((path) => !path.startsWith('blob:'));
}
