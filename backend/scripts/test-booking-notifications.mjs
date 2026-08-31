/**
 * Test booking accept/reject/confirm notifications end-to-end.
 * Run: node scripts/test-booking-notifications.mjs
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Notification from '../src/models/Notification.js';

dotenv.config({ override: true });

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';

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

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function register(role, label) {
  const username = `notif_${label}_${Date.now()}`;
  const res = await api('/auth/register', {
    method: 'POST',
    body: {
      username,
      email: `${username}@example.com`,
      phone: `+25261${String(Date.now()).slice(-7)}`,
      password: 'TestPass123!',
      firstName: label,
      lastName: 'NotifTest',
      role,
    },
  });
  if (!res.data?.token) throw new Error(`Register ${role} failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token, userId: res.data.user._id };
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const vendor = await register('vendor', 'vendor');
  await api('/vendors/me/profile', {
    method: 'PUT',
    token: vendor.token,
    body: {
      businessName: 'Notif Test Halls',
      category: 'venue',
      city: 'Mogadishu',
      phone: '+252610000001',
      email: `vendor-notif-${Date.now()}@example.com`,
    },
  });

  const listingRes = await api('/vendor/listings', {
    method: 'POST',
    token: vendor.token,
    body: {
      name: 'Notification Test Hall',
      category: 'venue',
      listingType: 'service',
      description: 'Hall for notification tests',
      price: 500,
      city: 'Mogadishu',
      status: 'active',
      active: true,
      available: true,
      availabilityType: 'slot',
      metadata: { morningPrice: 500, eveningPrice: 700, capacity: 200 },
    },
  });
  if (listingRes.status !== 201) throw new Error(`Listing create failed: ${JSON.stringify(listingRes.data)}`);
  const listingId = listingRes.data.listing._id;

  const groom = await register('groom', 'groom');
  const future = new Date();
  future.setMonth(future.getMonth() + 9);
  const weddingRes = await api('/weddings', {
    method: 'POST',
    token: groom.token,
    body: {
      partner1Name: 'Notify',
      partner2Name: 'Bride',
      weddingDate: future.toISOString().slice(0, 10),
      city: 'Mogadishu',
      estimatedBudget: 10000,
      expectedGuests: 80,
    },
  });
  const weddingId = weddingRes.data.wedding._id;
  const weddingDay = new Date(weddingRes.data.wedding.weddingDate);
  weddingDay.setDate(weddingDay.getDate() - 15);
  const bookDate = weddingDay.toISOString().slice(0, 10);

  const bookRes = await api('/bookings/hall', {
    method: 'POST',
    token: groom.token,
    weddingId,
    body: { listingId, bookingDate: bookDate, timeSlot: 'evening' },
  });
  if (bookRes.status !== 201) throw new Error(`Book failed: ${JSON.stringify(bookRes.data)}`);
  const bookingId = bookRes.data.booking._id;
  pass('Created pending booking');

  const acceptRes = await api(`/vendor/bookings/${bookingId}/status`, {
    method: 'PATCH',
    token: vendor.token,
    body: { status: 'accepted' },
  });
  if (acceptRes.status === 200 && acceptRes.data?.booking?.status === 'accepted') {
    pass('Vendor accept → status accepted');
  } else {
    fail('Vendor accept', JSON.stringify(acceptRes.data));
  }

  const acceptNotif = await Notification.findOne({
    user: groom.userId,
    type: 'booking_accepted',
    wedding: weddingId,
  }).sort({ createdAt: -1 });
  if (acceptNotif) pass('Groom received booking_accepted notification');
  else fail('Groom booking_accepted notification');

  const book2Date = new Date(bookDate);
  book2Date.setDate(book2Date.getDate() + 1);
  const book2 = await api('/bookings/hall', {
    method: 'POST',
    token: groom.token,
    weddingId,
    body: {
      listingId,
      bookingDate: book2Date.toISOString().slice(0, 10),
      timeSlot: 'morning',
    },
  });
  if (book2.status === 201) {
    const rejectRes = await api(`/vendor/bookings/${book2.data.booking._id}/status`, {
      method: 'PATCH',
      token: vendor.token,
      body: { status: 'rejected', rejectionReason: 'Unavailable on that date' },
    });
    if (rejectRes.status === 200 && rejectRes.data?.booking?.status === 'rejected') {
      pass('Vendor reject → status rejected');
    } else {
      fail('Vendor reject', JSON.stringify(rejectRes.data));
    }
    const rejectNotif = await Notification.findOne({
      user: groom.userId,
      type: 'booking_rejected',
    }).sort({ createdAt: -1 });
    if (rejectNotif) pass('Groom received booking_rejected notification');
    else fail('Groom booking_rejected notification');
  } else {
    fail('Second booking for reject test', JSON.stringify(book2.data));
  }

  const book3Date = new Date(bookDate);
  book3Date.setDate(book3Date.getDate() + 2);
  const book3 = await api('/bookings/hall', {
    method: 'POST',
    token: groom.token,
    weddingId,
    body: {
      listingId,
      bookingDate: book3Date.toISOString().slice(0, 10),
      timeSlot: 'morning',
    },
  });
  if (book3.status === 201) {
    await api(`/vendor/bookings/${book3.data.booking._id}/status`, {
      method: 'PATCH',
      token: vendor.token,
      body: { status: 'accepted' },
    });
    const payRes = await api(`/bookings/${book3.data.booking._id}/pay`, {
      method: 'POST',
      token: groom.token,
      weddingId,
      body: { paymentMethod: 'test' },
    });
    if (payRes.status === 200 && payRes.data?.booking?.status === 'confirmed') {
      pass('Payment → status confirmed');
    } else {
      fail('Payment confirm', JSON.stringify(payRes.data));
    }
    const confirmNotif = await Notification.findOne({
      user: groom.userId,
      type: 'booking_confirmed',
    }).sort({ createdAt: -1 });
    if (confirmNotif) pass('Groom received booking_confirmed notification');
    else fail('Groom booking_confirmed notification');
  } else {
    fail('Third booking for payment test', JSON.stringify(book3.data));
  }

  const { deleteScriptTestUsers } = await import('./lib/deleteScriptTestUsers.mjs');
  await deleteScriptTestUsers([groom.userId, vendor.userId]);

  await mongoose.disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\nPassed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL: ${f.name} — ${f.detail}`));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
