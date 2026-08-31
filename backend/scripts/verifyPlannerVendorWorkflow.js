import 'dotenv/config';
import mongoose from 'mongoose';
import Guest from '../src/models/Guest.js';
import Invitation from '../src/models/Invitation.js';
import Notification from '../src/models/Notification.js';
import Order from '../src/models/Order.js';
import Task from '../src/models/Task.js';
import TimelineEvent from '../src/models/TimelineEvent.js';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Wedding from '../src/models/Wedding.js';
import WeddingListing from '../src/models/WeddingListing.js';
import WeddingSelection from '../src/models/WeddingSelection.js';

const base = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const stamp = Date.now();
const password = 'PlannerVendor123!';
const userIds = [];
const weddingIds = [];
let passed = 0;

async function req(path, { token, method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status !== status) {
    throw new Error(`${method} ${path}: expected ${status}, got ${response.status}: ${data.message || JSON.stringify(data)}`);
  }
  return data;
}

function pass(name, condition = true) {
  if (!condition) throw new Error(name);
  passed += 1;
  console.log('PASS:', name);
}

try {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });

  const admin = await User.create({
    firstName: 'Root',
    lastName: 'PlannerVendor',
    email: `root-pv-${stamp}@test.local`,
    password,
    role: 'admin',
  });
  userIds.push(admin._id);
  const adminSession = await req('/auth/login', { method: 'POST', body: { email: admin.email, password } });

  const muuse = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Muuse', lastName: 'Customer', email: `muuse-pv-${stamp}@test.local`, password, role: 'customer' },
  });
  userIds.push(muuse.user._id);

  const fatima = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Fatima', lastName: 'Ali', email: `fatima-pv-${stamp}@test.local`, password, role: 'planner' },
  });
  userIds.push(fatima.user._id);

  const ahmed = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Ahmed', lastName: 'Hassan', email: `ahmed-pv-${stamp}@test.local`, password, role: 'planner' },
  });
  userIds.push(ahmed.user._id);

  const abc = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'ABC', lastName: 'Studio', email: `abc-pv-${stamp}@test.local`, password, role: 'vendor' },
  });
  userIds.push(abc.user._id);

  const otherVendor = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Other', lastName: 'Vendor', email: `othervendor-pv-${stamp}@test.local`, password, role: 'vendor' },
  });
  userIds.push(otherVendor.user._id);

  const created = await req('/admin/weddings', {
    token: adminSession.token,
    method: 'POST',
    status: 201,
    body: {
      customer: muuse.user._id,
      weddingName: 'Muuse & Salma',
      partner1Name: 'Muuse',
      partner2Name: 'Salma',
      weddingDate: '2034-08-30',
      city: 'Mogadishu',
      expectedGuests: 150,
      estimatedBudget: 5000,
    },
  });
  const wedding = created.wedding;
  weddingIds.push(wedding._id);
  pass('Admin created wedding owned by Muuse', String(wedding.customer._id || wedding.customer) === String(muuse.user._id));
  pass('Admin is not the wedding owner', String(wedding.customer._id || wedding.customer) !== String(admin._id));

  const assigned = await req(`/admin/weddings/${wedding._id}/planner`, {
    token: adminSession.token,
    method: 'PATCH',
    body: { planner: fatima.user._id },
  });
  pass('Planner assigned successfully', assigned.message === 'Planner assigned successfully.');
  pass('Fatima is the assigned planner', String(assigned.wedding.planner._id || assigned.wedding.planner) === String(fatima.user._id));

  const fatimaWeddings = await req('/planner/weddings', { token: fatima.token });
  pass('Fatima sees the assigned wedding', fatimaWeddings.count === 1 && fatimaWeddings.weddings[0]._id === wedding._id);

  const ahmedWeddings = await req('/planner/weddings', { token: ahmed.token });
  pass('Ahmed does not see Muuse & Salma', ahmedWeddings.count === 0);
  await req(`/planner/weddings/${wedding._id}`, { token: ahmed.token, status: 404 });
  pass('Ahmed cannot open an unassigned wedding');

  const customerWeddings = await req('/weddings', { token: muuse.token });
  pass('Customer still owns the wedding', customerWeddings.weddings.some((item) => item._id === wedding._id && String(item.customer._id || item.customer) === String(muuse.user._id)));

  const adminView = await req(`/admin/weddings/${wedding._id}`, { token: adminSession.token });
  pass('Admin sees wedding details', adminView.wedding._id === wedding._id);

  await req('/vendors/me/profile', {
    token: abc.token,
    method: 'PUT',
    body: { businessName: 'ABC Studio', ownerName: 'ABC', category: 'photography', city: 'Mogadishu', description: 'Wedding photography' },
  });
  const listing = (await req('/vendor/listings', {
    token: abc.token,
    method: 'POST',
    status: 201,
    body: {
      name: 'Wedding Photography',
      category: 'photography',
      listingType: 'service',
      description: 'Full day coverage',
      price: 300,
      city: 'Mogadishu',
      available: true,
      active: true,
    },
  })).listing;

  const before = await req(`/weddings/${wedding._id}/overview`, { token: muuse.token });

  await req('/selections', {
    token: muuse.token,
    method: 'POST',
    status: 201,
    body: { listing: listing._id, weddingId: wedding._id },
  });

  const vendorOrders = await req('/vendor/orders', { token: abc.token });
  const photoOrder = vendorOrders.orders.find((item) => item.itemName === 'Wedding Photography');
  pass('ABC vendor sees the new pending order', Boolean(photoOrder) && photoOrder.status === 'pending');

  const plannerWedding = await req(`/planner/weddings/${wedding._id}`, { token: fatima.token });
  pass('Fatima sees the photography vendor/order', plannerWedding.orders.some((item) => item._id === photoOrder._id && item.status === 'pending'));

  const customerSelections = await req(`/selections?weddingId=${wedding._id}`, { token: muuse.token });
  pass('Customer sees photography pending', customerSelections.selections.some((item) => item.itemName === 'Wedding Photography' && item.status === 'pending'));

  await req(`/vendor/orders/${photoOrder._id}`, {
    token: abc.token,
    method: 'PATCH',
    body: { status: 'confirmed' },
  });

  const after = await req(`/weddings/${wedding._id}/overview`, { token: muuse.token });
  const confirmedSelection = (await req(`/selections?weddingId=${wedding._id}`, { token: muuse.token })).selections.find((item) => item.itemName === 'Wedding Photography');
  pass('Customer photography confirmed', confirmedSelection?.status === 'confirmed');
  pass('Confirmed vendors increased', after.overview.confirmedVendors > (before.overview.confirmedVendors || 0));

  const plannerAfter = await req(`/planner/weddings/${wedding._id}`, { token: fatima.token });
  pass('Planner photography confirmed', plannerAfter.orders.some((item) => item._id === photoOrder._id && item.status === 'confirmed'));

  const vendorAfter = await req('/vendor/orders', { token: abc.token });
  pass('Order status is confirmed', vendorAfter.orders.some((item) => item._id === photoOrder._id && item.status === 'confirmed'));

  const adminAfter = await req(`/admin/weddings/${wedding._id}`, { token: adminSession.token });
  pass('Admin sees confirmed photography order', adminAfter.orders.some((item) => item._id === photoOrder._id && item.status === 'confirmed'));

  const task = (await req(`/planner/weddings/${wedding._id}/tasks`, {
    token: fatima.token,
    method: 'POST',
    status: 201,
    body: { title: 'Confirm Photography Arrival Time', assignedTo: abc.user._id },
  })).task;
  pass('Planner created assigned task', task.title === 'Confirm Photography Arrival Time');

  const customerTasks = await req(`/tasks?weddingId=${wedding._id}`, { token: muuse.token });
  pass('Customer sees the planner task', customerTasks.tasks.some((item) => item._id === task._id));

  const vendorTasks = await req('/vendor/tasks', { token: abc.token });
  pass('Assigned vendor sees the task', vendorTasks.tasks.some((item) => item._id === task._id));

  const otherTasks = await req('/vendor/tasks', { token: otherVendor.token });
  pass('Unrelated vendor does not see the task', !otherTasks.tasks.some((item) => item._id === task._id));

  const adminTasks = await req(`/admin/weddings/${wedding._id}`, { token: adminSession.token });
  pass('Admin sees the task', adminTasks.tasks.some((item) => item._id === task._id));

  await req('/admin/users', { token: fatima.token, status: 403 });
  pass('Planner cannot access admin user management');

  console.log(JSON.stringify({ success: true, passed }, null, 2));
} catch (error) {
  console.error('FAIL:', error.message);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState !== 1) {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });
  }
  await Promise.all([
    Task.deleteMany({ wedding: { $in: weddingIds } }),
    Order.deleteMany({ wedding: { $in: weddingIds } }),
    WeddingSelection.deleteMany({ wedding: { $in: weddingIds } }),
    TimelineEvent.deleteMany({ wedding: { $in: weddingIds } }),
    Guest.deleteMany({ wedding: { $in: weddingIds } }),
    Invitation.deleteMany({ wedding: { $in: weddingIds } }),
    Notification.deleteMany({ wedding: { $in: weddingIds } }),
    WeddingListing.deleteMany({ vendor: { $in: userIds } }),
    VendorProfile.deleteMany({ user: { $in: userIds } }),
    Wedding.deleteMany({ _id: { $in: weddingIds } }),
    User.deleteMany({ _id: { $in: userIds } }),
  ]);
  await mongoose.disconnect();
}
