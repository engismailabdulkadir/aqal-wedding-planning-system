/**
 * Inventory vendors and listings — identifies demo vs real records.
 * Run: node scripts/inventory-marketplace-data.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import WeddingListing from '../src/models/WeddingListing.js';
import Booking from '../src/models/Booking.js';

dotenv.config({ override: true });
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_planning';

function isDemoEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  return e.endsWith('@seed.test') || e.endsWith('@test.local');
}

await mongoose.connect(MONGO);

const vendors = await User.find({ role: 'vendor' }).select('email username firstName lastName createdAt').lean();
const profiles = await VendorProfile.find().populate('user', 'email username').lean();
const listings = await WeddingListing.find().populate('vendor', 'email username').lean();
const bookings = await Booking.find().select('serviceName vendor listing status').populate('vendor', 'email').populate('listing', 'name').lean();

console.log('=== VENDORS ===');
for (const v of vendors) {
  console.log(`${isDemoEmail(v.email) ? 'DEMO' : 'REAL'} | ${v.email} | ${v.username} | ${v.firstName} ${v.lastName}`);
}

console.log('\n=== LISTINGS ===');
for (const l of listings) {
  const owner = l.vendor?.email || l.vendor;
  console.log(`${isDemoEmail(owner) ? 'DEMO' : 'REAL'} | ${l.name} | cat=${l.category} | status=${l.status} | active=${l.active} | vendor=${owner}`);
}

console.log('\n=== BOOKINGS (listing-based) ===');
for (const b of bookings) {
  const vEmail = b.vendor?.email;
  const listingName = b.listing?.name || '—';
  const demo = isDemoEmail(vEmail) || (b.listing && listings.find((x) => String(x._id) === String(b.listing?._id || b.listing) && isDemoEmail(x.vendor?.email)));
  console.log(`${demo ? 'DEMO' : 'REAL'} | ${b.serviceName} | listing=${listingName} | vendor=${vEmail} | status=${b.status}`);
}

console.log('\nCounts:', {
  vendors: vendors.length,
  demoVendors: vendors.filter((v) => isDemoEmail(v.email)).length,
  realVendors: vendors.filter((v) => !isDemoEmail(v.email)).length,
  listings: listings.length,
  demoListings: listings.filter((l) => isDemoEmail(l.vendor?.email)).length,
  realListings: listings.filter((l) => !isDemoEmail(l.vendor?.email)).length,
  bookings: bookings.length,
});

await mongoose.disconnect();
