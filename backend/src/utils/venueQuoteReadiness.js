import VendorProfile from '../models/VendorProfile.js';
import User from '../models/User.js';

export const QUOTE_UNAVAILABLE_MESSAGE = 'This venue is not currently accepting quote requests.';

/**
 * A venue accepts customer quote requests only when it has an active, verified vendor.
 * Verified = VendorProfile.verified OR verificationStatus === 'approved'.
 */
export function isActiveVerifiedVendorProfile(profile, vendorUser = null) {
  if (!profile) return false;
  if (profile.active === false) return false;
  const verified = Boolean(profile.verified) || profile.verificationStatus === 'approved';
  if (!verified) return false;
  if (vendorUser && vendorUser.isActive === false) return false;
  return true;
}

export function venueAcceptsQuotes(venue, { profile = null, vendorUser = null } = {}) {
  if (!venue) return false;
  if (!venue.vendor) return false;
  if (venue.status && venue.status !== 'active') return false;
  if (venue.ownershipStatus === 'unclaimed') return false;

  const resolvedProfile = profile
    || (venue.vendorProfile && typeof venue.vendorProfile === 'object' ? venue.vendorProfile : null);

  if (!resolvedProfile) return false;
  return isActiveVerifiedVendorProfile(resolvedProfile, vendorUser);
}

export async function resolveVenueQuoteReadiness(venue) {
  if (!venue?.vendor) {
    return {
      acceptsQuotes: false,
      quoteUnavailableReason: QUOTE_UNAVAILABLE_MESSAGE,
      vendorProfile: null,
    };
  }

  let profile = venue.vendorProfile && typeof venue.vendorProfile === 'object' && venue.vendorProfile.verificationStatus !== undefined
    ? venue.vendorProfile
    : null;

  if (!profile) {
    const profileId = venue.vendorProfile?._id || venue.vendorProfile || null;
    profile = profileId
      ? await VendorProfile.findById(profileId).select('businessName verified verificationStatus active user')
      : await VendorProfile.findOne({ user: venue.vendor }).select('businessName verified verificationStatus active user');
  }

  const vendorUser = await User.findById(venue.vendor).select('isActive role');
  const acceptsQuotes = venueAcceptsQuotes(venue, { profile, vendorUser });

  return {
    acceptsQuotes,
    quoteUnavailableReason: acceptsQuotes ? null : QUOTE_UNAVAILABLE_MESSAGE,
    vendorProfile: profile,
  };
}
