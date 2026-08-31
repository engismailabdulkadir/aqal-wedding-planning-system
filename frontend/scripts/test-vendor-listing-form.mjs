/**
 * Vendor listing image upload + availability form tests.
 * Run: node scripts/test-vendor-listing-form.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '../public/assets/halls/elite-hall.jpg');

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(pathname, { method = 'GET', token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!formData) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${API}${pathname}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function registerVendor() {
  const suffix = Date.now();
  const payload = {
    username: `vendor_list_${suffix}`,
    email: `vendor_list_${suffix}@test.local`,
    phone: `+25261${String(suffix).slice(-7)}`,
    password: 'TestPass123!',
    firstName: 'Vendor',
    lastName: 'List',
    role: 'vendor',
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token, username: payload.username };
}

async function main() {
  const vendor = await registerVendor();

  // Invalid MIME (fake pdf as jpg name won't pass MIME check if we send wrong type)
  const badForm = new FormData();
  badForm.append('images', new Blob(['not-an-image'], { type: 'application/pdf' }), 'test.pdf');
  const bad = await api('/vendor/listings/upload-images', {
    method: 'POST',
    token: vendor.token,
    formData: badForm,
  });
  if (bad.status >= 400) pass('Reject PDF upload');
  else fail('Reject PDF upload', JSON.stringify(bad.data));

  if (!fs.existsSync(FIXTURE)) {
    fail('Fixture image missing', FIXTURE);
  } else {
    const buf = fs.readFileSync(FIXTURE);
    const goodForm = new FormData();
    goodForm.append('images', new Blob([buf], { type: 'image/jpeg' }), 'elite-hall.jpg');
    const up = await api('/vendor/listings/upload-images', {
      method: 'POST',
      token: vendor.token,
      formData: goodForm,
    });
    if (up.status === 201 && up.data?.paths?.[0]?.startsWith('/uploads/listings/')) {
      pass('Upload JPG', up.data.paths[0]);
    } else {
      fail('Upload JPG', JSON.stringify(up.data));
    }

    const imagePath = up.data?.paths?.[0];
    const hall = await api('/vendor/listings', {
      method: 'POST',
      token: vendor.token,
      body: {
        name: 'Test Elite Hall',
        category: 'venue',
        listingType: 'service',
        description: 'Hall test',
        price: 1000,
        city: 'Mogadishu',
        images: imagePath ? [imagePath] : [],
        availabilityType: 'slot',
        metadata: {
          district: 'Abdiaziz',
          capacity: 400,
          morningPrice: 400,
          eveningPrice: 600,
          fullDayPrice: 1000,
        },
      },
    });
    if (hall.status === 201 && hall.data?.listing?.availabilityType === 'slot') {
      const meta = hall.data.listing.metadata || {};
      if (meta.morningPrice === 400 && meta.eveningPrice === 600 && meta.fullDayPrice === 1000) {
        pass('Venue hall_slots with full day calc', '1000');
      } else {
        fail('Hall prices', JSON.stringify(meta));
      }
    } else {
      fail('Create venue listing', JSON.stringify(hall.data));
    }

    const suit = await api('/vendor/listings', {
      method: 'POST',
      token: vendor.token,
      body: {
        name: 'Test Groom Suit',
        category: 'groom_suit',
        listingType: 'product',
        price: 250,
        availabilityType: 'inventory',
        quantity: 10,
      },
    });
    if (suit.status === 201 && suit.data?.listing?.availabilityType === 'inventory' && suit.data.listing.quantity === 10) {
      pass('Groom suit inventory listing');
    } else fail('Groom suit listing', JSON.stringify(suit.data));

    const makeup = await api('/vendor/listings', {
      method: 'POST',
      token: vendor.token,
      body: {
        name: 'Test Makeup',
        category: 'makeup',
        listingType: 'service',
        price: 150,
        availabilityType: 'appointment',
        metadata: {
          workingDays: ['Sunday', 'Monday'],
          appointmentStart: '08:00',
          appointmentEnd: '18:00',
          appointmentDuration: 60,
        },
      },
    });
    if (makeup.status === 201 && makeup.data?.listing?.availabilityType === 'appointment') {
      pass('Makeup appointment listing');
    } else fail('Makeup listing', JSON.stringify(makeup.data));

    if (hall.data?.listing?._id) {
      const edit = await api(`/vendor/listings/${hall.data.listing._id}`, {
        method: 'PATCH',
        token: vendor.token,
        body: { name: 'Test Elite Hall Updated', images: imagePath ? [imagePath] : [] },
      });
      if (edit.status === 200 && edit.data?.listing?.images?.[0] === imagePath) {
        pass('Edit keeps existing image');
      } else {
        fail('Edit keeps image', JSON.stringify(edit.data));
      }
    }
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n--- ${results.filter((r) => r.ok).length}/${results.length} passed ---`);
  if (failed.length) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
