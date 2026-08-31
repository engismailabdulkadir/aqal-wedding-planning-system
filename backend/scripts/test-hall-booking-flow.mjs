/**
 * Exact hall booking scenario: Wedding A morning book, Wedding B availability, vendor reject, full day book.
 * Run: node scripts/test-hall-booking-flow.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import WeddingListing from '../src/models/WeddingListing.js';
import Booking from '../src/models/Booking.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_planning';
const CONFLICT_DATE = '2026-09-20';

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

async function login(email, password = 'SeedPass123!') {
  const res = await api('/auth/login', { method: 'POST', body: { email, password } });
  if (!res.data?.token) throw new Error(`Login failed for ${email}: ${JSON.stringify(res.data)}`);
  return res.data.token;
}

async function register(role, suffix) {
  const username = `hall_${suffix}_${Date.now()}`;
  const payload = {
    username,
    email: `${username}@test.local`,
    phone: `+25261${String(Date.now()).slice(-7)}`,
    password: 'TestPass123!',
    firstName: role === 'groom' ? 'Ahmed' : 'Amina',
    lastName: 'Test',
    role,
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token, email: payload.email };
}

async function createWedding(token, names, guests = 100) {
  const future = new Date();
  future.setMonth(future.getMonth() + 6);
  const res = await api('/weddings', {
    method: 'POST',
    token,
    body: {
      partner1Name: names.groom,
      partner2Name: names.bride,
      weddingDate: future.toISOString().slice(0, 10),
      city: 'Mogadishu',
      estimatedBudget: 50000,
      expectedGuests: guests,
    },
  });
  return res.data.wedding;
}

async function connectPartners(groomToken, brideToken, brideEmail, weddingId) {
  const inviteRes = await api('/wedding-members/invite', {
    method: 'POST',
    token: groomToken,
    weddingId,
    body: { weddingId, partnerEmail: brideEmail },
  });
  const code = inviteRes.data?.invite?.code;
  const acceptRes = await api('/wedding-members/accept-invitation', {
    method: 'POST',
    token: brideToken,
    body: { inviteCode: code },
  });
  return acceptRes.status === 200;
}

function slotState(data) {
  return data?.slots || {};
}

async function main() {
  await mongoose.connect(MONGO);

  const elite = await WeddingListing.findOne({ name: 'Elite Hall', active: true });
  if (!elite) {
    fail('Elite Hall listing exists');
    process.exit(1);
  }
  pass('Elite Hall listing exists', elite._id.toString());

  const m = elite.metadata?.morningPrice;
  const e = elite.metadata?.eveningPrice;
  if (m === 1000 && e === 1500) pass('Elite Hall prices', '1000/1500');
  else fail('Elite Hall prices', `${m}/${e}`);

  await Booking.deleteMany({ listing: elite._id, eventDate: new Date(CONFLICT_DATE) });

  const vendorToken = await login('halls.mogadishu@seed.test');

  const groomA = await register('groom', 'a');
  const brideA = await register('bride', 'a');
  const weddingA = await createWedding(groomA.token, { groom: 'Ahmed', bride: 'Amina' });
  const weddingAId = weddingA._id;
  if (await connectPartners(groomA.token, brideA.token, brideA.email, weddingAId)) {
    pass('Wedding A partners connected');
  } else fail('Wedding A partners connected');

  const groomB = await register('groom', 'b');
  const brideB = await register('bride', 'b');
  const weddingB = await createWedding(groomB.token, { groom: 'Hassan', bride: 'Fatima' });
  const weddingBId = weddingB._id;
  if (await connectPartners(groomB.token, brideB.token, brideB.email, weddingBId)) {
    pass('Wedding B partners connected');
  } else fail('Wedding B partners connected');

  const bookMorning = await api('/bookings/hall', {
    method: 'POST',
    token: groomA.token,
    weddingId: weddingAId,
    body: { listingId: elite._id, bookingDate: CONFLICT_DATE, timeSlot: 'morning' },
  });
  if (bookMorning.status === 201 && bookMorning.data?.booking?.status === 'pending') {
    pass('Wedding A groom books morning', 'PENDING');
  } else {
    fail('Wedding A groom books morning', JSON.stringify(bookMorning.data));
  }

  const bookingAId = bookMorning.data?.booking?._id;
  if (bookMorning.data?.booking?.amount === 1000) pass('Morning price from listing', '$1000');
  else fail('Morning price from listing', String(bookMorning.data?.booking?.amount));

  const brideBookings = await api('/bookings', { token: brideA.token, weddingId: weddingAId });
  const shared = brideBookings.data?.bookings?.some(
    (b) => String(b._id) === String(bookingAId) && b.serviceName === 'Elite Hall',
  );
  if (shared) pass('Bride sees groom booking on shared wedding');
  else fail('Bride sees groom booking', JSON.stringify(brideBookings.data?.bookings?.length));

  const slotsB1 = await api(`/cart/hall-slots?listingId=${elite._id}&date=${CONFLICT_DATE}`, {
    token: groomB.token,
    weddingId: weddingBId,
  });
  const s1 = slotState(slotsB1.data);
  if (!s1.morning && !s1.full_day && s1.evening) {
    pass('Wedding B after A morning', 'morning+full_day unavailable, evening available');
  } else {
    fail('Wedding B after A morning', JSON.stringify(s1));
  }

  const rejectRes = await api(`/vendor/bookings/${bookingAId}/status`, {
    method: 'PATCH',
    token: vendorToken,
    body: { status: 'rejected', rejectionReason: 'Hall maintenance on that date' },
  });
  if (rejectRes.status === 200 && rejectRes.data?.booking?.status === 'rejected') {
    pass('Vendor rejects Wedding A booking');
  } else {
    fail('Vendor rejects Wedding A booking', JSON.stringify(rejectRes.data));
  }

  const slotsB2 = await api(`/cart/hall-slots?listingId=${elite._id}&date=${CONFLICT_DATE}`, {
    token: groomB.token,
    weddingId: weddingBId,
  });
  const s2 = slotState(slotsB2.data);
  if (s2.morning && s2.evening && s2.full_day) {
    pass('Wedding B after reject', 'all slots available');
  } else {
    fail('Wedding B after reject', JSON.stringify(s2));
  }

  const bookFullDay = await api('/bookings/hall', {
    method: 'POST',
    token: groomB.token,
    weddingId: weddingBId,
    body: { listingId: elite._id, bookingDate: CONFLICT_DATE, timeSlot: 'full_day' },
  });
  if (bookFullDay.status === 201 && bookFullDay.data?.booking?.status === 'pending') {
    pass('Wedding B books full day', 'PENDING');
  } else {
    fail('Wedding B books full day', JSON.stringify(bookFullDay.data));
  }
  if (bookFullDay.data?.booking?.amount === 2500) pass('Full day price from listing', '$2500');
  else fail('Full day price from listing', String(bookFullDay.data?.booking?.amount));

  const slotsAfterFull = await api(`/cart/hall-slots?listingId=${elite._id}&date=${CONFLICT_DATE}`, {
    token: groomA.token,
    weddingId: weddingAId,
  });
  const s3 = slotState(slotsAfterFull.data);
  if (!s3.morning && !s3.evening && !s3.full_day) {
    pass('Other wedding sees all slots blocked after full day book');
  } else {
    fail('All slots blocked after full day', JSON.stringify(s3));
  }

  const conflictTry = await api('/bookings/hall', {
    method: 'POST',
    token: groomA.token,
    weddingId: weddingAId,
    body: { listingId: elite._id, bookingDate: CONFLICT_DATE, timeSlot: 'evening' },
  });
  if (conflictTry.status === 409) pass('Backend rejects conflicting evening booking');
  else fail('Backend rejects conflicting booking', `status=${conflictTry.status}`);

  const overCapGroom = await register('groom', 'cap');
  const overCapWedding = await createWedding(overCapGroom.token, { groom: 'Over', bride: 'Capacity' }, 450);
  const overCap = await api('/bookings/hall', {
    method: 'POST',
    token: overCapGroom.token,
    weddingId: overCapWedding._id,
    body: { listingId: elite._id, bookingDate: '2026-10-01', timeSlot: 'morning' },
  });
  if (overCap.status === 409 && /supports up to 400 guests/i.test(overCap.data?.message || '')) {
    pass('Capacity check rejects 450 guests vs 400 cap');
  } else {
    fail('Capacity check', JSON.stringify(overCap.data));
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
    await mongoose.disconnect();
    process.exit(1);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
