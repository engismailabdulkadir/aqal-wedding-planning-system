/**
 * Reset halls to 0, verify image upload + marketplace visibility, remove test hall.
 * Run: node scripts/test-hall-reset-and-image.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import WeddingListing from '../src/models/WeddingListing.js';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Booking from '../src/models/Booking.js';

dotenv.config({ override: true });

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const BACKEND = API.replace(/\/api\/v1\/?$/, '');
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '../../frontend/public/assets/halls/elite-hall.jpg');

async function api(pathname, { method = 'GET', token, weddingId, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!formData) headers['Content-Type'] = 'application/json';
  if (weddingId) headers['X-Wedding-Id'] = weddingId;
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  let count = await WeddingListing.countDocuments({ category: { $in: ['venue', 'hall'] } });
  if (count === 0) pass('Initial hall count = 0');
  else fail('Initial hall count = 0', String(count));

  const emptyApi = await api('/listings?category=venue');
  if (!emptyApi.data?.listings?.length) pass('Marketplace empty before test');
  else fail('Marketplace empty before test', String(emptyApi.data.listings.length));

  const suffix = Date.now();
  const vendorReg = await api('/auth/register', {
    method: 'POST',
    body: {
      username: `hall_img_${suffix}`,
      email: `hall_img_${suffix}@example.com`,
      phone: `+25263${String(suffix).slice(-7)}`,
      password: 'TestPass123!',
      firstName: 'Temp',
      lastName: 'Vendor',
      role: 'vendor',
    },
  });
  const vendorToken = vendorReg.data?.token;
  if (!vendorToken) throw new Error('Vendor register failed');

  await api('/vendors/me/profile', {
    method: 'PUT',
    token: vendorToken,
    body: {
      businessName: 'Temp Hall Vendor',
      category: 'venue',
      city: 'Mogadishu',
      phone: '+252610000099',
      email: `temp-${suffix}@example.com`,
    },
  });

  if (!fs.existsSync(FIXTURE)) throw new Error(`Fixture missing: ${FIXTURE}`);
  const buf = fs.readFileSync(FIXTURE);
  const formData = new FormData();
  formData.append('images', new Blob([buf], { type: 'image/jpeg' }), 'hall-test.jpg');
  const up = await api('/vendor/listings/upload-images', { method: 'POST', token: vendorToken, formData });
  const imagePath = up.data?.paths?.[0];
  if (up.status === 201 && imagePath?.startsWith('/uploads/listings/')) {
    pass('Image upload returns permanent path', imagePath);
  } else {
    fail('Image upload', JSON.stringify(up.data));
    process.exit(1);
  }

  const imgRes = await fetch(`${BACKEND}${imagePath}`);
  if (imgRes.status === 200 && imgRes.headers.get('content-type')?.includes('image')) {
    pass('Uploaded image HTTP 200', imgRes.headers.get('content-type'));
  } else {
    fail('Image HTTP 200', String(imgRes.status));
  }

  const create = await api('/vendor/listings', {
    method: 'POST',
    token: vendorToken,
    body: {
      name: 'Temp Test Hall DELETE ME',
      category: 'venue',
      listingType: 'service',
      description: 'Temporary test hall',
      price: 1000,
      city: 'Mogadishu',
      location: 'Test District, Mogadishu',
      images: [imagePath],
      available: true,
      active: true,
      status: 'active',
      availabilityType: 'slot',
      metadata: {
        district: 'Test District',
        address: '123 Test Street',
        capacity: 200,
        morningPrice: 1000,
        eveningPrice: 1500,
        fullDayPrice: 2500,
      },
    },
  });
  const listingId = create.data?.listing?._id;
  if (create.status === 201 && listingId) pass('Hall listing created', listingId);
  else {
    fail('Hall listing create', JSON.stringify(create.data));
    process.exit(1);
  }

  count = await WeddingListing.countDocuments({ category: { $in: ['venue', 'hall'] } });
  if (count === 1) pass('Database hall count = 1 during test');
  else fail('Database hall count during test', String(count));

  const market = await api('/listings?category=venue');
  if (market.data?.listings?.length === 1 && market.data.listings[0].images?.[0] === imagePath) {
    pass('Marketplace shows hall with uploaded image');
  } else {
    fail('Marketplace hall image', JSON.stringify(market.data?.listings?.[0]?.images));
  }

  const testVendorId = vendorReg.data.user._id;
  const groomSuffix = Date.now();
  const groomReg = await api('/auth/register', {
    method: 'POST',
    body: {
      username: `groom_hall_${groomSuffix}`,
      email: `groom_hall_${groomSuffix}@example.com`,
      phone: `+25264${String(groomSuffix).slice(-7)}`,
      password: 'TestPass123!',
      firstName: 'Test',
      lastName: 'Groom',
      role: 'groom',
    },
  });
  const groomToken = groomReg.data?.token;
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  const weddingRes = await api('/weddings', {
    method: 'POST',
    token: groomToken,
    body: {
      partner1Name: 'Test Groom',
      partner2Name: 'Test Bride',
      weddingDate: future.toISOString().slice(0, 10),
      city: 'Mogadishu',
      estimatedBudget: 10000,
      expectedGuests: 100,
    },
  });
  const weddingId = weddingRes.data?.wedding?._id;
  const bookDate = future.toISOString().slice(0, 10);
  const bookRes = await api('/bookings/hall', {
    method: 'POST',
    token: groomToken,
    weddingId,
    body: { listingId, bookingDate: bookDate, timeSlot: 'morning' },
  });
  const booking = bookRes.data?.booking;
  const assignedVendorId = booking?.vendor?._id || booking?.vendor;
  if (
    bookRes.status === 201 &&
    booking?.status === 'pending' &&
    String(assignedVendorId) === String(testVendorId) &&
    String(booking.listing) === String(listingId)
  ) {
    pass('Hall booking assigns listing vendor', `vendor=${assignedVendorId}`);
  } else {
    fail('Hall booking vendor assignment', JSON.stringify(bookRes.data));
  }

  const vendorBookings = await api('/vendor/bookings', { token: vendorToken });
  const vendorSees = vendorBookings.data?.bookings?.some(
    (b) => String(b._id) === String(booking?._id) && b.status === 'pending',
  );
  if (vendorSees) pass('Hall vendor sees pending booking in Operations');
  else fail('Vendor pending booking', JSON.stringify(vendorBookings.data?.bookings?.length));

  // Cleanup test hall, bookings, test vendor, and test groom
  await api(`/vendor/listings/${listingId}`, { method: 'DELETE', token: vendorToken });
  await Booking.deleteMany({ listing: listingId });
  await WeddingListing.deleteMany({ vendor: testVendorId });

  const groomUserId = groomReg.data?.user?._id;
  const { deleteScriptTestUsers } = await import('./lib/deleteScriptTestUsers.mjs');
  await deleteScriptTestUsers([testVendorId, groomUserId].filter(Boolean));

  count = await WeddingListing.countDocuments({ category: { $in: ['venue', 'hall'] } });
  if (count === 0) pass('Final hall count = 0 after test cleanup');
  else fail('Final hall count = 0', String(count));

  const realVendor = await User.findOne({ email: 'vender@gmail.com' });
  if (realVendor) pass('Real vendor account preserved', realVendor.email);
  else fail('Real vendor preserved');

  await mongoose.disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\nPassed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
