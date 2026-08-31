/**
 * Verify full invoice payment logic (simulated WAAFI success without API call).
 * Run: node scripts/test-full-invoice-payment.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking.js';
import BookingInvoice from '../src/models/BookingInvoice.js';
import Payment from '../src/models/Payment.js';
import { applyPaymentResult } from '../src/utils/paymentSettlement.js';
import { invoiceAmountDue } from '../src/utils/bookingInvoiceService.js';
import { roundMoney } from '../src/utils/money.js';

dotenv.config({ override: true });

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const booking = await Booking.findOne({ serviceName: /elite hall/i, status: 'accepted' });
  let invoice = booking ? await BookingInvoice.findOne({ booking: booking._id, status: 'issued' }) : null;
  let bookingRef = booking;

  if (!booking || !invoice) {
    console.log('Need accepted Elite Hall with issued invoice. Run reset-elite-hall-payments.mjs first.');
    process.exit(1);
  }

  const remaining = invoiceAmountDue(invoice);
  console.log(`Invoice total: $${invoice.amount}, paid: $${invoice.amountPaid}, due: $${remaining}`);

  const ref = `WED-PAY-${Date.now()}`;
  const payment = await Payment.create({
    customer: bookingRef.customer,
    paidBy: bookingRef.customer,
    wedding: bookingRef.wedding,
    vendorBooking: bookingRef._id,
    bookingInvoice: invoice._id,
    vendor: bookingRef.vendor,
    amount: remaining,
    currency: 'USD',
    paymentType: 'full',
    paymentMethod: 'waafi',
    provider: 'waafipay',
    isTestPayment: false,
    customerPhone: '0617161841',
    transactionReference: ref,
    receiptNumber: `RCPT-${ref}`,
    status: 'created',
  });

  await applyPaymentResult(payment, { status: 'successful', providerReference: ref });

  invoice = await BookingInvoice.findById(invoice._id);
  bookingRef = await Booking.findById(bookingRef._id);
  const successCount = await Payment.countDocuments({
    bookingInvoice: invoice._id,
    status: { $in: ['successful', 'paid'] },
  });

  console.log('After full payment:');
  console.log(`  Invoice paid: $${invoice.amountPaid}, remaining: $${invoice.balance}, status: ${invoice.paymentStatus}`);
  console.log(`  Booking: ${bookingRef.status}, isPaid: ${bookingRef.isPaid}`);
  console.log(`  Successful payment records: ${successCount}`);

  const dup = await Payment.findOne({
    bookingInvoice: invoice._id,
    status: { $in: ['successful', 'paid'] },
  });
  if (invoice.paymentStatus === 'paid' && bookingRef.status === 'confirmed' && successCount === 1) {
    console.log('PASS: Full payment flow');
  } else {
    console.log('FAIL: Unexpected state');
    process.exit(1);
  }

  // Reset for user manual WAAFI test
  await Payment.deleteOne({ _id: payment._id });
  invoice.amountPaid = 0;
  invoice.balance = invoice.amount;
  invoice.paymentStatus = 'unpaid';
  invoice.status = 'issued';
  invoice.paidAt = null;
  invoice.payment = null;
  await invoice.save();
  bookingRef.status = 'accepted';
  bookingRef.isPaid = false;
  await bookingRef.save();
  console.log('Reset invoice for manual WAAFI test.');

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
