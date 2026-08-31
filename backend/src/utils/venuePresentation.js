import { venueAcceptsQuotes, QUOTE_UNAVAILABLE_MESSAGE } from './venueQuoteReadiness.js';

function money(value) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
}

export function coverForVenue(venue) {
  return venue.coverImage || venue.images?.[0] || venue.galleryImages?.[0] || '';
}

export function galleryForVenue(venue) {
  const images = [
    ...(venue.galleryImages || []),
    ...(venue.images || []),
    venue.coverImage,
  ].filter(Boolean);
  return [...new Set(images)];
}

export function capacitySummary(venue, halls = []) {
  const hallCaps = halls.map((hall) => Number(hall.capacity)).filter((value) => Number.isFinite(value) && value > 0);
  const min = venue.capacityMin ?? (hallCaps.length ? Math.min(...hallCaps) : null);
  const max = venue.capacityMax ?? (hallCaps.length ? Math.max(...hallCaps) : null);
  if (min && max && min !== max) {
    return { min, max, label: `${min}–${max} guests` };
  }
  if (max) return { min: min || max, max, label: `Up to ${max} guests` };
  if (min) return { min, max: min, label: `From ${min} guests` };
  return { min: null, max: null, label: 'Capacity on request' };
}

export function priceSummary(venue, halls = [], slots = []) {
  if (venue.pricePerPerson != null) {
    return {
      quoteRequired: false,
      amount: money(venue.pricePerPerson),
      label: `From $${Number(venue.pricePerPerson)}/person`,
      priceStatus: 'per_person',
    };
  }
  if (venue.priceFrom != null) {
    return {
      quoteRequired: false,
      amount: money(venue.priceFrom),
      label: `From $${Number(venue.priceFrom)}`,
      priceStatus: venue.priceStatus || 'fixed',
    };
  }
  const slotPrices = slots
    .filter((slot) => !slot.quoteRequired && Number(slot.price) > 0)
    .map((slot) => Number(slot.price));
  const hallPrices = halls.flatMap((hall) => [hall.morningPrice, hall.eveningPrice, hall.fullDayPrice]).filter((value) => value != null && Number(value) > 0);
  const priced = [...slotPrices, ...hallPrices];
  if (priced.length) {
    const amount = Math.min(...priced);
    return {
      quoteRequired: false,
      amount,
      label: `From $${amount}`,
      priceStatus: 'slot',
    };
  }
  return {
    quoteRequired: true,
    amount: null,
    label: 'Request Quote',
    priceStatus: venue.priceStatus || 'quote_required',
  };
}

export function amenityList(venue, halls = []) {
  const flags = [
    venue.parking || halls.some((hall) => hall.parking) ? 'Parking' : null,
    venue.airConditioning || halls.some((hall) => hall.airConditioning) ? 'Air Conditioning' : null,
    venue.stage || halls.some((hall) => hall.stage) ? 'Stage' : null,
    venue.soundSystem ? 'Sound System' : null,
    venue.security || halls.some((hall) => hall.security) ? 'Security' : null,
    venue.catering || halls.some((hall) => hall.kitchen) ? 'Catering' : null,
  ].filter(Boolean);
  return [...new Set([...(venue.amenities || []), ...flags])];
}

export function presentVenue(venue, halls = [], slots = []) {
  const capacity = capacitySummary(venue, halls);
  const price = priceSummary(venue, halls, slots);
  const coverImage = coverForVenue(venue);
  const acceptsQuotes = venueAcceptsQuotes(venue);
  return {
    ...venue,
    coverImage,
    galleryImages: galleryForVenue(venue),
    imageIsPlaceholder: venue.imageSource === 'official' ? false : Boolean(venue.imageIsPlaceholder ?? true),
    capacityMin: capacity.min,
    capacityMax: capacity.max,
    capacityLabel: capacity.label,
    priceLabel: acceptsQuotes ? price.label : 'Not Available Yet',
    priceAmount: price.amount,
    quoteRequired: price.quoteRequired,
    acceptsQuotes,
    quoteUnavailableReason: acceptsQuotes ? null : QUOTE_UNAVAILABLE_MESSAGE,
    bookable: acceptsQuotes && Boolean(venue.vendor) && halls.some((hall) => hall.vendor) && !price.quoteRequired,
    amenityList: amenityList(venue, halls),
    halls,
  };
}
