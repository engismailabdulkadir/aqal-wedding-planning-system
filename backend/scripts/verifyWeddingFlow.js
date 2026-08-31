import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';
import User from '../src/models/User.js';
import Wedding from '../src/models/Wedding.js';

const API_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const PASSWORD = 'Phase3BPassword';
const accounts = [
  { firstName: 'Wedding', lastName: 'Owner', email: 'phase3b.owner@example.com', role: 'customer' },
  { firstName: 'Other', lastName: 'Customer', email: 'phase3b.other@example.com', role: 'customer' },
  { firstName: 'Wedding', lastName: 'Vendor', email: 'phase3b.vendor@example.com', role: 'vendor' },
  { firstName: 'Wedding', lastName: 'Planner', email: 'phase3b.planner@example.com', role: 'planner' },
];
const createdUserIds = [];
const createdWeddingIds = [];

function assert(condition, message) { if (!condition) throw new Error(message); }
async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  return { response, data: await response.json() };
}

async function verifyWeddingFlow() {
  try {
    validateEnv();
    await connectDatabase();
    await Wedding.init();
    const emails = accounts.map(({ email }) => email);
    assert(!(await User.exists({ email: { $in: emails } })), 'Verification accounts already exist; existing data was not modified');

    const sessions = {};
    for (const account of accounts) {
      const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ ...account, password: PASSWORD }) });
      assert(result.response.status === 201, `${account.role} verification registration failed`);
      createdUserIds.push(result.data.user._id);
      sessions[account.email] = result.data;
    }
    const owner = sessions[accounts[0].email];
    const other = sessions[accounts[1].email];
    const vendor = sessions[accounts[2].email];
    const planner = sessions[accounts[3].email];

    const empty = await request('/weddings/my-wedding', { token: owner.token });
    assert(empty.response.ok && empty.data.wedding === null, 'Missing wedding did not return a clean null response');
    console.log('PASS: customer without wedding receives wedding: null');

    const weddingPayload = { weddingName: 'Phase 3B Wedding', partner1Name: 'Wedding', partner2Name: 'Partner', weddingDate: '2027-12-20', venue: 'Celebration Hall', city: 'Mogadishu', estimatedBudget: 12000, expectedGuests: 250, description: 'Wedding verification' };
    const created = await request('/weddings', { method: 'POST', token: owner.token, body: JSON.stringify({ ...weddingPayload, customer: other.user._id, status: 'completed' }) });
    assert(created.response.status === 201, `Wedding creation failed: ${created.data.message}`);
    createdWeddingIds.push(created.data.wedding._id);
    assert(created.data.wedding.customer === owner.user._id && created.data.wedding.status === 'planning', 'Server did not control ownership or status');
    const stored = await Wedding.findById(created.data.wedding._id);
    assert(stored?.customer.equals(owner.user._id), 'Wedding ownership was not saved correctly in MongoDB');
    console.log('PASS: wedding created in MongoDB with authenticated customer ownership');

    const retrieved = await request('/weddings/my-wedding', { token: owner.token });
    assert(retrieved.response.ok && retrieved.data.wedding._id === created.data.wedding._id, 'Owner could not retrieve wedding');
    const otherEmpty = await request('/weddings/my-wedding', { token: other.token });
    assert(otherEmpty.response.ok && otherEmpty.data.wedding === null, 'Another customer accessed the owner wedding');
    console.log('PASS: my-wedding returns only the authenticated customer wedding');

    const duplicate = await request('/weddings', { method: 'POST', token: owner.token, body: JSON.stringify(weddingPayload) });
    assert(duplicate.response.status === 201 && duplicate.data.wedding.customer === owner.user._id, 'Second wedding was not created for the same customer');
    createdWeddingIds.push(duplicate.data.wedding._id);
    console.log('PASS: second wedding created for the same customer');

    const forbiddenUpdate = await request(`/weddings/${created.data.wedding._id}`, { method: 'PUT', token: other.token, body: JSON.stringify({ weddingName: 'Stolen Wedding' }) });
    assert(forbiddenUpdate.response.status === 403, 'Another customer updated the wedding');
    console.log('PASS: cross-customer update rejected');

    const updated = await request(`/weddings/${created.data.wedding._id}`, { method: 'PUT', token: owner.token, body: JSON.stringify({ weddingName: 'Updated Wedding', estimatedBudget: 15000, customer: other.user._id, planner: other.user._id, status: 'completed' }) });
    assert(updated.response.ok && updated.data.wedding.weddingName === 'Updated Wedding' && updated.data.wedding.estimatedBudget === 15000, 'Owner update failed');
    assert(updated.data.wedding.customer === owner.user._id && updated.data.wedding.planner === null && updated.data.wedding.status === 'planning', 'Protected wedding fields were modified');
    console.log('PASS: owner update works and protected fields are ignored');

    for (const session of [vendor, planner]) {
      const denied = await request('/weddings', { method: 'POST', token: session.token, body: JSON.stringify(weddingPayload) });
      assert(denied.response.status === 403, `${session.user.role} created a customer wedding`);
    }
    const anonymous = await request('/weddings/my-wedding');
    assert(anonymous.response.status === 401, 'Unauthenticated wedding request was accepted');
    console.log('PASS: vendor, planner, and unauthenticated requests rejected');

    const invalid = await request('/weddings', { method: 'POST', token: other.token, body: JSON.stringify({ ...weddingPayload, weddingDate: '2020-01-01', estimatedBudget: -1, expectedGuests: 2.5 }) });
    assert(invalid.response.status === 400, 'Invalid wedding data was accepted');
    const invalidId = await request('/weddings/not-an-id', { method: 'PUT', token: owner.token, body: '{}' });
    assert(invalidId.response.status === 400, 'Invalid wedding ID was accepted');
    const missingId = new mongoose.Types.ObjectId();
    const missing = await request(`/weddings/${missingId}`, { method: 'PUT', token: owner.token, body: '{}' });
    assert(missing.response.status === 404, 'Missing wedding did not return 404');
    console.log('PASS: invalid body, invalid ID, and missing wedding handled correctly');
  } finally {
    if (mongoose.connection.readyState === 1) {
      if (createdWeddingIds.length) await Wedding.deleteMany({ _id: { $in: createdWeddingIds }, customer: { $in: createdUserIds } });
      if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds }, email: { $in: accounts.map(({ email }) => email) } });
      console.log(`PASS: cleaned up ${createdWeddingIds.length} wedding and ${createdUserIds.length} exact test users`);
    }
    await disconnectDatabase();
  }
}

verifyWeddingFlow().catch((error) => { console.error(`Wedding verification failed: ${error.message}`); process.exitCode = 1; });
