/**
 * After demo cleanup: verify real vendor Elite Hall + booking assignment.
 * Run: node scripts/test-real-vendor-marketplace.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/User.js';
import Booking from '../src/models/Booking.js';

dotenv.config({ override: true });

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI;

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(pathname, { method = 'GET', token, weddingId, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (weddingId) headers['X-Wedding-Id'] = weddingId;
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function register(role, suffix) {
  const username = `real_${suffix}_${Date.now()}`;
  const payload = {
    username,
    email: `${username}@example.com`,
    phone: `+25261${String(Date.now()).slice(-7)}`,
    password: 'TestPass123!',
    firstName: role === 'groom' ? 'Ahmed' : 'Amina',
    lastName: 'Real',
    role,
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token };
}

async function createWedding(token) {
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  const res = await api('/weddings', {
    method: 'POST',
    token,
    body: {
      partner1Name: 'Ahmed',
      partner2Name: 'Amina',
      weddingDate: future.toISOString().slice(0, 10),
      city: 'Mogadishu',
      estimatedBudget: 50000,
      expectedGuests: 100,
    },
  });
  return res.data.wedding;
}

async function main() {
  await mongoose.connect(MONGO);

  const realVendor = await User.findOne({
    role: 'vendor',
    email: { $not: /@seed\.test$|@test\.local$/i },
  });

  const hallsRes = await api('/listings?category=venue');
  const halls = hallsRes.data?.listings || [];
  const demoNames = ['Berta Banadir Hall', 'Silver Hall', 'Karmel Hall', 'Classic Black Groom Package'];
  const demoLeft = halls.filter((h) => demoNames.includes(h.name));
  if (demoLeft.length) fail('Demo catalog halls removed', demoLeft.map((h) => h.name).join(', '));
  else pass('Demo seed halls removed from API');

  const elite = halls.find((h) => /elite hall/i.test(h.name));
  if (elite) {
    pass('Elite Hall visible in marketplace', `${elite.name} → ${elite.vendorProfile?.businessName}`);
    if (realVendor && String(elite.vendor) === String(realVendor._id)) {
      pass('Elite Hall owned by real vendor', realVendor.email);
    } else {
      fail('Elite Hall owned by real vendor', `vendor=${elite.vendor}`);
    }
  } else {
    fail('Elite Hall visible in marketplace', `halls=${halls.map((h) => h.name).join(', ')}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const groom = await register('groom', 'book');
  const wedding = await createWedding(groom.token);
  const weddingDay = new Date(wedding.weddingDate);
  weddingDay.setDate(weddingDay.getDate() - 10);
  const bookDate = weddingDay.toISOString().slice(0, 10);
  const bookRes = await api('/bookings/hall', {
    method: 'POST',
    token: groom.token,
    weddingId: wedding._id,
    body: {
      listingId: elite._id,
      bookingDate: bookDate,
      timeSlot: 'morning',
    },
  });

  if (bookRes.status !== 201) {
    fail('Groom books Elite Hall', JSON.stringify(bookRes.data));
    process.exit(1);
  }
  pass('Groom books Elite Hall', bookRes.data.booking?.status);

  const booking = bookRes.data.booking;
  const bookingVendorId = String(booking.vendor?._id || booking.vendor);
  const listingVendorId = String(elite.vendor?._id || elite.vendor || realVendor._id);
  if (bookingVendorId === listingVendorId || bookingVendorId === String(realVendor._id)) {
    pass('booking.vendor_id = listing.vendor_id', bookingVendorId);
  } else {
    fail('booking.vendor_id mismatch', `booking=${bookingVendorId} listing=${listingVendorId}`);
  }

  const vendorPending = await Booking.find({
    vendor: realVendor._id,
    listing: elite._id,
    status: 'pending',
  });
  if (vendorPending.some((b) => String(b._id) === String(booking._id))) {
    pass('Real vendor has pending Elite Hall booking in database');
  } else {
    fail('Real vendor pending booking', `count=${vendorPending.length}`);
  }

  const seedVendors = await User.find({ email: /@seed\.test$/i }).countDocuments();
  if (seedVendors === 0) pass('All @seed.test vendors removed');
  else fail('@seed.test vendors remain', String(seedVendors));

  await mongoose.disconnect();

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
