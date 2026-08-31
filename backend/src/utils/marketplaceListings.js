import { LISTING_CATEGORIES } from '../models/WeddingListing.js';

/** Customer marketplace category groups → listing.category values */
export const MARKETPLACE_CATEGORY_GROUPS = {
  venue: ['venue', 'hall'],
  groom: ['groom_suit', 'groom_shoes', 'groom_accessories', 'groom_package', 'groom_attire', 'groom_salon'],
  bride: ['bride_dress', 'bride_traditional', 'bride_accessories', 'bride_package', 'bride_shoes', 'accessories', 'bridal_salon', 'bouquet'],
  cakes: ['cake'],
  decoration: ['decoration', 'flowers'],
  photography: ['photography', 'videography'],
  beauty: ['makeup', 'hair', 'henna'],
  catering: ['catering'],
  transportation: ['transportation'],
  entertainment: ['entertainment', 'invitation'],
  other: ['other', 'equipment', 'accommodation'],
};

const GROUP_ALIASES = {
  halls: 'venue',
  hall: 'venue',
  wedding_hall: 'venue',
  wedding_halls: 'venue',
  cakes: 'cakes',
  cake: 'cakes',
  groom_suit: 'groom',
  bride_dress: 'bride',
};

export function resolveMarketplaceCategoryFilter(category) {
  const raw = String(category || '').trim().toLowerCase();
  if (!raw || raw === 'all') return null;
  const key = GROUP_ALIASES[raw] || raw;
  if (MARKETPLACE_CATEGORY_GROUPS[key]) {
    return { $in: MARKETPLACE_CATEGORY_GROUPS[key] };
  }
  if (LISTING_CATEGORIES.includes(key)) return key;
  return key;
}

export function publishableVendorFilter() {
  return {
    active: true,
    verificationStatus: { $nin: ['rejected', 'suspended'] },
  };
}

export function activeListingFilter() {
  return {
    active: true,
    available: true,
    status: 'active',
  };
}
