import 'dotenv/config';
import mongoose from 'mongoose';
import Hall from '../src/models/Hall.js';
import HallBooking from '../src/models/HallBooking.js';
import HallSlotLock from '../src/models/HallSlotLock.js';
import Order from '../src/models/Order.js';
import User from '../src/models/User.js';
import Venue from '../src/models/Venue.js';
import Wedding from '../src/models/Wedding.js';

const base = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const stamp = Date.now();
const password = 'RecoveryTest123!';

const userIds = [];
const weddingIds = [];
let originalCapacity = null;
let hallA = null;
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
  const venue = await Venue.findOne({ name: 'Bera Bandir Hotel' });
  hallA = await Hall.findOne({ venue: venue?._id, hallName: 'Hall A' });
  if (!venue || !hallA) throw new Error('Run npm run seed:part2 first');

  originalCapacity = hallA.capacity;
  await Hall.findByIdAndUpdate(hallA._id, { capacity: 200 });

  const date = `2033-04-${String((stamp % 20) + 1).padStart(2, '0')}`;
  await HallSlotLock.deleteMany({ hall: hallA._id, date });
  await HallBooking.deleteMany({ hall: hallA._id, bookingDate: date });

  const customer = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: {
      firstName: 'Recovery',
      lastName: 'Test',
      email: `recovery-${stamp}@test.local`,
      password,
      role: 'customer',
    },
  });
  userIds.push(customer.user._id);

  const wedding = (await req('/weddings', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: {
      weddingName: 'Recovery Flow Wedding',
      partner1Name: 'Partner',
      partner2Name: 'Partner',
      weddingDate: '2033-06-14',
      city: 'Mogadishu',
      estimatedBudget: 1150,
      expectedGuests: 300,
    },
  })).wedding;
  weddingIds.push(wedding._id);

  const availability = await req(
    `/venues/${venue._id}/availability?date=${date}&expectedGuests=300`,
  );
  const hallRow = availability.halls.find((h) => String(h.hallId) === String(hallA._id));
  pass('Availability marks Hall A unsuitable for 300 guests', hallRow?.capacityStatus?.suitable === false);
  pass('Recommendations exclude undersized halls', !availability.recommendations?.some((h) => String(h.hallId) === String(hallA._id)));

  const capacityFail = await req('/hall-bookings/hold', {
    token: customer.token,
    method: 'POST',
    body: {
      hall: hallA._id,
      date,
      slotType: 'full_day',
      weddingId: wedding._id,
    },
    status: 422,
  });
  pass('Hold rejected with structured capacity code', capacityFail.code === 'HALL_CAPACITY_EXCEEDED');
  pass('Capacity details include guest counts', capacityFail.details?.expectedGuests === 300 && capacityFail.details?.hallCapacity === 200);

  const updated = await req(`/weddings/${wedding._id}`, {
    token: customer.token,
    method: 'PATCH',
    body: { expectedGuests: 180 },
  });
  pass('Wedding guest count updated', updated.wedding.expectedGuests === 180);

  const holdOk = await req('/hall-bookings/hold', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: {
      hall: hallA._id,
      date,
      slotType: 'full_day',
      weddingId: wedding._id,
    },
  });
  pass('Hold succeeds after guest count fix', holdOk.booking?.status === 'held');

  await req(`/hall-bookings/${holdOk.booking._id}/cancel`, { token: customer.token, method: 'PATCH' });

  await req(`/weddings/${wedding._id}`, {
    token: customer.token,
    method: 'PATCH',
    body: { estimatedBudget: 300 },
  });

  const budgetFail = await req('/hall-bookings/hold', {
    token: customer.token,
    method: 'POST',
    body: {
      hall: hallA._id,
      date,
      slotType: 'full_day',
      weddingId: wedding._id,
    },
    status: 422,
  });
  pass('Hold rejected when budget too low', budgetFail.code === 'BUDGET_EXCEEDED');
  pass('Budget details returned', budgetFail.details?.totalBudget === 300);

  await req(`/weddings/${wedding._id}`, {
    token: customer.token,
    method: 'PATCH',
    body: { estimatedBudget: 1150 },
  });

  const holdAfterBudget = await req('/hall-bookings/hold', {
    token: customer.token,
    method: 'POST',
    status: 201,
    body: {
      hall: hallA._id,
      date,
      slotType: 'full_day',
      weddingId: wedding._id,
    },
  });
  pass('Hold succeeds after budget fix', holdAfterBudget.booking?.status === 'held');

  console.log(`\nWedding recovery verification complete: ${passed} checks passed`);
} catch (error) {
  console.error(`Wedding recovery verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (mongoose.connection.readyState === 1) {
    if (hallA?._id && originalCapacity != null) {
      await Hall.findByIdAndUpdate(hallA._id, { capacity: originalCapacity });
    }
    if (weddingIds.length) {
      await Order.deleteMany({ wedding: { $in: weddingIds } });
      await HallBooking.deleteMany({ wedding: { $in: weddingIds } });
      await Wedding.deleteMany({ _id: { $in: weddingIds } });
    }
    if (userIds.length) await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
  }
}
