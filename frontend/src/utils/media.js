export const GENERIC_VENUE_IMAGE = 'https://images.unsplash.com/photo-1519167758481-83f29da8c2b0?auto=format&fit=crop&w=1400&q=80';

export const SERVICE_CATEGORY_IMAGES = {
  hall: 'https://images.unsplash.com/photo-1519167758481-83f29da8c2b0?auto=format&fit=crop&w=900&q=80',
  bride_dress: 'https://images.unsplash.com/photo-1515372039744-b8f0229ddc70?auto=format&fit=crop&w=900&q=80',
  bride_shoes: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=900&q=80',
  accessories: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
  bridal_salon: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  makeup: 'https://images.unsplash.com/photo-1487412912498-0447578fcca8?auto=format&fit=crop&w=900&q=80',
  hair: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=900&q=80',
  bouquet: 'https://images.unsplash.com/photo-1522673607200-164d1b6ce486?auto=format&fit=crop&w=900&q=80',
  flowers: 'https://images.unsplash.com/photo-1468327768560-75b95a3bf480?auto=format&fit=crop&w=900&q=80',
  groom_attire: 'https://images.unsplash.com/photo-1594938291221-94d09e0c32e3?auto=format&fit=crop&w=900&q=80',
  groom_shoes: 'https://images.unsplash.com/photo-1449505278894-297fdb3edbc1?auto=format&fit=crop&w=900&q=80',
  groom_salon: 'https://images.unsplash.com/photo-1621605815971-fbc54d83437f?auto=format&fit=crop&w=900&q=80',
  decoration: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
  catering: 'https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80',
  photography: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
  videography: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80',
  cake: 'https://images.unsplash.com/photo-1535254973040-607b474cb50d?auto=format&fit=crop&w=900&q=80',
  transportation: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
  invitation: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=900&q=80',
  entertainment: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80',
  accommodation: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80',
  equipment: 'https://images.unsplash.com/photo-1516035069371-29a1b244b32a?auto=format&fit=crop&w=900&q=80',
  other: GENERIC_VENUE_IMAGE,
};

export const SERVICE_LABELS = {
  venue: 'Wedding Hall',
  hall: 'Wedding Hall',
  groom_package: 'Groom Package',
  groom_suit: 'Groom Suit',
  groom_shoes: 'Groom Shoes',
  groom_accessories: 'Groom Accessories',
  bride_package: 'Bride Package',
  bride_dress: 'Bride Dress',
  bride_traditional: 'Traditional Dress',
  bride_accessories: 'Bride Accessories',
  henna: 'Henna',
  bride_dress: 'Bride Dress',
  bride_shoes: 'Bride Shoes',
  accessories: 'Accessories',
  bridal_salon: 'Bridal Salon',
  makeup: 'Makeup',
  hair: 'Hair',
  bouquet: 'Bouquet',
  flowers: 'Flowers',
  groom_attire: 'Groom Attire',
  groom_shoes: 'Groom Shoes',
  groom_salon: 'Groom Salon',
  decoration: 'Decoration',
  catering: 'Catering',
  photography: 'Photography',
  videography: 'Videography',
  cake: 'Wedding Cake',
  transportation: 'Transport',
  invitation: 'Invitations',
  entertainment: 'Entertainment',
  accommodation: 'Accommodation',
  equipment: 'Equipment',
  other: 'Other',
};

export function thumbnailUrl(url, width = 800) {
  if (!url) return GENERIC_VENUE_IMAGE;
  if (url.includes('images.unsplash.com')) {
    const clean = url.split('?')[0];
    return `${clean}?auto=format&fit=crop&w=${width}&q=70`;
  }
  return resolveMediaUrl(url);
}

/** Backend origin (no /api/v1) for absolute media URLs in production. */
export function getBackendOrigin() {
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
  return apiBase.replace(/\/api\/v1\/?$/, '');
}

/** Resolve local /uploads paths and frontend /assets paths to full URLs. */
export function resolveMediaUrl(url) {
  if (!url) return '';
  if (url.startsWith('blob:')) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/assets/')) {
    return url;
  }
  if (url.startsWith('/uploads/')) {
    // Dev: Vite proxies /uploads to the backend (same-origin, avoids CORP issues)
    if (import.meta.env.DEV) {
      return url;
    }
    return `${getBackendOrigin()}${url}`;
  }
  if (url.startsWith('/')) return url;
  return url;
}

export function venueCover(venue) {
  return venue?.coverImage || venue?.images?.[0] || venue?.galleryImages?.[0] || GENERIC_VENUE_IMAGE;
}

/** First stored image path on a listing (supports legacy field names). */
export function getListingImagePath(listing) {
  if (!listing) return null;
  if (Array.isArray(listing.images) && listing.images.length) return listing.images[0];
  if (listing.imageUrl) return listing.imageUrl;
  if (listing.image_url) return listing.image_url;
  if (listing.image) return listing.image;
  return null;
}

/** Full URL for a listing's main image (backend origin for /uploads paths). */
export function getListingImageUrl(listingOrPath) {
  const path = typeof listingOrPath === 'string'
    ? listingOrPath
    : getListingImagePath(listingOrPath);
  return path ? resolveMediaUrl(path) : '';
}

export function listingCover(listing) {
  return getListingImagePath(listing) || SERVICE_CATEGORY_IMAGES[listing?.category] || GENERIC_VENUE_IMAGE;
}

export function isPlaceholderImage(entity) {
  if (!entity) return true;
  if (entity.imageSource === 'official') return false;
  return entity.imageIsPlaceholder !== false;
}
