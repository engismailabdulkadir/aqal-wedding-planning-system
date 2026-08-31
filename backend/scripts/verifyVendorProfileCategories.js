/**
 * Verify vendor profile category saves against backend enum.
 * Run: node scripts/verifyVendorProfileCategories.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import { VENDOR_CATEGORIES } from '../src/models/VendorProfile.js';
import { generateToken } from '../src/utils/generateToken.js';

const BASE = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;

async function request(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
}

const TEST_CATEGORIES = [
  { category: 'venue', label: 'Wedding Hall' },
  { category: 'decoration', label: 'Decoration' },
  { category: 'groom attire', label: 'Groom Clothing' },
  { category: 'wedding dress', label: 'Bride Clothing' },
  { category: 'other', label: 'Other' },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const ts = Date.now();
  const user = await User.create({
    firstName: 'Cat',
    lastName: 'Test',
    username: `vcat_${ts}`,
    password: 'TestPass123!',
    role: 'vendor',
    accountStatus: 'active',
    isActive: true,
  });
  const token = generateToken(user._id);

  for (const item of TEST_CATEGORIES) {
    const res = await request('/vendors/me/profile', {
      method: 'PUT',
      token,
      body: {
        businessName: `Vendor ${item.label}`,
        category: item.category,
        city: 'Mogadishu',
      },
    });
    if (res.status !== 200) {
      throw new Error(`Failed ${item.label}: ${JSON.stringify(res.data)}`);
    }
    if (res.data.vendor?.category !== item.category) {
      throw new Error(`Category mismatch for ${item.label}: got ${res.data.vendor?.category}`);
    }
    console.log(`OK: ${item.label} -> ${item.category}`);
  }

  const bad = await request('/vendors/me/profile', {
    method: 'PUT',
    token,
    body: { businessName: 'Bad', category: 'value', city: 'Mogadishu' },
  });
  if (bad.status !== 400) throw new Error('Invalid category should return 400');

  await VendorProfile.deleteOne({ user: user._id });
  await User.deleteOne({ _id: user._id });
  console.log('All vendor category checks passed.');
  console.log('Backend enum:', VENDOR_CATEGORIES.join(', '));
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
  mongoose.disconnect();
});
