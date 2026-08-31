/**
 * Delete ALL Hall/Venue listings and related booking data.
 * Preserves user accounts (Admin, Groom, Bride, Vendor, profiles).
 *
 * Run: node scripts/resetAllHallListings.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
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

function getDbName(uri) {
  const segments = (uri || '').split('?')[0].split('/');
  return segments[segments.length - 1] || null;
}

async function main() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (getDbName(uri) !== REQUIRED_DB) {
    throw new Error(`Refusing: database must be ${REQUIRED_DB}`);
  }

  await mongoose.connect(uri);
  console.log('Resetting ALL Hall/Venue listings...');

  const venueListings = await WeddingListing.find({
    category: { $in: ['venue', 'hall'] },
  }).select('_id name vendor').lean();

  const listingIds = venueListings.map((l) => l._id);
  console.log(`Found ${listingIds.length} hall/venue listing(s):`);
  venueListings.forEach((l) => console.log(`  - ${l.name} (${l._id})`));

  if (!listingIds.length) {
    console.log('No hall listings to delete.');
    await mongoose.disconnect();
    return;
  }

  const bookings = await Booking.find({
    $or: [{ listing: { $in: listingIds } }, { category: { $in: ['venue', 'hall'] } }],
  }).select('_id invoice').lean();
  const bookingIds = bookings.map((b) => b._id);
  const invoiceIds = bookings.map((b) => b.invoice).filter(Boolean);

  const summary = {
    listings: await WeddingListing.deleteMany({ _id: { $in: listingIds } }),
    bookings: await Booking.deleteMany({ _id: { $in: bookingIds } }),
    invoices: await BookingInvoice.deleteMany({
      $or: [{ booking: { $in: bookingIds } }, { _id: { $in: invoiceIds } }],
    }),
    payments: await Payment.deleteMany({ booking: { $in: bookingIds } }),
    cart: await WeddingCartItem.deleteMany({ listing: { $in: listingIds } }),
    selections: await WeddingSelection.deleteMany({
      $or: [
        { listing: { $in: listingIds } },
        { category: { $in: ['venue', 'hall'] } },
      ],
    }),
    orders: await Order.deleteMany({ service: { $in: listingIds } }),
  };

  const db = mongoose.connection.db;
  const legacyCollections = ['hallbookings', 'hallslotlocks', 'hallslots', 'hallquotes'];
  for (const name of legacyCollections) {
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    if (exists) {
      const r = await db.collection(name).deleteMany({});
      summary[name] = { deleted: r.deletedCount };
    }
  }

  const remaining = await WeddingListing.countDocuments({ category: { $in: ['venue', 'hall'] } });
  console.log('\nDeletion summary:', summary);
  console.log(`Remaining venue/hall listings: ${remaining}`);

  if (remaining !== 0) {
    throw new Error('Hall reset incomplete');
  }

  console.log('\nHall reset complete. Vendor accounts preserved.');
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
