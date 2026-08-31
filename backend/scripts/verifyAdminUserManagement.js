/**
 * Admin user management flow verification.
 * Run: node scripts/verifyAdminUserManagement.js
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI);

  const admin = await User.findOne({ username: 'shuriye' });
  assert(admin, 'Shuriye admin must exist');

  let token;
  const login = await request('/auth/login', {
    method: 'POST',
    body: { username: 'shuriye', password: process.env.ADMIN_TEST_PASSWORD || 'Admin123!' },
  });
  if (login.status === 200) {
    token = login.data.token;
  } else {
    token = generateToken(admin._id);
    console.log('Using generated admin token for API verification.');
  }
  const ts = Date.now();

  const groomCreate = await request('/admin/users', {
    method: 'POST',
    token,
    body: {
      firstName: 'Test',
      lastName: 'Groom',
      username: `groom_${ts}`,
      password: 'TestPass123!',
      role: 'groom',
      phone: `+25261${String(ts).slice(-7)}`,
      accountStatus: 'active',
    },
  });
  assert(groomCreate.status === 201, `Groom create failed: ${JSON.stringify(groomCreate.data)}`);
  const groomId = groomCreate.data.user._id;

  const vendorCreate = await request('/admin/users', {
    method: 'POST',
    token,
    body: {
      firstName: 'Test',
      lastName: 'Vendor',
      username: `vendor_${ts}`,
      password: 'TestPass123!',
      role: 'vendor',
      accountStatus: 'active',
    },
  });
  assert(vendorCreate.status === 201, `Vendor create failed: ${JSON.stringify(vendorCreate.data)}`);
  const vendorId = vendorCreate.data.user._id;

  const vendorFilter = await request('/admin/users?role=vendor', { token });
  assert(vendorFilter.data.users.some((u) => u._id === vendorId), 'Vendor filter should include vendor');

  await request(`/admin/users/${groomId}`, { method: 'PATCH', token, body: { accountStatus: 'inactive' } });
  const inactiveLogin = await request('/auth/login', {
    method: 'POST',
    body: { username: `groom_${ts}`, password: 'TestPass123!' },
  });
  assert(inactiveLogin.status === 403, 'Inactive groom login should be denied');
  assert(
    inactiveLogin.data.message?.includes('inactive'),
    'Inactive message expected',
  );

  await request(`/admin/users/${groomId}`, { method: 'PATCH', token, body: { accountStatus: 'active' } });
  const activeLogin = await request('/auth/login', {
    method: 'POST',
    body: { username: `groom_${ts}`, password: 'TestPass123!' },
  });
  assert(activeLogin.status === 200, 'Reactivated groom should login');

  await request(`/admin/users/${vendorId}`, { method: 'PATCH', token, body: { accountStatus: 'blocked' } });
  const blockedLogin = await request('/auth/login', {
    method: 'POST',
    body: { username: `vendor_${ts}`, password: 'TestPass123!' },
  });
  assert(blockedLogin.status === 403, 'Blocked vendor login should be denied');
  assert(blockedLogin.data.message?.includes('blocked'), 'Blocked message expected');

  await request(`/admin/users/${vendorId}`, { method: 'PATCH', token, body: { accountStatus: 'active' } });
  const unblockLogin = await request('/auth/login', {
    method: 'POST',
    body: { username: `vendor_${ts}`, password: 'TestPass123!' },
  });
  assert(unblockLogin.status === 200, 'Unblocked vendor should login');

  const search = await request(`/admin/users?search=vendor_${ts}`, { token });
  assert(search.data.users.some((u) => u._id === vendorId), 'Search by username should work');

  const summary = await request('/admin/users', { token });
  assert(summary.data.summary?.total >= 3, 'Summary total should be from DB');

  const protect = await request('/admin/users', { token });
  const shuriye = protect.data.users.find((u) => u.username === 'shuriye');
  assert(shuriye, 'Shuriye should be listed');
  const blockShuriye = await request(`/admin/users/${shuriye._id}`, {
    method: 'PATCH',
    token,
    body: { accountStatus: 'blocked' },
  });
  assert(blockShuriye.status === 403, 'Shuriye cannot be blocked');

  // cleanup test users
  await User.deleteMany({ username: { $in: [`groom_${ts}`, `vendor_${ts}`] } });

  console.log('All admin user management checks passed.');
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
  mongoose.disconnect();
});
