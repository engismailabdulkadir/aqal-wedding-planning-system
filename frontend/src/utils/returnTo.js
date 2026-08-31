const ALLOWED_RETURN_PREFIXES = [
  '/venues',
  '/weddings/new',
  '/wedding/create',
  '/workspace',
  '/services',
  '/vendors',
  '/bookings',
  '/halls',
  '/dashboard',
];

export function parseReturnTo(returnTo) {
  if (!returnTo || typeof returnTo !== 'string') return null;
  if (!returnTo.startsWith('/') || returnTo.startsWith('//')) return null;
  const [path] = returnTo.split('?');
  const allowed = ALLOWED_RETURN_PREFIXES.some((prefix) => {
    if (path === prefix) return true;
    if (prefix.endsWith('/') && path.startsWith(prefix)) return true;
    return path.startsWith(`${prefix}/`);
  });
  return allowed ? returnTo : null;
}

export function buildWeddingEditPath(weddingId, { returnTo, focus } = {}) {
  const params = new URLSearchParams();
  const safeReturn = parseReturnTo(returnTo);
  if (safeReturn) params.set('returnTo', safeReturn);
  if (focus) params.set('focus', focus);
  const query = params.toString();
  return `/weddings/${weddingId}/edit${query ? `?${query}` : ''}`;
}

export function buildVenueReturnPath(venueId, { date } = {}) {
  const base = `/venues/${venueId}`;
  if (!date) return base;
  return `${base}?date=${encodeURIComponent(date)}`;
}
