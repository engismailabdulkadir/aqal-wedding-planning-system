/**
 * Marketplace cart + hall slot tests.
 * Run: node scripts/test-marketplace-cart.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import WeddingListing from '../src/models/WeddingListing.js';
import Booking from '../src/models/Booking.js';
import WeddingCartItem from '../src/models/WeddingCartItem.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/wedding_planning';

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
  const res = await fetch(`${API}${pathname}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function register(role, suffix) {
  const username = `mkt_${suffix}_${Date.now()}`;
  const payload = {
    username,
    email: `${username}@test.local`,
    phone: `+25261${String(Date.now()).slice(-7)}`,
    password: 'TestPass123!',
    firstName: role === 'groom' ? 'Baashi' : 'Muna',
    lastName: 'Test',
    role,
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token, userId: res.data.user._id, email: payload.email };
}

async function createWedding(token, names) {
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
      expectedGuests: 100,
    },
  });
  return res.data.wedding;
}

async function main() {
  await mongoose.connect(MONGO);

  const halls = await WeddingListing.find({ category: 'venue', active: true }).sort({ name: 1 });
  if (halls.length !== 4) {
    fail('Hall seed count', `expected 4, got ${halls.length}`);
  } else {
    pass('Hall seed count', '4 venue listings');
  }

  const elite = halls.find((h) => h.name === 'Elite Hall');
  const berta = halls.find((h) => h.name === 'Berta Banadir Hall');
  const karmel = halls.find((h) => h.name === 'Karmel Hall');
  const silver = halls.find((h) => h.name === 'Silver Hall');

  if (elite) {
    const m = elite.metadata?.morningPrice;
    const e = elite.metadata?.eveningPrice;
    if (m === 1000 && e === 1500 && m + e === 2500) pass('Elite Hall prices', '1000/1500/2500');
    else fail('Elite Hall prices', `${m}/${e}`);
  } else fail('Elite Hall exists');

  if (berta) {
    const m = berta.metadata?.morningPrice;
    const e = berta.metadata?.eveningPrice;
    if (m === 500 && e === 600 && m + e === 1100) pass('Berta Banadir prices', '500/600/1100');
    else fail('Berta Banadir prices', `${m}/${e}`);
    if (berta.metadata?.capacity == null) pass('Berta capacity null');
    else fail('Berta capacity', String(berta.metadata?.capacity));
  }

  if (karmel) {
    const m = karmel.metadata?.morningPrice;
    const e = karmel.metadata?.eveningPrice;
    if (m === 500 && e === 800 && m + e === 1300) pass('Karmel prices', '500/800/1300');
    else fail('Karmel prices', `${m}/${e}`);
  }

  if (silver) {
    const m = silver.metadata?.morningPrice;
    const e = silver.metadata?.eveningPrice;
    if (m === 500 && e === 700 && m + e === 1200) pass('Silver prices', '500/700/1200');
    else fail('Silver prices', `${m}/${e}`);
  }

  const groom = await register('groom', 'baashi');
  const bride = await register('bride', 'muna');
  const wedding = await createWedding(groom.token, { groom: 'Baashi', bride: 'Muna' });
  const weddingId = wedding._id;

  const inviteRes = await api('/wedding-members/invite', {
    method: 'POST',
    token: groom.token,
    weddingId,
    body: { weddingId, partnerEmail: bride.email },
  });
  const code = inviteRes.data?.invite?.code;
  const acceptRes = await api('/wedding-members/accept-invitation', {
    method: 'POST',
    token: bride.token,
    body: { inviteCode: code },
  });
  if (acceptRes.status !== 200) fail('Bride accepts invitation', JSON.stringify(acceptRes.data));
  else pass('Bride accepts invitation');

  const conflictDate = '2026-09-20';
  if (elite) {
    await Booking.deleteMany({ listing: elite._id, eventDate: new Date(conflictDate) });

    const morningBook = await api('/cart/items', {
      method: 'POST',
      token: groom.token,
      weddingId,
      body: { listingId: elite._id, bookingDate: conflictDate, timeSlot: 'morning' },
    });
    if (morningBook.status === 201) pass('Add Elite morning to cart');
    else fail('Add Elite morning to cart', JSON.stringify(morningBook.data));

    const checkoutA = await api('/cart/checkout', { method: 'POST', token: groom.token, weddingId });
    if (checkoutA.status === 201) pass('Checkout morning booking');
    else fail('Checkout morning booking', JSON.stringify(checkoutA.data));

    const slots = await api(`/cart/hall-slots?listingId=${elite._id}&date=${conflictDate}`, { token: groom.token });
    const s = slots.data?.slots || {};
    if (!s.morning && !s.full_day && s.evening) pass('Morning blocks morning+full, evening free');
    else fail('Morning slot conflict', JSON.stringify(s));

    const eveningAdd = await api('/cart/items', {
      method: 'POST',
      token: groom.token,
      weddingId,
      body: { listingId: elite._id, bookingDate: conflictDate, timeSlot: 'evening' },
    });
    if (eveningAdd.status === 201) pass('Evening still available after morning booked');
    else fail('Evening add after morning', JSON.stringify(eveningAdd.data));

    await api('/cart/checkout', { method: 'POST', token: groom.token, weddingId });

    const slots2 = await api(`/cart/hall-slots?listingId=${elite._id}&date=${conflictDate}`, { token: groom.token });
    const s2 = slots2.data?.slots || {};
    if (!s2.morning && !s2.evening && !s2.full_day) pass('All slots blocked after morning+evening');
    else fail('All slots blocked', JSON.stringify(s2));

    await Booking.deleteMany({ listing: elite._id, eventDate: new Date(conflictDate) });
  }

  await WeddingCartItem.deleteMany({ wedding: weddingId });

  const listingsRes = await api('/listings?category=venue', { token: groom.token });
  if (listingsRes.data?.listings?.length === 4) pass('Public venue API returns 4 halls');
  else fail('Public venue API', String(listingsRes.data?.listings?.length));

  const whitePkg = await WeddingListing.findOne({ name: 'Premium White Groom Package', active: true });
  const luxuryBride = await WeddingListing.findOne({ name: 'Luxury Bride Package', active: true });
  const floralCake = await WeddingListing.findOne({ name: 'Premium Floral Wedding Cake', active: true });

  if (elite && whitePkg && luxuryBride && floralCake) {
    await api('/cart/items', {
      method: 'POST',
      token: groom.token,
      weddingId,
      body: { listingId: elite._id, bookingDate: '2026-10-15', timeSlot: 'evening' },
    });
    await api('/cart/items', {
      method: 'POST',
      token: groom.token,
      weddingId,
      body: { listingId: whitePkg._id, quantity: 1 },
    });
    await api('/cart/items', {
      method: 'POST',
      token: bride.token,
      weddingId,
      body: { listingId: luxuryBride._id, quantity: 1 },
    });
    await api('/cart/items', {
      method: 'POST',
      token: bride.token,
      weddingId,
      body: { listingId: floralCake._id, quantity: 1 },
    });

    const cartGroom = await api('/cart', { token: groom.token, weddingId });
    const cartBride = await api('/cart', { token: bride.token, weddingId });
    const totalG = cartGroom.data?.summary?.total;
    const totalB = cartBride.data?.summary?.total;
    const expected = 1500 + 450 + 650 + 350;
    if (totalG === expected && totalB === expected) pass('Shared cart total', `$${expected}`);
    else fail('Shared cart total', `groom=${totalG} bride=${totalB} expected=${expected}`);

    if (cartGroom.data?.items?.length === 4 && cartBride.data?.items?.length === 4) pass('Shared cart count', '4 items each');
    else fail('Shared cart count');
  } else {
    fail('Sample packages for cart test', 'missing listings');
  }

  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Summary ---');
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
    process.exit(1);
  }
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
