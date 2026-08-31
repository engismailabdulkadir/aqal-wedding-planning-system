import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';
import { validateEnv } from '../src/config/env.js';
import BudgetItem from '../src/models/BudgetItem.js';
import User from '../src/models/User.js';
import Wedding from '../src/models/Wedding.js';

const API_URL = `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const PASSWORD = 'Phase3CPassword';
const accounts = [
  { firstName: 'Budget', lastName: 'Owner', email: 'phase3c.owner@example.com', role: 'customer' },
  { firstName: 'Budget', lastName: 'Other', email: 'phase3c.other@example.com', role: 'customer' },
  { firstName: 'No', lastName: 'Wedding', email: 'phase3c.no-wedding@example.com', role: 'customer' },
  { firstName: 'Budget', lastName: 'Vendor', email: 'phase3c.vendor@example.com', role: 'vendor' },
  { firstName: 'Budget', lastName: 'Planner', email: 'phase3c.planner@example.com', role: 'planner' },
  { firstName: 'Budget', lastName: 'Admin', email: 'phase3c.admin@example.com', role: 'admin' },
];
const userIds = [];
const weddingIds = [];
const itemIds = [];

function assert(condition, message) { if (!condition) throw new Error(message); }
async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } });
  return { response, data: await response.json() };
}

async function register(account) {
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ ...account, password: PASSWORD }) });
  assert(result.response.status === 201, `Could not register ${account.email}`);
  userIds.push(result.data.user._id);
  return result.data;
}

async function createWedding(token, name, budget) {
  const result = await request('/weddings', { method: 'POST', token, body: JSON.stringify({ weddingName: name, partner1Name: 'Partner One', partner2Name: 'Partner Two', weddingDate: '2027-12-20', city: 'Mogadishu', estimatedBudget: budget, expectedGuests: 100 }) });
  assert(result.response.status === 201, `Could not create ${name}`);
  weddingIds.push(result.data.wedding._id);
  return result.data.wedding;
}

async function verifyBudgetFlow() {
  try {
    validateEnv();
    await connectDatabase();
    const emails = accounts.map(({ email }) => email);
    assert(!(await User.exists({ email: { $in: emails } })), 'Verification accounts already exist; existing data was not modified');

    const owner = await register(accounts[0]);
    const other = await register(accounts[1]);
    const noWedding = await register(accounts[2]);
    const vendor = await register(accounts[3]);
    const planner = await register(accounts[4]);
    const adminUser = await User.create({ ...accounts[5], password: PASSWORD });
    userIds.push(adminUser._id);
    const adminLogin = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: accounts[5].email, password: PASSWORD }) });
    assert(adminLogin.response.ok, 'Admin verification login failed');
    const admin = adminLogin.data;

    const ownerWedding = await createWedding(owner.token, 'Budget Owner Wedding', 1000);
    await createWedding(other.token, 'Other Customer Wedding', 2000);

    const cleanNoWedding = await request('/budget', { token: noWedding.token });
    assert(cleanNoWedding.response.ok && cleanNoWedding.data.budget === null, 'No-wedding budget state was not clean');
    const noWeddingCreate = await request('/budget', { method: 'POST', token: noWedding.token, body: JSON.stringify({ category: 'Venue', title: 'No Wedding Item', plannedAmount: 1 }) });
    assert(noWeddingCreate.response.status === 400, 'Customer without wedding created a budget item');
    console.log('PASS: no-wedding GET is clean and item creation is rejected');

    const payloads = [
      { category: 'Venue', title: 'Wedding Hall', plannedAmount: 600, actualAmount: 0, status: 'paid', wedding: weddingIds[1] },
      { category: 'Catering', title: 'Dinner', plannedAmount: 700, actualAmount: 400 },
      { category: 'Photography', title: 'Photo Team', plannedAmount: 100, actualAmount: 900 },
    ];
    const expectedStatuses = ['planned', 'partially_paid', 'paid'];
    for (let index = 0; index < payloads.length; index += 1) {
      const created = await request('/budget', { method: 'POST', token: owner.token, body: JSON.stringify(payloads[index]) });
      assert(created.response.status === 201 && created.data.item.status === expectedStatuses[index], `Automatic status failed for item ${index + 1}`);
      assert(created.data.item.wedding === ownerWedding._id, 'Frontend wedding ownership value was trusted');
      itemIds.push(created.data.item._id);
    }
    const storedCount = await BudgetItem.countDocuments({ _id: { $in: itemIds }, wedding: ownerWedding._id });
    assert(storedCount === 3, 'Budget items were not stored against the owner wedding');
    console.log('PASS: items stored in MongoDB with correct wedding and automatic statuses');

    const summary = await request('/budget', { token: owner.token });
    const budget = summary.data.budget;
    assert(summary.response.ok && budget.items.length === 3, 'Owner budget retrieval failed');
    assert(budget.estimatedBudget === 1000 && budget.totalPlannedCost === 1400 && budget.totalPaid === 0, 'Budget totals are incorrect');
    assert(budget.remainingBudget === -400 && budget.budgetUsagePercentage === 140, 'Over-budget calculations are incorrect');
    console.log('PASS: summary totals, spending, allocation, usage, and over-budget values correct');

    const otherBudget = await request('/budget', { token: other.token });
    assert(otherBudget.response.ok && otherBudget.data.budget.items.length === 0, 'Customer B viewed Customer A budget items');
    const otherPatch = await request(`/budget/${itemIds[0]}`, { method: 'PATCH', token: other.token, body: JSON.stringify({ title: 'Stolen Item' }) });
    const otherDelete = await request(`/budget/${itemIds[0]}`, { method: 'DELETE', token: other.token });
    assert(otherPatch.response.status === 403 && otherDelete.response.status === 403, 'Customer B managed Customer A budget item');
    console.log('PASS: Customer A and Customer B budgets are isolated');

    const updated = await request(`/budget/${itemIds[0]}`, { method: 'PATCH', token: owner.token, body: JSON.stringify({ actualAmount: 600, wedding: weddingIds[1], status: 'planned' }) });
    assert(updated.response.ok && updated.data.item.status === 'paid' && updated.data.item.wedding === ownerWedding._id, 'Owner update/status/ownership protection failed');
    console.log('PASS: owner update works, status recalculates, protected fields ignored');

    for (const session of [vendor, planner, admin]) {
      const denied = await request('/budget', { token: session.token });
      assert(denied.response.status === 403, `${session.user.role} accessed customer budget`);
    }
    const anonymous = await request('/budget');
    assert(anonymous.response.status === 401, 'Anonymous budget request was accepted');
    console.log('PASS: vendor, planner, admin, and anonymous access rejected');

    const invalidPayloads = [
      { category: 'Venue', title: 'Negative planned', plannedAmount: -1 },
      { category: 'Venue', title: 'Negative actual', plannedAmount: 1, actualAmount: -1 },
      { category: 'Venue', plannedAmount: 1 },
      { title: 'Missing category', plannedAmount: 1 },
      { category: 'Not a Category', title: 'Bad category', plannedAmount: 1 },
      { category: 'Venue', title: 'Infinity', plannedAmount: 'Infinity' },
    ];
    for (const payload of invalidPayloads) {
      const invalid = await request('/budget', { method: 'POST', token: owner.token, body: JSON.stringify(payload) });
      assert(invalid.response.status === 400, `Invalid payload accepted: ${JSON.stringify(payload)}`);
    }
    const invalidId = await request('/budget/not-an-id', { method: 'PATCH', token: owner.token, body: '{}' });
    const missingId = await request(`/budget/${new mongoose.Types.ObjectId()}`, { method: 'DELETE', token: owner.token });
    assert(invalidId.response.status === 400 && missingId.response.status === 404, 'Invalid or missing item ID handling failed');
    console.log('PASS: negative, missing, malformed, invalid ID, and missing item validation');

    const deleted = await request(`/budget/${itemIds[2]}`, { method: 'DELETE', token: owner.token });
    assert(deleted.response.ok, 'Owner delete failed');
    itemIds.splice(2, 1);
    const afterDelete = await request('/budget', { token: owner.token });
    assert(afterDelete.data.budget.items.length === 2 && afterDelete.data.budget.totalPlannedCost === 1300 && afterDelete.data.budget.totalPaid === 0, 'Summary did not recalculate after deletion');
    console.log('PASS: owner delete works and summary recalculates');
  } finally {
    if (mongoose.connection.readyState === 1) {
      if (weddingIds.length) await BudgetItem.deleteMany({ wedding: { $in: weddingIds } });
      if (weddingIds.length) await Wedding.deleteMany({ _id: { $in: weddingIds }, customer: { $in: userIds } });
      if (userIds.length) await User.deleteMany({ _id: { $in: userIds }, email: { $in: accounts.map(({ email }) => email) } });
      console.log(`PASS: cleaned exact Phase 3C test records`);
    }
    await disconnectDatabase();
  }
}

verifyBudgetFlow().catch((error) => { console.error(`Budget verification failed: ${error.message}`); process.exitCode = 1; });
