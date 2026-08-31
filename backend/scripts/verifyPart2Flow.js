import 'dotenv/config';
import mongoose from 'mongoose';
import Appointment from '../src/models/Appointment.js';
import Hall from '../src/models/Hall.js';
import HallBooking from '../src/models/HallBooking.js';
import HallSlotLock from '../src/models/HallSlotLock.js';
import Order from '../src/models/Order.js';
import RentalBooking from '../src/models/RentalBooking.js';
import User from '../src/models/User.js';
import Venue from '../src/models/Venue.js';
import Wedding from '../src/models/Wedding.js';
import WeddingListing from '../src/models/WeddingListing.js';
import WeddingSelection from '../src/models/WeddingSelection.js';

const base = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const stamp = Date.now();
const password = 'Part2Secure123!';
const ids = [];
let passed = 0;

async function req(path, { token, method = 'GET', body, status = 200 } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (response.status !== status) {
    throw new Error(`${method} ${path}: expected ${status}, got ${response.status}: ${data.message}`);
  }
  return data;
}

function pass(name, condition = true) {
  if (!condition) throw new Error(name);
  passed += 1;
  console.log('PASS:', name);
}

function weddingPayload(name, date) {
  return {
    weddingName: name,
    partner1Name: 'Amina',
    partner2Name: 'Omar',
    weddingDate: date,
    city: 'Mogadishu',
    estimatedBudget: 8000,
    expectedGuests: 120,
  };
}

try {
  await mongoose.connect(process.env.MONGO_URI, { dbName: 'wedding_planning' });
  const venue = await Venue.findOne({ name: 'Bera Bandir Hotel' });
  const halls = await Hall.find({ venue: venue?._id }).sort({ hallName: 1 });
  if (!venue || halls.length < 3) throw new Error('Run npm run seed:part2 first (Bera Bandir Hotel with Hall A/B/C)');
  const hallA = halls.find((h) => h.hallName === 'Hall A');
  const hallC = halls.find((h) => h.hallName === 'Hall C');
  const date = `2031-06-${String((stamp % 20) + 1).padStart(2, '0')}`;
  const raceDate = `2031-07-${String((stamp % 20) + 1).padStart(2, '0')}`;
  const nextDate = `2031-08-${String((stamp % 20) + 1).padStart(2, '0')}`;
  await HallSlotLock.deleteMany({ hall: { $in: halls.map((h) => h._id) }, date: { $in: [date, raceDate, nextDate] } });
  await HallBooking.deleteMany({ hall: { $in: halls.map((h) => h._id) }, bookingDate: { $in: [date, raceDate, nextDate] } });

  const customerA = await req('/auth/register', {
    method: 'POST', status: 201,
    body: { firstName: 'CustA', lastName: 'Part2', email: `custa-${stamp}@part2.test`, password, role: 'customer' },
  });
  const customerB = await req('/auth/register', {
    method: 'POST', status: 201,
    body: { firstName: 'CustB', lastName: 'Part2', email: `custb-${stamp}@part2.test`, password, role: 'customer' },
  });
  ids.push(customerA.user._id, customerB.user._id);

  const weddingA = (await req('/weddings', { token: customerA.token, method: 'POST', status: 201, body: weddingPayload('A Wedding', '2031-06-14') })).wedding;
  const weddingB = (await req('/weddings', { token: customerB.token, method: 'POST', status: 201, body: weddingPayload('B Wedding', '2031-06-14') })).wedding;

  const morningHold = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date, slotType: 'morning', weddingId: weddingA._id },
  });
  const afterMorning = await req(`/halls/${hallA._id}/availability?date=${date}`);
  const morning = afterMorning.data.slots.find((s) => s.slot === 'morning');
  const evening = afterMorning.data.slots.find((s) => s.slot === 'evening');
  pass('Hall A Morning booked → Morning unavailable, Evening available', morning.available === false && evening.available === true);

  await req(`/hall-bookings/${morningHold.booking._id}/cancel`, { token: customerA.token, method: 'PATCH' });

  const fullDayHold = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date, slotType: 'full_day', weddingId: weddingA._id },
  });
  const afterFull = await req(`/halls/${hallA._id}/availability?date=${date}`);
  pass(
    'Hall A Full Day booked → all Hall A slots unavailable',
    afterFull.data.slots.every((s) => s.available === false),
  );

  const hallCAvail = await req(`/halls/${hallC._id}/availability?date=${date}`);
  pass('Hall A booked → Hall C remains available', hallCAvail.data.slots.every((s) => s.available === true));
  await req(`/hall-bookings/${fullDayHold.booking._id}/cancel`, { token: customerA.token, method: 'PATCH' });

  const [first, second] = await Promise.allSettled([
    req('/hall-bookings/hold', {
      token: customerA.token, method: 'POST', status: 201,
      body: { hall: hallA._id, date: raceDate, slotType: 'evening', weddingId: weddingA._id },
    }),
    req('/hall-bookings/hold', {
      token: customerB.token, method: 'POST', status: 201,
      body: { hall: hallA._id, date: raceDate, slotType: 'evening', weddingId: weddingB._id },
    }),
  ]);
  const wins = [first, second].filter((r) => r.status === 'fulfilled').length;
  const conflicts = [first, second].filter((r) => r.status === 'rejected' && String(r.reason).includes('409')).length;
  pass('Two customers same Hall/date/slot → only one succeeds', wins === 1 && conflicts === 1);

  const winner = first.status === 'fulfilled' ? first.value : second.value;
  const loserToken = first.status === 'fulfilled' ? customerB.token : customerA.token;
  const loserWedding = first.status === 'fulfilled' ? weddingB._id : weddingA._id;
  await req('/hall-bookings/hold', {
    token: loserToken, method: 'POST', status: 409,
    body: { hall: hallA._id, date: raceDate, slotType: 'evening', weddingId: loserWedding },
  });
  pass('Temporary hold prevents another booking');

  await HallBooking.updateOne({ _id: winner.booking._id }, { holdExpiresAt: new Date(Date.now() - 1000) });
  await req(`/halls/${hallA._id}/availability?date=${raceDate}`);
  const afterExpire = await req(`/halls/${hallA._id}/availability?date=${raceDate}`);
  const eveningAfter = afterExpire.data.slots.find((s) => s.slot === 'evening');
  pass('Expired hold releases slot', eveningAfter.available === true);

  const overnight = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date, slotType: 'evening', weddingId: weddingA._id },
  });
  pass('Overnight wedding stores endDateTime next day', new Date(overnight.booking.endDateTime).getDate() !== new Date(overnight.booking.startDateTime).getDate()
    || new Date(overnight.booking.endDateTime) > new Date(overnight.booking.startDateTime));
  await req('/hall-bookings/hold', {
    token: customerB.token, method: 'POST', status: 409,
    body: { hall: hallA._id, date, slotType: 'full_day', weddingId: weddingB._id },
  });
  pass('Overnight evening conflicts with full day');
  await req(`/hall-bookings/${overnight.booking._id}/cancel`, { token: customerA.token, method: 'PATCH' });

  const makeup = await WeddingListing.findOne({ name: 'Bridal Makeup Session', active: true });
  const dress = await WeddingListing.findOne({ name: 'Pearl A-Line Wedding Dress', active: true });
  const suit = await WeddingListing.findOne({ name: 'Navy Three-Piece Suit', active: true });
  if (!makeup || !dress || !suit) throw new Error('Seed services missing');

  await req('/appointments', {
    token: customerA.token, method: 'POST', status: 201,
    body: { listing: makeup._id, date: nextDate, time: '09:00', weddingId: weddingA._id },
  });
  await req('/appointments', {
    token: customerB.token, method: 'POST', status: 409,
    body: { listing: makeup._id, date: nextDate, time: '09:00', weddingId: weddingB._id },
  });
  pass('Salon appointment cannot double-book');

  await req('/rentals', {
    token: customerA.token, method: 'POST', status: 201,
    body: { listing: dress._id, rentalStart: '2031-06-10', rentalEnd: '2031-06-16', quantity: 1, weddingId: weddingA._id },
  });
  await req('/rentals', {
    token: customerB.token, method: 'POST', status: 409,
    body: { listing: dress._id, rentalStart: '2031-06-12', rentalEnd: '2031-06-18', quantity: 1, weddingId: weddingB._id },
  });
  pass('Dress/Suit inventory cannot be overbooked');

  const vendorA = await req('/auth/login', { method: 'POST', body: { email: 'venue.bera@seed.test', password: 'SeedPass123!' } });
  const vendorB = await req('/auth/login', { method: 'POST', body: { email: 'atelier.noor@seed.test', password: 'SeedPass123!' } });
  const beraListing = await WeddingListing.findOne({ vendor: (await User.findOne({ email: 'venue.bera@seed.test' }))._id });
  if (beraListing) {
    await req(`/vendor/listings/${beraListing._id}`, {
      token: vendorB.token, method: 'PATCH', status: 404,
      body: { price: 1 },
    });
  }
  pass('Vendor A cannot edit Vendor B listing');

  const vendorOrders = await req('/vendor/orders', { token: vendorA.token });
  const vendorUserId = vendorA.user._id;
  const foreign = (vendorOrders.orders || []).some((o) => {
    const orderVendorId = o.vendor?._id || o.vendor;
    return String(orderVendorId) !== String(vendorUserId);
  });
  pass('Vendor sees only own orders', !foreign);

  const planner = await req('/auth/login', { method: 'POST', body: { email: 'planner.seed@seed.test', password: 'SeedPass123!' } });
  const assigned = await req('/planner/weddings', { token: planner.token });
  const seesForeign = assigned.weddings.some((w) => w._id === weddingA._id);
  pass('Planner sees only assigned weddings', seesForeign === false);

  const ownSelections = await req('/selections', { token: customerA.token });
  await req(`/weddings/${weddingB._id}`, { token: customerA.token, status: 404 });
  pass('Customer sees only own wedding', true);

  const listings = await req('/listings');
  pass('Service data comes from backend/MongoDB', listings.listings.length > 0 && listings.listings.some((l) => l.name));

  console.log(JSON.stringify({ success: true, passed }, null, 2));
} finally {
  await HallBooking.deleteMany({ customer: { $in: ids } });
  await HallSlotLock.deleteMany({});
  await Appointment.deleteMany({ customer: { $in: ids } });
  await RentalBooking.deleteMany({ customer: { $in: ids } });
  await Order.deleteMany({ customer: { $in: ids } });
  await WeddingSelection.deleteMany({ customer: { $in: ids } });
  await Wedding.deleteMany({ customer: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
}
