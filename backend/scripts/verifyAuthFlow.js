import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';
import User from '../src/models/User.js';

const API_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const PASSWORD = 'SecurePassword123';
const testAccounts = [
  { firstName: 'Test', lastName: 'Customer', email: 'phase2c.customer@example.com', role: 'customer' },
  { firstName: 'Test', lastName: 'Vendor', email: 'phase2c.vendor@example.com', role: 'vendor' },
  { firstName: 'Test', lastName: 'Planner', email: 'phase2c.planner@example.com', role: 'planner' },
  { firstName: 'Test', lastName: 'Admin', email: 'phase2c.admin@example.com', role: 'admin' },
];
const createdIds = [];

function assert(condition, message) { if (!condition) throw new Error(message); }
async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
  const data = await response.json();
  return { response, data };
}

async function verify() {
  try {
    validateEnv();
    await connectDatabase();
    const emails = testAccounts.map(({ email }) => email);
    assert(!(await User.exists({ email: { $in: emails } })), 'A verification email already exists; no existing records were modified');

    for (const account of testAccounts.filter(({ role }) => role !== 'admin')) {
      const { response, data } = await request('/auth/register', { method: 'POST', body: JSON.stringify({ ...account, password: PASSWORD }) });
      assert(response.status === 201 && data.token && data.user.role === account.role, `${account.role} registration failed`);
      createdIds.push(data.user._id);
      console.log(`PASS: ${account.role} registration and JWT issuance`);
    }

    const admin = await User.create({ ...testAccounts[3], password: PASSWORD });
    createdIds.push(admin._id);
    const publicAdmin = await request('/auth/register', { method: 'POST', body: JSON.stringify({ firstName: 'Public', lastName: 'Admin', email: 'phase2c.public-admin@example.com', password: PASSWORD, role: 'admin' }) });
    assert(publicAdmin.response.status === 400, 'Public admin registration was not rejected');
    console.log('PASS: public admin registration rejected');

    for (const account of testAccounts) {
      const { response, data } = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: account.email, password: PASSWORD }) });
      assert(response.ok && data.user.role === account.role && data.token, `${account.role} login failed`);
      const me = await request('/auth/me', { headers: { Authorization: `Bearer ${data.token}` } });
      assert(me.response.ok && me.data.user.email === account.email, `${account.role} session restoration failed`);
      const stored = await User.findOne({ email: account.email }).select('+password');
      assert(stored.password !== PASSWORD && stored.password.startsWith('$2'), `${account.role} password is not securely hashed`);
      console.log(`PASS: ${account.role} login, /me session, and bcrypt hash`);
    }

    const wrong = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: testAccounts[0].email, password: 'WrongPassword' }) });
    assert(wrong.response.status === 401 && wrong.data.message === 'Invalid email or password', 'Wrong-password response is unsafe or incorrect');
    const anonymous = await request('/auth/me');
    assert(anonymous.response.status === 401, 'Anonymous /me request was accepted');
    console.log('PASS: wrong credentials and anonymous protected requests rejected');
  } finally {
    if (mongoose.connection.readyState === 1 && createdIds.length) {
      const result = await User.deleteMany({ _id: { $in: createdIds }, email: { $in: testAccounts.map(({ email }) => email) } });
      console.log(`PASS: cleaned up ${result.deletedCount} exact verification users`);
    }
    await disconnectDatabase();
  }
}

verify().catch((error) => { console.error(`Authentication verification failed: ${error.message}`); process.exitCode = 1; });
