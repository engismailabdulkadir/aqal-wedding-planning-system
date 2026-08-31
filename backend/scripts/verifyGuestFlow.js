import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';
import Guest from '../src/models/Guest.js';
import User from '../src/models/User.js';
import Wedding from '../src/models/Wedding.js';

const API_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const PASSWORD = 'Phase3DPassword';
const accounts = [
  { firstName: 'Guest', lastName: 'Owner', email: 'phase3d.owner@example.com', role: 'customer' },
  { firstName: 'Guest', lastName: 'Other', email: 'phase3d.other@example.com', role: 'customer' },
  { firstName: 'No', lastName: 'Wedding', email: 'phase3d.no-wedding@example.com', role: 'customer' },
  { firstName: 'Guest', lastName: 'Vendor', email: 'phase3d.vendor@example.com', role: 'vendor' },
  { firstName: 'Guest', lastName: 'Planner', email: 'phase3d.planner@example.com', role: 'planner' },
  { firstName: 'Guest', lastName: 'Admin', email: 'phase3d.admin@example.com', role: 'admin' },
];
const userIds = [];
const weddingIds = [];
const guestIds = [];

function assert(condition, message) { if (!condition) throw new Error(message); }
async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  return { response, data: await response.json() };
}
async function register(account) {
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ ...account, password: PASSWORD }) });
  assert(result.response.status === 201, `Could not register ${account.email}`);
  userIds.push(result.data.user._id); return result.data;
}
async function createWedding(token, weddingName) {
  const result = await request('/weddings', { method: 'POST', token, body: JSON.stringify({ weddingName, partner1Name: 'Partner One', partner2Name: 'Partner Two', weddingDate: '2027-12-20', city: 'Mogadishu', estimatedBudget: 1000, expectedGuests: 250 }) });
  assert(result.response.status === 201, `Could not create ${weddingName}`);
  weddingIds.push(result.data.wedding._id); return result.data.wedding;
}

async function verifyGuestFlow() {
  try {
    validateEnv(); await connectDatabase();
    const emails = accounts.map(({ email }) => email);
    assert(!(await User.exists({ email: { $in: emails } })), 'Verification accounts already exist; existing records were not modified');
    const owner = await register(accounts[0]); const other = await register(accounts[1]); const noWedding = await register(accounts[2]); const vendor = await register(accounts[3]); const planner = await register(accounts[4]);
    const adminUser = await User.create({ ...accounts[5], password: PASSWORD }); userIds.push(adminUser._id);
    const adminLogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: accounts[5].email, password: PASSWORD }) }); assert(adminLogin.response.ok, 'Admin login failed'); const admin = adminLogin.data;
    const ownerWedding = await createWedding(owner.token, 'Guest Owner Wedding'); await createWedding(other.token, 'Guest Other Wedding');

    const noWeddingGet = await request('/guests', { token: noWedding.token });
    const noWeddingCreate = await request('/guests', { method: 'POST', token: noWedding.token, body: JSON.stringify({ firstName: 'Orphan' }) });
    assert(noWeddingGet.response.ok && noWeddingGet.data.wedding === null && noWeddingCreate.response.status === 400, 'No-wedding guest state failed');
    console.log('PASS: no-wedding GET is clean and orphan guest creation rejected');

    const payloads = [
      { firstName: 'First', lastName: 'Guest', phone: '+252610000001', email: 'FIRST.GUEST@example.com', category: 'family', side: 'partner1', plusOneAllowed: true, plusOneName: 'Plus One', notes: 'Family', wedding: weddingIds[1], rsvpStatus: 'accepted', invitationStatus: 'sent' },
      { firstName: 'Second', category: 'friend', side: 'partner2', plusOneAllowed: false },
      { firstName: 'Third', category: 'relative', side: 'shared', plusOneAllowed: true },
    ];
    for (const payload of payloads) {
      const result = await request('/guests', { method: 'POST', token: owner.token, body: JSON.stringify(payload) });
      assert(result.response.status === 201, `Guest creation failed: ${result.data.message}`);
      assert(result.data.guest.wedding === ownerWedding._id && result.data.guest.rsvpStatus === 'pending' && result.data.guest.invitationStatus === 'not_sent', 'Ownership or controlled statuses were trusted from input');
      guestIds.push(result.data.guest._id);
    }
    const stored = await Guest.countDocuments({ _id: { $in: guestIds }, wedding: ownerWedding._id }); assert(stored === 3, 'Guests not stored under owner wedding');
    console.log('PASS: guests created in MongoDB with correct ownership and controlled statuses');

    const list = await request('/guests', { token: owner.token }); const summary = list.data.summary;
    assert(list.response.ok && list.data.count === 3 && list.data.wedding.expectedGuests === 250, 'Owner guest list or expected count failed');
    assert(summary.totalGuests === 3 && summary.partner1Guests === 1 && summary.partner2Guests === 1 && summary.sharedGuests === 1 && summary.pending === 3 && summary.plusOnes === 2, 'Guest summary is incorrect');
    const single = await request(`/guests/${guestIds[0]}`, { token: owner.token }); assert(single.response.ok && single.data.guest.email === 'first.guest@example.com', 'Single guest retrieval or email normalization failed');
    console.log('PASS: list, single guest, side counts, pending count, plus ones, and email normalization');

    const otherList = await request('/guests', { token: other.token });
    const otherGet = await request(`/guests/${guestIds[0]}`, { token: other.token });
    const otherPatch = await request(`/guests/${guestIds[0]}`, { method: 'PATCH', token: other.token, body: JSON.stringify({ firstName: 'Stolen' }) });
    const otherDelete = await request(`/guests/${guestIds[0]}`, { method: 'DELETE', token: other.token });
    assert(otherList.data.count === 0 && otherGet.response.status === 404 && otherPatch.response.status === 404 && otherDelete.response.status === 404, 'Customer B accessed Customer A guest');
    console.log('PASS: Customer A and Customer B guest data isolated');

    const updated = await request(`/guests/${guestIds[0]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ category: 'vip', plusOneAllowed: false, plusOneName: 'Must Clear', wedding: weddingIds[1], rsvpStatus: 'accepted' }) });
    assert(updated.response.ok && updated.data.guest.category === 'vip' && updated.data.guest.plusOneAllowed === false && updated.data.guest.plusOneName === '' && updated.data.guest.wedding === ownerWedding._id && updated.data.guest.rsvpStatus === 'pending', 'Guest update or protected fields failed');
    console.log('PASS: owner edit works, plus-one clears, protected fields ignored');

    for (const session of [vendor, planner, admin]) { const denied = await request('/guests', { token: session.token }); assert(denied.response.status === 403, `${session.user.role} accessed customer guests`); }
    const anonymous = await request('/guests'); assert(anonymous.response.status === 401, 'Anonymous guest request accepted');
    console.log('PASS: vendor, planner, admin, and anonymous access rejected');

    const invalidPayloads = [
      { firstName: '   ' }, { firstName: 'Bad Category', category: 'unknown' }, { firstName: 'Bad Side', side: 'unknown' },
      { firstName: 'Bad Email', email: 'not-an-email' }, { firstName: 'Bad Boolean', plusOneAllowed: 'yes' },
    ];
    for (const payload of invalidPayloads) { const invalid = await request('/guests', { method: 'POST', token: owner.token, body: JSON.stringify(payload) }); assert(invalid.response.status === 400, `Invalid payload accepted: ${JSON.stringify(payload)}`); }
    const malformed = await request('/guests', { method: 'POST', token: owner.token, body: 'null' });
    const invalidId = await request('/guests/not-an-id', { token: owner.token });
    const missingId = await request(`/guests/${new mongoose.Types.ObjectId()}`, { token: owner.token });
    assert(malformed.response.status === 400 && invalidId.response.status === 400 && missingId.response.status === 404, 'Malformed, invalid ID, or missing guest handling failed');
    console.log('PASS: required, enum, email, boolean, malformed body, invalid ID, and missing guest validation');

    const deleted = await request(`/guests/${guestIds[2]}`, { method: 'DELETE', token: owner.token }); assert(deleted.response.ok, 'Owner delete failed'); guestIds.splice(2, 1);
    const afterDelete = await request('/guests', { token: owner.token }); assert(afterDelete.data.count === 2 && afterDelete.data.summary.sharedGuests === 0 && afterDelete.data.summary.plusOnes === 0, 'Guest summary did not recalculate after delete');
    console.log('PASS: owner delete works and summary recalculates');
  } finally {
    if (mongoose.connection.readyState === 1) {
      if (weddingIds.length) await Guest.deleteMany({ wedding: { $in: weddingIds } });
      if (weddingIds.length) await Wedding.deleteMany({ _id: { $in: weddingIds }, customer: { $in: userIds } });
      if (userIds.length) await User.deleteMany({ _id: { $in: userIds }, email: { $in: accounts.map(({ email }) => email) } });
      console.log('PASS: cleaned exact Phase 3D test records');
    }
    await disconnectDatabase();
  }
}

verifyGuestFlow().catch((error) => { console.error(`Guest verification failed: ${error.message}`); process.exitCode = 1; });
