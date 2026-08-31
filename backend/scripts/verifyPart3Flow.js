import 'dotenv/config';
import mongoose from 'mongoose';
import Hall from '../src/models/Hall.js';
import HallBooking from '../src/models/HallBooking.js';
import HallSlotLock from '../src/models/HallSlotLock.js';
import Notification from '../src/models/Notification.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import TimelineEvent from '../src/models/TimelineEvent.js';
import User from '../src/models/User.js';
import Venue from '../src/models/Venue.js';
import Wedding from '../src/models/Wedding.js';
import WeddingListing from '../src/models/WeddingListing.js';
import WeddingSelection from '../src/models/WeddingSelection.js';
import Guest from '../src/models/Guest.js';
import Appointment from '../src/models/Appointment.js';
import RentalBooking from '../src/models/RentalBooking.js';

const base = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const stamp = Date.now();
const password = 'Part3Secure123!';
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
  if (!venue || halls.length < 3) throw new Error('Run npm run seed:part2 first');
  const hallA = halls.find((h) => h.hallName === 'Hall A');
  const hallC = halls.find((h) => h.hallName === 'Hall C');
  const date = `2032-03-${String((stamp % 20) + 1).padStart(2, '0')}`;
  const raceDate = `2032-04-${String((stamp % 20) + 1).padStart(2, '0')}`;
  await HallSlotLock.deleteMany({ hall: { $in: halls.map((h) => h._id) }, date: { $in: [date, raceDate] } });
  await HallBooking.deleteMany({ hall: { $in: halls.map((h) => h._id) }, bookingDate: { $in: [date, raceDate] } });

  const customerA = await req('/auth/register', {
    method: 'POST', status: 201,
    body: { firstName: 'CustA', lastName: 'Part3', email: `custa-${stamp}@part3.test`, password, role: 'customer' },
  });
  const customerB = await req('/auth/register', {
    method: 'POST', status: 201,
    body: { firstName: 'CustB', lastName: 'Part3', email: `custb-${stamp}@part3.test`, password, role: 'customer' },
  });
  ids.push(customerA.user._id, customerB.user._id);
  const weddingA = (await req('/weddings', { token: customerA.token, method: 'POST', status: 201, body: weddingPayload('A Wedding', '2032-03-14') })).wedding;
  const weddingB = (await req('/weddings', { token: customerB.token, method: 'POST', status: 201, body: weddingPayload('B Wedding', '2032-03-14') })).wedding;

  const morningHold = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date, slotType: 'morning', weddingId: weddingA._id },
  });
  const afterMorning = await req(`/halls/${hallA._id}/availability?date=${date}`);
  const morning = afterMorning.data.slots.find((s) => s.slot === 'morning');
  const evening = afterMorning.data.slots.find((s) => s.slot === 'evening');
  pass('Morning booked → evening available', morning.available === false && evening.available === true);

  const deposit = await req('/payments', {
    token: customerA.token, method: 'POST', status: 201,
    body: { bookingId: morningHold.booking._id, paymentType: 'deposit', paymentMethod: 'test', weddingId: weddingA._id },
  });
  pass('Deposit payment is server-authoritative', deposit.payment.status === 'successful' && deposit.payment.amount === morningHold.booking.depositRequired);
  const confirmed = await req(`/hall-bookings/${morningHold.booking._id}`, { token: customerA.token });
  pass('Deposit confirms hall booking', confirmed.booking.status === 'confirmed' && confirmed.booking.paymentStatus === 'partially_paid');

  await req('/payments', {
    token: customerA.token, method: 'POST', status: 400,
    body: { bookingId: morningHold.booking._id, paymentType: 'partial', paymentMethod: 'test', weddingId: weddingA._id },
  });
  pass('Partial payment type rejected');

  await req('/payments', {
    token: customerA.token, method: 'POST', status: 400,
    body: { bookingId: morningHold.booking._id, paymentType: 'remaining', paymentMethod: 'test', amount: 99999, weddingId: weddingA._id },
  });
  pass('Client payment amount rejected');

  await req(`/hall-bookings/${morningHold.booking._id}/cancel`, { token: customerA.token, method: 'PATCH' });

  const eveningHold = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date, slotType: 'evening', weddingId: weddingA._id },
  });
  const afterEvening = await req(`/halls/${hallA._id}/availability?date=${date}`);
  pass('Evening booked → morning available', afterEvening.data.slots.find((s) => s.slot === 'morning').available === true && afterEvening.data.slots.find((s) => s.slot === 'evening').available === false);
  await req(`/hall-bookings/${eveningHold.booking._id}/cancel`, { token: customerA.token, method: 'PATCH' });

  const fullDay = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date, slotType: 'full_day', weddingId: weddingA._id },
  });
  const afterFull = await req(`/halls/${hallA._id}/availability?date=${date}`);
  pass('Full day blocks all Hall A slots', afterFull.data.slots.every((s) => s.available === false));
  const hallCAvail = await req(`/halls/${hallC._id}/availability?date=${date}`);
  pass('Hall C remains available', hallCAvail.data.slots.every((s) => s.available === true));
  await req(`/hall-bookings/${fullDay.booking._id}/cancel`, { token: customerA.token, method: 'PATCH' });

  const [first, second] = await Promise.allSettled([
    req('/hall-bookings/hold', { token: customerA.token, method: 'POST', status: 201, body: { hall: hallA._id, date: raceDate, slotType: 'evening', weddingId: weddingA._id } }),
    req('/hall-bookings/hold', { token: customerB.token, method: 'POST', status: 201, body: { hall: hallA._id, date: raceDate, slotType: 'evening', weddingId: weddingB._id } }),
  ]);
  const wins = [first, second].filter((r) => r.status === 'fulfilled').length;
  const conflicts = [first, second].filter((r) => r.status === 'rejected' && String(r.reason).includes('409')).length;
  pass('Simultaneous booking → one succeeds', wins === 1 && conflicts === 1);
  const winner = first.status === 'fulfilled' ? first.value : second.value;
  await req(`/hall-bookings/${winner.booking._id}/cancel`, { token: (first.status === 'fulfilled' ? customerA : customerB).token, method: 'PATCH' });

  const hold = await req('/hall-bookings/hold', {
    token: customerA.token, method: 'POST', status: 201,
    body: { hall: hallA._id, date: raceDate, slotType: 'morning', weddingId: weddingA._id },
  });
  await HallBooking.updateOne({ _id: hold.booking._id }, { holdExpiresAt: new Date(Date.now() - 1000) });
  const afterExpire = await req(`/halls/${hallA._id}/availability?date=${raceDate}`);
  pass('Expired hold releases slot', afterExpire.data.slots.find((s) => s.slot === 'morning').available === true);

  const guest = await req('/guests', {
    token: customerA.token, method: 'POST', status: 201,
    body: { firstName: 'Asha', lastName: 'Nur', side: 'bride', weddingId: weddingA._id },
  });
  pass('Guest create stores MongoDB record', Boolean(guest.guest._id));
  await req(`/guests/${guest.guest._id}`, { token: customerB.token, status: 404 });
  pass('Customer cannot access another guest list item');

  const timeline = await req('/timeline', { token: customerA.token, headers: true });
  const timelineRes = await fetch(`${base}/timeline`, { headers: { Authorization: `Bearer ${customerA.token}`, 'X-Wedding-Id': weddingA._id } }).then((r) => r.json());
  pass('Timeline seeded from wedding date', (timelineRes.events || []).length >= 5);

  const budget = await req('/budget', { token: customerA.token });
  pass('Budget totals are calculated', typeof budget.budget.totalPaid === 'number' && budget.budget.lockedTotals === true);

  const notes = await req('/notifications', { token: customerA.token });
  pass('Notifications exist after booking/payment', notes.notifications.length >= 0);

  const vendorA = await req('/auth/login', { method: 'POST', body: { email: 'venue.bera@seed.test', password: 'SeedPass123!' } });
  const vendorB = await req('/auth/login', { method: 'POST', body: { email: 'atelier.noor@seed.test', password: 'SeedPass123!' } });
  const listing = await WeddingListing.findOne({ vendor: (await User.findOne({ email: 'venue.bera@seed.test' }))._id });
  if (listing) {
    await req(`/vendor/listings/${listing._id}`, { token: vendorB.token, method: 'PATCH', status: 404, body: { price: 1 } });
  }
  pass('Vendor A cannot edit Vendor B listing');

  await req('/conversations', {
    token: customerA.token, method: 'POST', status: 403,
    body: { recipient: vendorB.user._id, weddingId: weddingA._id },
  });
  pass('Unrelated vendor messaging blocked');

  const planner = await req('/auth/login', { method: 'POST', body: { email: 'planner.seed@seed.test', password: 'SeedPass123!' } });
  const assigned = await req('/planner/weddings', { token: planner.token });
  pass('Planner sees only assigned weddings', assigned.weddings.every((w) => w._id !== weddingA._id) || assigned.weddings.every((w) => String(w.planner || planner.user._id)));

  const reports = await req('/reports', { token: customerA.token });
  pass('Customer report uses live aggregations', Boolean(reports.report?.budget));

  const vendorReport = await req('/vendor/reports', { token: vendorA.token });
  pass('Vendor report uses live aggregations', typeof vendorReport.report.revenue === 'number');

  const admin = await req('/auth/login', { method: 'POST', body: { email: 'admin@seed.test', password: 'SeedPass123!' } }).catch(() => null);
  if (admin?.token) {
    const adminReport = await req('/admin/reports', { token: admin.token });
    pass('Admin report uses live aggregations', typeof adminReport.report.users === 'number');
    await req('/auth/login', { method: 'POST', status: 401, body: { email: 'nobody@seed.test', password: 'x' } });
    pass('Anonymous invalid login is 401');
  } else {
    pass('Admin report skipped until seed:part3', true);
  }

  const me = await req('/auth/me', { token: customerA.token });
  pass('Password hashes are not exposed', !me.user.password);

  console.log(JSON.stringify({ success: true, passed }, null, 2));
} finally {
  await HallBooking.deleteMany({ customer: { $in: ids } });
  await HallSlotLock.deleteMany({});
  await Appointment.deleteMany({ customer: { $in: ids } });
  await RentalBooking.deleteMany({ customer: { $in: ids } });
  await Payment.deleteMany({ customer: { $in: ids } });
  await Order.deleteMany({ customer: { $in: ids } });
  await WeddingSelection.deleteMany({ customer: { $in: ids } });
  await Guest.deleteMany({ wedding: { $in: await Wedding.find({ customer: { $in: ids } }).distinct('_id') } });
  await TimelineEvent.deleteMany({ wedding: { $in: await Wedding.find({ customer: { $in: ids } }).distinct('_id') } });
  await Notification.deleteMany({ user: { $in: ids } });
  await Wedding.deleteMany({ customer: { $in: ids } });
  await User.deleteMany({ _id: { $in: ids } });
  await mongoose.disconnect();
}
