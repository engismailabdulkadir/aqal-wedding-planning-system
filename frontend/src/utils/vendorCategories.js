/** Labels for backend VendorProfile.category enum values. */
export const VENDOR_PROFILE_CATEGORIES = [
  { value: 'venue', label: 'Wedding Hall / Venue' },
  { value: 'decoration', label: 'Decoration' },
  { value: 'groom attire', label: 'Groom Clothing' },
  { value: 'wedding dress', label: 'Bride Clothing' },
  { value: 'wedding cake', label: 'Cake & Bakery' },
  { value: 'photography', label: 'Photography' },
  { value: 'videography', label: 'Videography' },
  { value: 'makeup & beauty', label: 'Makeup & Beauty' },
  { value: 'catering', label: 'Catering' },
  { value: 'transportation', label: 'Transportation' },
  { value: 'florist', label: 'Florist / Flowers' },
  { value: 'entertainment / dj', label: 'Entertainment / DJ' },
  { value: 'accommodation', label: 'Accommodation' },
  { value: 'event equipment', label: 'Event Equipment' },
  { value: 'other', label: 'Other Wedding Services' },
];

export const VENDOR_CATEGORY_VALUES = VENDOR_PROFILE_CATEGORIES.map((item) => item.value);

const LEGACY_ALIASES = {
  groom_clothing: 'groom attire',
  groom_attire: 'groom attire',
  bride_clothing: 'wedding dress',
  cake: 'wedding cake',
  makeup: 'makeup & beauty',
  accessories: 'event equipment',
  jewelry: 'event equipment',
  hall: 'venue',
  value: 'other',
};

export function normalizeVendorCategory(value) {
  const normalized = String(value || '').toLowerCase().trim();
  if (VENDOR_CATEGORY_VALUES.includes(normalized)) return normalized;
  if (LEGACY_ALIASES[normalized]) return LEGACY_ALIASES[normalized];
  return 'other';
}

export function getVendorCategoryLabel(value) {
  const normalized = normalizeVendorCategory(value);
  return VENDOR_PROFILE_CATEGORIES.find((item) => item.value === normalized)?.label || normalized;
}

export function buildVendorProfilePayload(form) {
  return {
    businessName: form.businessName?.trim() || '',
    ownerName: form.ownerName?.trim() || '',
    category: normalizeVendorCategory(form.category),
    description: form.description || '',
    phone: form.phone || '',
    email: form.email || '',
    city: form.city?.trim() || '',
    address: form.address || '',
    logo: form.logo || '',
    coverImage: form.coverImage || '',
  };
}
