/**
 * Full upload → save → API → persistence test for listing images.
 * Run: node scripts/test-listing-image-persistence.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '../../frontend/public/assets/halls/elite-hall.jpg');

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
    username: `img_persist_${suffix}`,
    email: `img_persist_${suffix}@test.local`,
    phone: `+25261${String(suffix).slice(-7)}`,
    password: 'TestPass123!',
    firstName: 'Img',
    lastName: 'Test',
    role: 'vendor',
  };
  const res = await api('/auth/register', { method: 'POST', body: payload });
  if (!res.data?.token) throw new Error(`Register failed: ${JSON.stringify(res.data)}`);
  return { token: res.data.token };
}

async function main() {
  const vendor = await registerVendor();
  const buf = fs.readFileSync(FIXTURE);
  const form = new FormData();
  form.append('images', new Blob([buf], { type: 'image/jpeg' }), 'test-hall.jpg');

  const up = await api('/vendor/listings/upload-images', {
    method: 'POST',
    token: vendor.token,
    formData: form,
  });
  console.log('UPLOAD RESPONSE:', JSON.stringify(up.data, null, 2));
  const imagePath = up.data?.paths?.[0];
  if (!imagePath) {
    console.error('FAIL: no upload path');
    process.exit(1);
  }

  const create = await api('/vendor/listings', {
    method: 'POST',
    token: vendor.token,
    body: {
      name: 'Image Test Hall',
      category: 'hall',
      listingType: 'service',
      price: 500,
      city: 'Mogadishu',
      images: [imagePath],
      availabilityType: 'slot',
      metadata: { morningPrice: 200, eveningPrice: 300 },
    },
  });
  console.log('CREATE listing images:', create.data?.listing?.images);
  const id = create.data?.listing?._id;
  if (!id || !create.data?.listing?.images?.[0]) {
    console.error('FAIL: create did not persist images');
    process.exit(1);
  }

  const mine = await api('/vendor/listings', { token: vendor.token });
  const found = mine.data?.listings?.find((l) => l.name === 'Image Test Hall');
  console.log('GET MY LISTINGS images:', found?.images);
  if (!found?.images?.[0]) {
    console.error('FAIL: getMyListings missing images');
    process.exit(1);
  }

  // Update price only — omit images from body (simulate partial update)
  const partial = await api(`/vendor/listings/${id}`, {
    method: 'PATCH',
    token: vendor.token,
    body: { price: 600 },
  });
  console.log('PARTIAL UPDATE images:', partial.data?.listing?.images);

  // Empty images without clearImages flag should NOT wipe existing images
  const wipeAttempt = await api(`/vendor/listings/${id}`, {
    method: 'PATCH',
    token: vendor.token,
    body: { price: 700, images: [] },
  });
  console.log('WIPE ATTEMPT (no clearImages) images:', wipeAttempt.data?.listing?.images);
  if (!wipeAttempt.data?.listing?.images?.[0]) {
    console.error('FAIL: images wiped without clearImages');
    process.exit(1);
  }

  const intentionalClear = await api(`/vendor/listings/${id}`, {
    method: 'PATCH',
    token: vendor.token,
    body: { images: [], clearImages: true },
  });
  console.log('INTENTIONAL CLEAR images:', intentionalClear.data?.listing?.images);

  const origin = API.replace(/\/api\/v1\/?$/, '');
  const imgRes = await fetch(`${origin}${imagePath}`);
  console.log('DIRECT IMAGE URL:', `${origin}${imagePath}`, '->', imgRes.status);

  console.log('PASS: persistence flow completed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
