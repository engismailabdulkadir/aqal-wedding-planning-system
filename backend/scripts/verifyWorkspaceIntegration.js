import 'dotenv/config';
import mongoose from 'mongoose';
import Guest from '../src/models/Guest.js';
import Hall from '../src/models/Hall.js';
import HallBooking from '../src/models/HallBooking.js';
import HallSlotLock from '../src/models/HallSlotLock.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import Task from '../src/models/Task.js';
import TimelineEvent from '../src/models/TimelineEvent.js';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Venue from '../src/models/Venue.js';
import Wedding from '../src/models/Wedding.js';
import WeddingListing from '../src/models/WeddingListing.js';
import WeddingSelection from '../src/models/WeddingSelection.js';

const base = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const stamp = Date.now();
const password = 'WorkspaceInt123!';
const BUDGET = 2000;
const HALL_PRICE = 700;
const SUIT_PRICE = 200;

const userIds = [];
const weddingIds = [];
const listingIds = [];
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

function near(value, expected, label) {
  if (Math.abs(Number(value) - expected) >= 0.02) {
    throw new Error(`${label}: expected ${expected}, got ${value}`);
  }
}

function timelineByKey(events, key) {
  return events.find((event) => event.key === key || event.title.toLowerCase().includes(key.replaceAll('_', ' ')));
}

async function cleanupHallDate(hallId, date) {
  await HallSlotLock.deleteMany({ hall: hallId, date });
  const bookings = await HallBooking.find({ hall: hallId, bookingDate: date });
  const bookingIds = bookings.map((item) => item._id);
  if (bookingIds.length) {
    await Payment.deleteMany({ booking: { $in: bookingIds } });
    await Order.deleteMany({ booking: { $in: bookingIds } });
    await HallBooking.deleteMany({ _id: { $in: bookingIds } });
  }
}

try {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });
  const venue = await Venue.findOne({ name: 'Bera Bandir Hotel' });
  const hallA = await Hall.findOne({ venue: venue?._id, hallName: 'Hall A' });
  const vendorProfile = await VendorProfile.findOne({ businessName: /Noor|Atelier/i });
  const vendorUser = vendorProfile ? await User.findById(vendorProfile.user) : null;
  if (!venue || !hallA || !vendorUser) throw new Error('Run npm run seed first (Bera Bandir / Hall A / attire vendor)');

  const date = `2033-05-${String((stamp % 20) + 1).padStart(2, '0')}`;
  await cleanupHallDate(hallA._id, date);

  const admin = await User.create({
    firstName: 'Root',
    lastName: 'WorkspaceInt',
    email: `root-workspace-${stamp}@test.local`,
    password,
    role: 'admin',
  });
  userIds.push(admin._id);
  const adminSession = await req('/auth/login', { method: 'POST', body: { email: admin.email, password } });

  const customer = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Muuse', lastName: 'Customer', email: `muuse-${stamp}@test.local`, password, role: 'customer' },
  });
  userIds.push(customer.user._id);

  const planner = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Amina', lastName: 'Planner', email: `planner-${stamp}@test.local`, password, role: 'planner' },
  });
  userIds.push(planner.user._id);

  const other = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: { firstName: 'Other', lastName: 'Customer', email: `other-${stamp}@test.local`, password, role: 'customer' },
  });
  userIds.push(other.user._id);

  const wedding = (await req('/weddings', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: {
      weddingName: 'muuse & Salma',
      partner1Name: 'muuse',
      partner2Name: 'Salma',
      weddingDate: date,
      city: 'Mogadishu',
      estimatedBudget: BUDGET,
      expectedGuests: 200,
    },
  })).wedding;
  weddingIds.push(wedding._id);

  const otherWedding = (await req('/weddings', {
    token: other.token,
    method: 'POST',
    status: 201,
    body: {
      weddingName: 'Other Couple',
      partner1Name: 'Ali',
      partner2Name: 'Hawa',
      weddingDate: '2033-08-12',
      city: 'Hargeisa',
      estimatedBudget: 5000,
      expectedGuests: 80,
    },
  })).wedding;
  weddingIds.push(otherWedding._id);

  await req(`/admin/weddings/${wedding._id}/planner`, {
    token: adminSession.token,
    method: 'PATCH',
    body: { planner: planner.user._id },
  });
  pass('Admin assigned planner');

  const unassigned = await req(`/planner/weddings/${otherWedding._id}`, { token: planner.token, status: 404 });
  pass('Planner cannot open an unassigned wedding', Boolean(unassigned.message));

  const hold = await req('/hall-bookings/hold', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: { hall: hallA._id, date, slotType: 'full_day', weddingId: wedding._id },
  });
  const hallOrder = await Order.findOne({ booking: hold.booking._id });
  pass('Hall hold created related order', Boolean(hallOrder));

  const afterHold = await req(`/weddings/${wedding._id}/overview`, { token: customer.token });
  const bookHallHeld = timelineByKey((await req(`/timeline?weddingId=${wedding._id}`, { token: customer.token })).events, 'book_hall');
  pass('Held hall does not count as confirmed booking', afterHold.overview.confirmedBookings === 0);
  pass('Book Hall is in progress after hold', bookHallHeld.status === 'in_progress');

  await req('/payments', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: {
      orderId: hallOrder._id,
      bookingId: hold.booking._id,
      paymentType: 'deposit',
      paymentMethod: 'test',
      weddingId: wedding._id,
    },
  });

  const afterHall = await req(`/weddings/${wedding._id}/management`, { token: customer.token });
  const o1 = afterHall.overview;
  near(o1.plannedCost, HALL_PRICE, 'Hall planned cost');
  near(o1.remainingBudget, BUDGET - HALL_PRICE, 'Hall remaining budget');
  near(o1.amountDue, HALL_PRICE - 150, 'Hall amount due after deposit');
  pass('Hall confirmed on Venue tab', afterHall.hall.current?.status === 'confirmed' && afterHall.hall.current?.hall?.hallName === 'Hall A');
  pass('Hall order exists', afterHall.bookings.orders.some((item) => item.booking && Number(item.amount) === HALL_PRICE));
  pass('Confirmed bookings = 1', o1.confirmedBookings === 1);
  pass('Confirmed vendors = 1', o1.confirmedVendors === 1);
  const bookHall = timelineByKey(afterHall.timeline.events, 'book_hall');
  pass('Book Hall completed after confirmation', bookHall?.status === 'completed');

  const suit = await WeddingListing.create({
    vendor: vendorUser._id,
    vendorProfile: vendorProfile._id,
    name: `Workspace Groom Suit ${stamp}`,
    category: 'groom_attire',
    listingType: 'product',
    description: 'Integration test suit',
    price: SUIT_PRICE,
    city: 'Mogadishu',
    available: true,
    active: true,
    availabilityType: 'none',
  });
  listingIds.push(suit._id);

  await req('/selections', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: { listing: suit._id, weddingId: wedding._id },
  });

  const afterSuit = await req(`/weddings/${wedding._id}/management`, { token: customer.token });
  const o2 = afterSuit.overview;
  pass('Groom tab shows suit', afterSuit.groom.some((item) => item.itemName.includes('Suit')));
  pass('Suit order exists', afterSuit.bookings.orders.some((item) => item.category === 'groom_attire' && Number(item.amount) === SUIT_PRICE));
  near(o2.plannedCost, HALL_PRICE + SUIT_PRICE, 'Planned cost after suit');
  near(o2.remainingBudget, BUDGET - HALL_PRICE - SUIT_PRICE, 'Remaining budget after suit');
  pass('Suit payment obligation exists', afterSuit.bookings.orders.some((item) => item.category === 'groom_attire' && item.paymentStatus === 'unpaid' && Number(item.balance) === SUIT_PRICE));
  const groomTimeline = timelineByKey(afterSuit.timeline.events, 'choose_groom_suit');
  pass('Choose Groom Suit updated', ['in_progress', 'completed'].includes(groomTimeline?.status));

  for (let i = 1; i <= 10; i += 1) {
    await req('/guests', {
      token: customer.token,
      method: 'POST',
      status: 201,
      body: { firstName: `Guest${i}`, lastName: 'Test', side: i % 2 ? 'bride' : 'groom', weddingId: wedding._id },
    });
  }
  const afterGuests = await req(`/weddings/${wedding._id}/overview`, { token: customer.token });
  pass('Overview guests 10 of 200', afterGuests.overview.guestsAdded === 10 && afterGuests.overview.expectedGuests === 200);

  const titles = ['Confirm Hall Setup', 'Prepare Decoration', 'Final Venue Inspection', 'Vendor Check-in', 'Family Briefing'];
  const createdTasks = [];
  for (const title of titles) {
    const result = await req(`/planner/weddings/${wedding._id}/tasks`, {
      token: planner.token,
      method: 'POST',
      status: 201,
      body: { title, category: 'other' },
    });
    createdTasks.push(result.task);
  }
  for (const task of createdTasks.slice(0, 3)) {
    await req(`/planner/tasks/${task._id}`, {
      token: planner.token,
      method: 'PATCH',
      body: { status: 'completed' },
    });
  }
  const afterTasks = await req(`/weddings/${wedding._id}/overview`, { token: customer.token });
  pass('Tasks 3 of 5 completed', afterTasks.overview.tasksCompleted === 3 && afterTasks.overview.tasksTotal === 5);
  pass('Tasks completed = 60%', afterTasks.overview.tasksPercentage === 60);

  const plannerView = await req(`/planner/weddings/${wedding._id}`, { token: planner.token });
  pass('Planner sees assigned wedding live overview', plannerView.overview.guestsAdded === 10 && plannerView.overview.confirmedBookings === 1);

  const isolated = await req(`/weddings/${otherWedding._id}/overview`, { token: other.token });
  pass('Other customer wedding is isolated', isolated.overview.confirmedBookings === 0 && isolated.overview.guestsAdded === 0);
  await req(`/weddings/${wedding._id}/overview`, { token: other.token, status: 404 });
  pass('Customer cannot read another wedding overview');

  const managementReload = await req(`/weddings/${wedding._id}/management`, { token: customer.token });
  pass(
    'Workspace snapshot stays consistent after reload',
    managementReload.overview.plannedCost === HALL_PRICE + SUIT_PRICE
    && managementReload.overview.confirmedBookings === 1
    && managementReload.guests.count === 10
    && managementReload.tasks.summary.percentage === 60,
  );

  console.log(`\nWorkspace integration verification complete: ${passed} checks passed`);
} catch (error) {
  console.error(`Workspace integration verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState === 1) {
    if (listingIds.length) {
      await WeddingSelection.deleteMany({ listing: { $in: listingIds } });
      await Order.deleteMany({ service: { $in: listingIds } });
      await WeddingListing.deleteMany({ _id: { $in: listingIds } });
    }
    if (weddingIds.length) {
      await Payment.deleteMany({ wedding: { $in: weddingIds } });
      await Order.deleteMany({ wedding: { $in: weddingIds } });
      await HallBooking.deleteMany({ wedding: { $in: weddingIds } });
      await WeddingSelection.deleteMany({ wedding: { $in: weddingIds } });
      await Guest.deleteMany({ wedding: { $in: weddingIds } });
      await Task.deleteMany({ wedding: { $in: weddingIds } });
      await TimelineEvent.deleteMany({ wedding: { $in: weddingIds } });
      await Wedding.deleteMany({ _id: { $in: weddingIds } });
    }
    if (userIds.length) {
      await User.deleteMany({ _id: { $in: userIds } });
    }
    await mongoose.disconnect();
  }
}
