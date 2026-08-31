import 'dotenv/config';
import mongoose from 'mongoose';
import Hall from '../src/models/Hall.js';
import HallBooking from '../src/models/HallBooking.js';
import HallSlotLock from '../src/models/HallSlotLock.js';
import Order from '../src/models/Order.js';
import Payment from '../src/models/Payment.js';
import User from '../src/models/User.js';
import VendorProfile from '../src/models/VendorProfile.js';
import Venue from '../src/models/Venue.js';
import Wedding from '../src/models/Wedding.js';
import WeddingListing from '../src/models/WeddingListing.js';
import WeddingSelection from '../src/models/WeddingSelection.js';

const base = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api/v1`;
const stamp = Date.now();
const password = 'BudgetPayTest123!';
const BUDGET = 1150;
const HALL_PRICE = 700;
const DEPOSIT = 150;
const DRESS_PRICE = 200;

const userIds = [];
const weddingIds = [];
const listingIds = [];
let passed = 0;

async function req(path, { token, method = 'GET', body, status = 200, headers = {} } = {}) {
  const response = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
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
  const ok = Math.abs(Number(value) - expected) < 0.02;
  if (!ok) throw new Error(`${label}: expected ${expected}, got ${value}`);
}

async function register(emailSuffix) {
  const data = await req('/auth/register', {
    method: 'POST',
    status: 201,
    body: {
      firstName: 'Budget',
      lastName: 'PayTest',
      email: `budget-pay-${emailSuffix}-${stamp}@test.local`,
      password,
      role: 'customer',
    },
  });
  userIds.push(data.user._id);
  return data;
}

async function createWedding(token, name, budget) {
  const data = await req('/weddings', {
    token,
    method: 'POST',
    status: 201,
    body: {
      weddingName: name,
      partner1Name: 'Partner',
      partner2Name: 'Partner',
      weddingDate: '2032-06-14',
      city: 'Mogadishu',
      estimatedBudget: budget,
      expectedGuests: 100,
    },
  });
  weddingIds.push(data.wedding._id);
  return data.wedding;
}

async function holdHall(token, weddingId, hallId, date) {
  return req('/hall-bookings/hold', {
    token,
    method: 'POST',
    status: 201,
    body: { hall: hallId, date, slotType: 'full_day', weddingId },
  });
}

async function getBudget(token, weddingId) {
  return (await req(`/budget?weddingId=${weddingId}`, { token })).budget;
}

async function getPayments(token, weddingId) {
  return req(`/payments?weddingId=${weddingId}`, { token });
}

async function pay(token, weddingId, { orderId, bookingId, paymentType }) {
  return req('/payments', {
    token,
    method: 'POST',
    status: 201,
    body: { orderId, bookingId, paymentType, paymentMethod: 'test', weddingId },
  });
}

async function createSelection(token, weddingId, listingId) {
  return req('/selections', {
    token,
    method: 'POST',
    status: 201,
    body: { listing: listingId, weddingId },
  });
}

async function cleanupHallDate(hallId, date) {
  await HallSlotLock.deleteMany({ hall: hallId, date });
  const bookings = await HallBooking.find({ hall: hallId, bookingDate: date });
  const bookingIds = bookings.map((b) => b._id);
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
  if (!venue || !hallA) throw new Error('Run npm run seed:part2 first (Bera Bandir Hotel / Hall A)');

  const vendorProfile = await VendorProfile.findOne({ businessName: /Noor|Atelier/i });
  const vendorUser = vendorProfile ? await User.findById(vendorProfile.user) : null;
  if (!vendorProfile || !vendorUser) throw new Error('Seed vendor profile required for dress listing test');

  const dateA = `2032-10-${String((stamp % 20) + 1).padStart(2, '0')}`;
  const dateB = `2032-11-${String((stamp % 20) + 1).padStart(2, '0')}`;
  await cleanupHallDate(hallA._id, dateA);
  await cleanupHallDate(hallA._id, dateB);

  // TEST A — FULL PAYMENT
  const customerA = await register('full');
  const weddingA = await createWedding(customerA.token, 'Budget Pay Full', BUDGET);
  const holdA = await holdHall(customerA.token, weddingA._id, hallA._id, dateA);
  const bookingA = holdA.booking;
  const orderA = await Order.findOne({ booking: bookingA._id });
  const payablesBeforeA = await getPayments(customerA.token, weddingA._id);
  const payableA = payablesBeforeA.payables.find((p) => String(p.bookingId) === String(bookingA._id));
  pass('TEST A: payable offers full payment', payableA?.allowedPaymentTypes?.includes('full'));
  near(payableA?.suggestedAmounts?.full ?? payableA?.suggestedAmount, HALL_PRICE, 'TEST A full suggestion');

  const rejectAmount = await req('/payments', {
    token: customerA.token,
    method: 'POST',
    body: {
      orderId: orderA._id,
      bookingId: bookingA._id,
      paymentType: 'full',
      paymentMethod: 'test',
      amount: 50,
      weddingId: weddingA._id,
    },
    status: 400,
  });
  pass('TEST A: client amount rejected', rejectAmount.message?.includes('calculated'));

  const paymentA = await pay(customerA.token, weddingA._id, {
    orderId: orderA._id,
    bookingId: bookingA._id,
    paymentType: 'full',
  });
  near(paymentA.payment.amount, HALL_PRICE, 'TEST A payment amount');
  const orderAfterA = await Order.findById(orderA._id);
  const bookingAfterA = await HallBooking.findById(bookingA._id);
  near(orderAfterA.amountPaid, HALL_PRICE, 'TEST A amount paid');
  near(orderAfterA.balance, 0, 'TEST A amount due');
  pass('TEST A: payment status paid', orderAfterA.paymentStatus === 'paid');
  pass('TEST A: booking confirmed', bookingAfterA.status === 'confirmed');
  const budgetA = await getBudget(customerA.token, weddingA._id);
  near(budgetA.totalPlannedCost, HALL_PRICE, 'TEST A planned cost');
  near(budgetA.remainingBudget, BUDGET - HALL_PRICE, 'TEST A remaining budget');
  near(budgetA.totalPaid, HALL_PRICE, 'TEST A total paid');

  // TEST B — DEPOSIT
  const customerB = await register('deposit');
  const weddingB = await createWedding(customerB.token, 'Budget Pay Deposit', BUDGET);
  const holdB = await holdHall(customerB.token, weddingB._id, hallA._id, dateB);
  const bookingB = holdB.booking;
  const orderB = await Order.findOne({ booking: bookingB._id });
  const payableB = (await getPayments(customerB.token, weddingB._id)).payables.find((p) => String(p.bookingId) === String(bookingB._id));
  pass('TEST B: deposit option available', payableB?.allowedPaymentTypes?.includes('deposit'));
  near(payableB?.suggestedAmounts?.deposit ?? payableB?.suggestedAmount, DEPOSIT, 'TEST B deposit suggestion');

  const paymentB = await pay(customerB.token, weddingB._id, {
    orderId: orderB._id,
    bookingId: bookingB._id,
    paymentType: 'deposit',
  });
  near(paymentB.payment.amount, DEPOSIT, 'TEST B payment amount');
  const orderAfterB = await Order.findById(orderB._id);
  near(orderAfterB.amountPaid, DEPOSIT, 'TEST B amount paid');
  near(orderAfterB.balance, HALL_PRICE - DEPOSIT, 'TEST B amount due');
  pass('TEST B: partially paid', orderAfterB.paymentStatus === 'partially_paid');
  pass('TEST B: booking confirmed after deposit', (await HallBooking.findById(bookingB._id)).status === 'confirmed');
  const budgetB = await getBudget(customerB.token, weddingB._id);
  near(budgetB.totalPlannedCost, HALL_PRICE, 'TEST B planned cost');
  near(budgetB.remainingBudget, BUDGET - HALL_PRICE, 'TEST B remaining budget');

  const payableAfterDeposit = (await getPayments(customerB.token, weddingB._id)).payables.find((p) => String(p.bookingId) === String(bookingB._id));
  pass('TEST B: deposit removed after paid', !payableAfterDeposit?.allowedPaymentTypes?.includes('deposit'));
  pass('TEST B: remaining balance only', payableAfterDeposit?.allowedPaymentTypes?.join() === 'remaining');

  const rejectSecondDeposit = await req('/payments', {
    token: customerB.token,
    method: 'POST',
    body: {
      orderId: orderB._id,
      bookingId: bookingB._id,
      paymentType: 'deposit',
      paymentMethod: 'test',
      weddingId: weddingB._id,
    },
    status: 409,
  });
  pass('TEST B: second deposit rejected', /deposit|not allowed/i.test(rejectSecondDeposit.message || ''));

  // TEST C — PAY REMAINING
  const remaining = HALL_PRICE - DEPOSIT;
  near(payableAfterDeposit?.suggestedAmount, remaining, 'TEST C suggested remaining');
  const paymentC = await pay(customerB.token, weddingB._id, {
    orderId: orderB._id,
    bookingId: bookingB._id,
    paymentType: 'remaining',
  });
  near(paymentC.payment.amount, remaining, 'TEST C payment amount');
  const orderAfterC = await Order.findById(orderB._id);
  near(orderAfterC.amountPaid, HALL_PRICE, 'TEST C total paid');
  near(orderAfterC.balance, 0, 'TEST C amount due');
  pass('TEST C: paid in full', orderAfterC.paymentStatus === 'paid');
  const budgetC = await getBudget(customerB.token, weddingB._id);
  near(budgetC.remainingBudget, BUDGET - HALL_PRICE, 'TEST C remaining budget');

  // TEST D — ADD $200 BRIDE DRESS
  const dressListing = await WeddingListing.create({
    vendor: vendorUser._id,
    vendorProfile: vendorProfile._id,
    name: `Budget Test Dress ${stamp}`,
    category: 'bride_dress',
    listingType: 'product',
    description: 'Test dress for budget payment flow',
    price: DRESS_PRICE,
    city: 'Mogadishu',
    available: true,
    active: true,
    availabilityType: 'inventory',
    quantity: 5,
  });
  listingIds.push(dressListing._id);

  await createSelection(customerB.token, weddingB._id, dressListing._id);
  const budgetD = await getBudget(customerB.token, weddingB._id);
  near(budgetD.totalPlannedCost, HALL_PRICE + DRESS_PRICE, 'TEST D planned cost');
  near(budgetD.remainingBudget, BUDGET - HALL_PRICE - DRESS_PRICE, 'TEST D remaining budget');

  // TEST E — SERVICE BUDGET WORDING (not hall)
  const videoListing = await WeddingListing.create({
    vendor: vendorUser._id,
    vendorProfile: vendorProfile._id,
    name: `Budget Test Video ${stamp}`,
    category: 'videography',
    listingType: 'service',
    description: 'Test videography for budget wording',
    price: 400,
    city: 'Mogadishu',
    available: true,
    active: true,
    availabilityType: 'none',
  });
  listingIds.push(videoListing._id);
  const videoFail = await req('/selections', {
    token: customerB.token,
    method: 'POST',
    status: 422,
    body: { listing: videoListing._id, weddingId: weddingB._id },
  });
  pass('TEST E: videography uses service budget message', videoFail.message === 'This videography package exceeds your remaining wedding budget.');
  pass('TEST E: message does not say hall', !/hall/i.test(videoFail.message || ''));
  pass('TEST E: itemKind is service', videoFail.details?.itemKind === 'service');
  near(videoFail.details?.servicePrice, 400, 'TEST E service price');
  near(videoFail.details?.remainingBudget, BUDGET - HALL_PRICE - DRESS_PRICE, 'TEST E remaining budget before service');
  near(videoFail.details?.overBy, 400 - (BUDGET - HALL_PRICE - DRESS_PRICE), 'TEST E over by');

  const flowersListing = await WeddingListing.create({
    vendor: vendorUser._id,
    vendorProfile: vendorProfile._id,
    name: `Budget Test Flowers ${stamp}`,
    category: 'flowers',
    listingType: 'service',
    price: 400,
    city: 'Mogadishu',
    available: true,
    active: true,
    availabilityType: 'none',
  });
  listingIds.push(flowersListing._id);
  const flowerFail = await req('/selections', {
    token: customerB.token,
    method: 'POST',
    status: 422,
    body: { listing: flowersListing._id, weddingId: weddingB._id },
  });
  pass('TEST E: generic service budget message', flowerFail.message === 'This service exceeds your remaining wedding budget.');

  console.log(`\nBudget payment verification complete: ${passed} checks passed`);
} catch (error) {
  console.error(`Budget payment verification failed: ${error.message}`);
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
      await Wedding.deleteMany({ _id: { $in: weddingIds } });
    }
    if (userIds.length) {
      await User.deleteMany({ _id: { $in: userIds } });
    }
    await mongoose.disconnect();
  }
}
