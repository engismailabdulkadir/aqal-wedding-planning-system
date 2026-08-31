/**
 * Remove demo/seed/test marketplace data while preserving real registered vendors.
 *
 * Demo identification:
 * - Users with email @seed.test or @test.local
 * - Orphan vendor profiles (no linked user)
 *
 * Preserves:
 * - shuriye admin
 * - All users with real email domains (e.g. vender@gmail.com)
 * - Listings owned by real vendors
 *
 * Run: node scripts/cleanupDemoMarketplaceData.mjs
 * Dry run: node scripts/cleanupDemoMarketplaceData.mjs --dry-run
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import WeddingListing from '../src/models/WeddingListing.js';
import Booking from '../src/models/Booking.js';
import BookingInvoice from '../src/models/BookingInvoice.js';
import Payment from '../src/models/Payment.js';
import WeddingCartItem from '../src/models/WeddingCartItem.js';
import WeddingSelection from '../src/models/WeddingSelection.js';
import Order from '../src/models/Order.js';
import Notification from '../src/models/Notification.js';

dotenv.config({ override: true });

const REQUIRED_DB = 'wedding_planning';
const ADMIN_USERNAME = 'shuriye';
const dryRun = process.argv.includes('--dry-run');

function isDemoEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  return e.endsWith('@seed.test') || e.endsWith('@test.local');
}

function getDatabaseName(uri) {
  const withoutQuery = uri.split('?')[0];
  const segments = withoutQuery.split('/');
  return segments[segments.length - 1] || null;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  const dbName = getDatabaseName(uri || '');
  if (dbName !== REQUIRED_DB) {
    throw new Error(`Refusing: database must be "${REQUIRED_DB}", got "${dbName}"`);
  }

  await mongoose.connect(uri);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE DELETE'}`);

  const allUsers = await User.find().select('email username role').lean();
  const demoUserIds = allUsers
    .filter((u) => u.username !== ADMIN_USERNAME && isDemoEmail(u.email))
    .map((u) => u._id);

  const realUsers = allUsers.filter((u) => !demoUserIds.some((id) => String(id) === String(u._id)) && u.username !== ADMIN_USERNAME);
  const realVendorUsers = realUsers.filter((u) => u.role === 'vendor');

  const profiles = await VendorProfile.find().populate('user', 'email').lean();
  const demoProfileIds = profiles
    .filter((p) => !p.user || isDemoEmail(p.user?.email) || demoUserIds.some((id) => String(id) === String(p.user?._id)))
    .map((p) => p._id);

  const realProfileIds = profiles
    .filter((p) => !demoProfileIds.some((id) => String(id) === String(p._id)))
    .map((p) => p._id);

  const demoListings = await WeddingListing.find({
    $or: [
      { vendor: { $in: demoUserIds } },
      { vendorProfile: { $in: demoProfileIds } },
    ],
  }).select('_id name vendor').lean();

  const demoListingIds = demoListings.map((l) => l._id);

  const demoBookings = await Booking.find({
    $or: [
      { vendor: { $in: demoUserIds } },
      { vendorProfile: { $in: demoProfileIds } },
      { listing: { $in: demoListingIds } },
    ],
  }).select('_id invoice').lean();

  const demoBookingIds = demoBookings.map((b) => b._id);
  const demoInvoiceIds = demoBookings.map((b) => b.invoice).filter(Boolean);

  const summary = {
    demoUsers: demoUserIds.length,
    demoProfiles: demoProfileIds.length,
    demoListings: demoListingIds.length,
    demoBookings: demoBookingIds.length,
    realVendors: realVendorUsers.map((u) => u.email),
    realProfiles: realProfileIds.length,
    preservedListingNames: [],
  };

  const realListingsBefore = await WeddingListing.find({
    vendor: { $nin: demoUserIds },
    vendorProfile: { $in: realProfileIds },
  }).select('name category status').lean();
  summary.preservedListingNames = realListingsBefore.map((l) => l.name);

  console.log('\nDemo listings to remove:');
  demoListings.forEach((l) => console.log(`  - ${l.name}`));
  console.log('\nReal vendors preserved:', summary.realVendors.join(', ') || '(none)');
  console.log('Real listings preserved:', summary.preservedListingNames.join(', ') || '(none)');

  if (dryRun) {
    console.log('\nDry run complete. No records deleted.');
    await mongoose.disconnect();
    return;
  }

  const cart = await WeddingCartItem.deleteMany({
    $or: [
      { listing: { $in: demoListingIds } },
      { vendor: { $in: demoUserIds } },
    ],
  });

  const selections = await WeddingSelection.deleteMany({
    $or: [
      { listing: { $in: demoListingIds } },
      { vendor: { $in: demoUserIds } },
    ],
  });

  const orders = await Order.deleteMany({
    $or: [
      { vendor: { $in: demoUserIds } },
      { service: { $in: demoListingIds } },
    ],
  });

  const payments = await Payment.deleteMany({
    $or: [
      { booking: { $in: demoBookingIds } },
      { vendor: { $in: demoUserIds } },
    ],
  });

  const invoices = await BookingInvoice.deleteMany({
    $or: [
      { _id: { $in: demoInvoiceIds } },
      { booking: { $in: demoBookingIds } },
      { vendor: { $in: demoUserIds } },
    ],
  });

  const bookings = await Booking.deleteMany({
    $or: [
      { _id: { $in: demoBookingIds } },
      { vendor: { $in: demoUserIds } },
      { listing: { $in: demoListingIds } },
    ],
  });

  const listings = await WeddingListing.deleteMany({ _id: { $in: demoListingIds } });

  const profilesDeleted = await VendorProfile.deleteMany({ _id: { $in: demoProfileIds } });

  const usersDeleted = await User.deleteMany({ _id: { $in: demoUserIds } });

  const orphanProfiles = await VendorProfile.deleteMany({ user: { $exists: false } });
  const orphanProfiles2 = await VendorProfile.deleteMany({
    user: { $nin: await User.find().distinct('_id') },
  });

  await Notification.deleteMany({
    $or: [
      { user: { $in: demoUserIds } },
      { vendor: { $in: demoUserIds } },
    ],
  });

  console.log('\nDeletion summary:');
  console.log(`  cart items: ${cart.deletedCount}`);
  console.log(`  selections: ${selections.deletedCount}`);
  console.log(`  orders: ${orders.deletedCount}`);
  console.log(`  payments: ${payments.deletedCount}`);
  console.log(`  invoices: ${invoices.deletedCount}`);
  console.log(`  bookings: ${bookings.deletedCount}`);
  console.log(`  listings: ${listings.deletedCount}`);
  console.log(`  vendor profiles: ${profilesDeleted.deletedCount + orphanProfiles.deletedCount + orphanProfiles2.deletedCount}`);
  console.log(`  users: ${usersDeleted.deletedCount}`);

  const remaining = {
    vendors: await User.countDocuments({ role: 'vendor' }),
    listings: await WeddingListing.countDocuments(),
    bookings: await Booking.countDocuments(),
    venueListings: await WeddingListing.countDocuments({ category: { $in: ['venue', 'hall'] }, status: 'active', active: true }),
  };
  console.log('\nRemaining counts:', remaining);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
