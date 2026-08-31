/**
 * Verify $0.01 WAAFI test payments reduce real invoice balance (partial payments).
 * Run: node scripts/test-waafi-partial-payment.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking.js';
import BookingInvoice from '../src/models/BookingInvoice.js';
import Payment from '../src/models/Payment.js';
import User from '../src/models/User.js';
import { applyPaymentResult } from '../src/utils/paymentSettlement.js';
import { invoiceAmountDue, applyPartialPaymentToInvoice } from '../src/utils/bookingInvoiceService.js';
import { roundMoney } from '../src/utils/money.js';

dotenv.config({ override: true });

const results = [];
function pass(name, detail = '') {
  results.push({ ok: true, name, detail });
  console.log(`PASS: ${name}${detail ? ` — ${detail}` : ''}`);
}
function fail(name, detail = '') {
  results.push({ ok: false, name, detail });
  console.log(`FAIL: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function simulateTestPayment(invoice, booking, customerId) {
  const remaining = invoiceAmountDue(invoice);
  const amount = roundMoney(Math.min(0.01, remaining));
  const ref = `TEST-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const payment = await Payment.create({
    customer: customerId,
    paidBy: customerId,
    wedding: booking.wedding,
    vendorBooking: booking._id,
    bookingInvoice: invoice._id,
    vendor: booking.vendor,
    amount,
    currency: 'USD',
    paymentType: 'test',
    paymentMethod: 'waafi',
    provider: 'waafipay',
    isTestPayment: true,
    transactionReference: ref,
    receiptNumber: `RCPT-${ref}`,
    status: 'created',
  });
  await applyPaymentResult(payment, { status: 'successful', providerReference: ref });
  return Payment.findById(payment._id);
}

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  let booking = await Booking.findOne({ status: 'accepted', amount: { $gte: 100 } })
    .sort({ updatedAt: -1 });
  let invoice = booking ? await BookingInvoice.findOne({ booking: booking._id, status: 'issued' }) : null;

  if (!booking || !invoice) {
  // Create test booking at $1000 for verification
    const vendor = await User.findOne({ email: 'vender@gmail.com' });
    if (!vendor) throw new Error('No vendor found for test');
    booking = await Booking.findOne({ vendor: vendor._id, status: 'accepted' });
    invoice = booking ? await BookingInvoice.findOne({ booking: booking._id, status: 'issued' }) : null;
  }

  if (!booking || !invoice) {
    fail('Find accepted booking with invoice', 'Create an accepted hall booking first');
    process.exit(1);
  }

  // Reset invoice for clean test if partially paid
  invoice.amount = roundMoney(booking.amount);
  invoice.amountPaid = 0;
  invoice.balance = invoice.amount;
  invoice.paymentStatus = 'unpaid';
  invoice.status = 'issued';
  invoice.paidAt = null;
  invoice.payment = null;
  await invoice.save();
  booking.status = 'accepted';
  booking.isPaid = false;
  await booking.save();

  pass('Invoice original total', `$${invoice.amount}`);

  const beforePaid = roundMoney(invoice.amountPaid || 0);
  const beforeRemaining = invoiceAmountDue(invoice);
  if (beforePaid === 0 && beforeRemaining === roundMoney(invoice.amount)) {
    pass('Initial paid/remaining', `$0 / $${beforeRemaining}`);
  } else {
    fail('Initial paid/remaining', `${beforePaid} / ${beforeRemaining}`);
  }

  const payment1 = await simulateTestPayment(invoice, booking, booking.customer);
  invoice = await BookingInvoice.findById(invoice._id);
  booking = await Booking.findById(booking._id);

  if (payment1?.status === 'successful' && payment1.amount === 0.01) {
    pass('First test payment amount', '$0.01');
  } else {
    fail('First test payment', JSON.stringify(payment1));
  }

  if (invoice.amountPaid === 0.01 && invoice.balance === roundMoney(invoice.amount - 0.01)) {
    pass('After first $0.01', `paid=$${invoice.amountPaid} remaining=$${invoice.balance}`);
  } else {
    fail('After first $0.01', `paid=${invoice.amountPaid} remaining=${invoice.balance} total=${invoice.amount}`);
  }

  if (invoice.paymentStatus === 'partially_paid') pass('Payment status', 'partially_paid');
  else fail('Payment status', invoice.paymentStatus);

  if (booking.status === 'accepted' && !booking.isPaid) pass('Booking still accepted');
  else fail('Booking status', `${booking.status} isPaid=${booking.isPaid}`);

  const payment2 = await simulateTestPayment(invoice, booking, booking.customer);
  invoice = await BookingInvoice.findById(invoice._id);
  if (invoice.amountPaid === 0.02 && invoice.balance === roundMoney(invoice.amount - 0.02)) {
    pass('After second $0.01', `paid=$${invoice.amountPaid} remaining=$${invoice.balance}`);
  } else {
    fail('After second $0.01', `paid=${invoice.amountPaid} remaining=${invoice.balance}`);
  }

  const failedRef = `FAIL-${Date.now()}`;
  const failedPayment = await Payment.create({
    customer: booking.customer,
    paidBy: booking.customer,
    wedding: booking.wedding,
    vendorBooking: booking._id,
    bookingInvoice: invoice._id,
    vendor: booking.vendor,
    amount: 0.01,
    paymentType: 'test',
    paymentMethod: 'waafi',
    provider: 'waafipay',
    isTestPayment: true,
    transactionReference: failedRef,
    receiptNumber: `RCPT-${failedRef}`,
    status: 'created',
  });
  await applyPaymentResult(failedPayment, { status: 'failed' });
  invoice = await BookingInvoice.findById(invoice._id);
  if (invoice.amountPaid === 0.02) pass('Failed payment did not change balance');
  else fail('Failed payment balance', String(invoice.amountPaid));

  const paymentCount = await Payment.countDocuments({
    vendorBooking: booking._id,
    status: 'successful',
    amount: 0.01,
  });
  if (paymentCount === 2) pass('Two successful payment records', String(paymentCount));
  else fail('Payment history count', String(paymentCount));

  await mongoose.disconnect();
  const failed = results.filter((r) => !r.ok);
  console.log(`\nPassed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
