/**
 * Debug vendor image upload — prints full HTTP response.
 * Run: node scripts/debug-vendor-upload.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.env.API_BASE || 'http://127.0.0.1:5000/api/v1';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(__dirname, '../public/assets/halls/elite-hall.jpg');

async function registerVendor() {
  const suffix = Date.now();
  const payload = {
    username: `dbg_vendor_${suffix}`,
    email: `dbg_vendor_${suffix}@test.local`,
    phone: `+25261${String(suffix).slice(-7)}`,
    password: 'TestPass123!',
    firstName: 'Debug',
    lastName: 'Vendor',
    role: 'vendor',
  };
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  console.log('REGISTER', res.status, JSON.stringify(data, null, 2));
  return { token: data.token, username: payload.username };
}

async function upload(token, label) {
  if (!fs.existsSync(FIXTURE)) {
    console.error('Fixture missing:', FIXTURE);
    process.exit(1);
  }
  const buf = fs.readFileSync(FIXTURE);
  const form = new FormData();
  form.append('images', new Blob([buf], { type: 'image/jpeg' }), 'test-elite.jpg');

  const url = `${API}/vendor/listings/upload-images`;
  console.log('\n---', label, '---');
  console.log('URL:', url);
  console.log('Token:', token ? `${token.slice(0, 20)}...` : 'NONE');

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { method: 'POST', headers, body: form });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  console.log('STATUS:', res.status);
  console.log('BODY:', JSON.stringify(data, null, 2));

  if (res.ok && data.paths?.[0]) {
    const origin = API.replace(/\/api\/v1\/?$/, '');
    const imgUrl = `${origin}${data.paths[0]}`;
    const imgRes = await fetch(imgUrl);
    console.log('IMAGE GET', imgUrl, '->', imgRes.status);
  }
  return res.status;
}

console.log('API_BASE:', API);
await upload(null, 'No auth');
const vendor = await registerVendor();
await upload(vendor.token, 'With vendor token');
