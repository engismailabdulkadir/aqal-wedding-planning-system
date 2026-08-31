/**
 * Keep only real Vendor-created venue/hall listings (non-test vendors).
 * Removes test/demo halls, related bookings, carts, invoices, notifications.
 *
 * Real vendor = vendor user NOT matching test email patterns.
 *
 * Run: node scripts/cleanupHallListingsOnly.mjs
 * Dry run: node scripts/cleanupHallListingsOnly.mjs --dry-run
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
import Notification from '../src/models/Notification.js';
import Order from '../src/models/Order.js';

dotenv.config({ override: true });

const REQUIRED_DB = 'wedding_planning';
const dryRun = process.argv.includes('--dry-run');

function isTestEmail(email) {
  const e = String(email || '').toLowerCase().trim();
  if (!e) return true;
  if (e.endsWith('@seed.test') || e.endsWith('@test.local')) return true;
  if (e.endsWith('@example.com') || e.endsWith('@couple.test')) return true;
  const local = e.split('@')[0];
  return /^(notif_|mkt_|hall_|real_|img_persist_|demo_|test_)/.test(local);
}

function getDatabaseName(uri) {
  const segments = (uri || '').split('?')[0].split('/');
  return segments[segments.length - 1] || null;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (getDatabaseName(uri) !== REQUIRED_DB) {
    throw new Error(`Refusing: database must be ${REQUIRED_DB}`);
  }

  await mongoose.connect(uri);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE DELETE'}`);

  const allUsers = await User.find().select('email username role').lean();
  const testUserIds = allUsers.filter((u) => isTestEmail(u.email)).map((u) => u._id);
  const realVendorUsers = allUsers.filter((u) => u.role === 'vendor' && !isTestEmail(u.email));
  const realVendorIds = realVendorUsers.map((u) => u._id);

  console.log('\nReal vendors to preserve:');
  realVendorUsers.forEach((u) => console.log(`  ${u.email} (${u._id})`));

  const allVenueListings = await WeddingListing.find({
    category: { $in: ['venue', 'hall'] },
  }).populate('vendor', 'email').lean();

  const keptListings = allVenueListings.filter((l) =>
    realVendorIds.some((id) => String(id) === String(l.vendor?._id || l.vendor)),
  );
  const removedListings = allVenueListings.filter((l) =>
    !keptListings.some((k) => String(k._id) === String(l._id)),
  );

  const keptListingIds = keptListings.map((l) => l._id);
  const removedListingIds = removedListings.map((l) => l._id);

  console.log('\nVenue listings to KEEP:');
  keptListings.forEach((l) => console.log(`  ${l.name} — vendor=${l.vendor?.email}`));

  console.log('\nVenue listings to REMOVE:');
  removedListings.forEach((l) => console.log(`  ${l.name} — vendor=${l.vendor?.email || l.vendor}`));

  const testVendorIds = allUsers
    .filter((u) => u.role === 'vendor' && isTestEmail(u.email))
    .map((u) => u._id);

  const bookingsToRemoveFilter = {
    $or: [
      { listing: { $in: removedListingIds } },
      { vendor: { $in: testVendorIds } },
      { customer: { $in: testUserIds } },
      { bookedBy: { $in: testUserIds } },
      ...(keptListingIds.length
        ? [{ listing: { $in: keptListingIds }, customer: { $in: testUserIds } }]
        : []),
    ],
  };

  const bookingsToRemove = await Booking.find(bookingsToRemoveFilter).select('_id serviceName listing').lean();
  const bookingIdsToRemove = bookingsToRemove.map((b) => b._id);

  console.log('\nBookings to remove:', bookingsToRemove.length);
  bookingsToRemove.forEach((b) => console.log(`  ${b.serviceName} (${b._id})`));

  if (dryRun) {
    console.log('\nDry run complete.');
    await mongoose.disconnect();
    return;
  }

  const cart = await WeddingCartItem.deleteMany({
    $or: [
      { listing: { $in: removedListingIds } },
      { vendor: { $in: testVendorIds } },
    ],
  });

  const selections = await WeddingSelection.deleteMany({
    $or: [
      { listing: { $in: removedListingIds } },
      { vendor: { $in: testVendorIds } },
      { category: { $in: ['venue', 'hall'] }, listing: { $nin: keptListingIds } },
    ],
  });

  const orders = await Order.deleteMany({
    $or: [
      { vendor: { $in: testVendorIds } },
      { service: { $in: removedListingIds } },
    ],
  });

  const invoices = await BookingInvoice.deleteMany({
    $or: [
      { booking: { $in: bookingIdsToRemove } },
      { vendor: { $in: testVendorIds } },
    ],
  });

  const payments = await Payment.deleteMany({
    $or: [
      { booking: { $in: bookingIdsToRemove } },
      { vendor: { $in: testVendorIds } },
    ],
  });

  const bookings = await Booking.deleteMany(bookingsToRemoveFilter);

  const listings = await WeddingListing.deleteMany({ _id: { $in: removedListingIds } });

  const testProfiles = await VendorProfile.find({ user: { $in: testVendorIds } }).select('_id');
  const testProfileIds = testProfiles.map((p) => p._id);
  await VendorProfile.deleteMany({ user: { $in: testVendorIds } });
  await User.deleteMany({ _id: { $in: testVendorIds } });

  await Notification.deleteMany({
    $or: [
      { user: { $in: testUserIds } },
      { sentBy: { $in: testUserIds } },
    ],
  });

  console.log('\nDeletion summary:');
  console.log(`  venue listings removed: ${listings.deletedCount}`);
  console.log(`  test vendors removed: ${testVendorIds.length}`);
  console.log(`  bookings removed: ${bookings.deletedCount}`);
  console.log(`  cart items: ${cart.deletedCount}`);
  console.log(`  selections: ${selections.deletedCount}`);
  console.log(`  orders: ${orders.deletedCount}`);
  console.log(`  invoices: ${invoices.deletedCount}`);
  console.log(`  payments: ${payments.deletedCount}`);

  const final = {
    venueListings: await WeddingListing.countDocuments({ category: { $in: ['venue', 'hall'] } }),
    realVendorCount: await User.countDocuments({ role: 'vendor', _id: { $in: realVendorIds } }),
    hallBookings: await Booking.countDocuments({ listing: { $in: keptListingIds } }),
  };
  console.log('\nFinal counts:', final);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
