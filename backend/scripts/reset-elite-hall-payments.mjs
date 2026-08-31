/**
 * Remove obsolete $0.01 test payments and reset Elite Hall invoice for full-payment testing.
 * Run: node scripts/reset-elite-hall-payments.mjs
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Booking from '../src/models/Booking.js';
import BookingInvoice from '../src/models/BookingInvoice.js';
import Payment from '../src/models/Payment.js';
import { paymentStatusFromAmounts } from '../src/utils/budgetTotals.js';
import { roundMoney, subtractMoney } from '../src/utils/money.js';

dotenv.config({ override: true });

async function main() {
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI);

  const booking = await Booking.findOne({
    serviceName: /elite hall/i,
    status: { $in: ['accepted', 'confirmed'] },
  }).sort({ updatedAt: -1 });

  if (!booking) {
    console.log('No Elite Hall booking found.');
    await mongoose.disconnect();
    return;
  }

  const invoice = await BookingInvoice.findOne({ booking: booking._id });
  if (!invoice) {
    console.log('No invoice for Elite Hall booking.');
    await mongoose.disconnect();
    return;
  }

  const paymentFilter = {
    $or: [
      { bookingInvoice: invoice._id },
      { vendorBooking: booking._id },
    ],
  };

  const toDelete = await Payment.find({
    ...paymentFilter,
    $or: [
      { isTestPayment: true },
      { paymentType: 'test' },
      { transactionReference: { $regex: /TEST|FAIL/i } },
      { receiptNumber: { $regex: /TEST|FAIL/i } },
    ],
  });

  console.log(`Deleting ${toDelete.length} obsolete test/failed payment record(s)...`);
  if (toDelete.length) {
    await Payment.deleteMany({ _id: { $in: toDelete.map((p) => p._id) } });
  }

  // Remove any remaining WAAFI payments on this invoice so dev retest starts clean
  const extraRemoved = await Payment.deleteMany({
    ...paymentFilter,
    provider: 'waafipay',
  });
  if (extraRemoved.deletedCount) {
    console.log(`Removed ${extraRemoved.deletedCount} additional WAAFI payment record(s).`);
  }

  // Reset invoice to unpaid full balance
  const total = roundMoney(invoice.amount || booking.amount);
  invoice.amount = total;
  invoice.amountPaid = 0;
  invoice.balance = total;
  invoice.paymentStatus = 'unpaid';
  invoice.status = 'issued';
  invoice.paidAt = null;
  invoice.payment = null;
  await invoice.save();

  booking.status = 'accepted';
  booking.isPaid = false;
  await booking.save();

  console.log('Reset complete:');
  console.log(`  Booking: ${booking.serviceName} — ${booking.status}`);
  console.log(`  Invoice total: $${invoice.amount}`);
  console.log(`  Amount paid: $${invoice.amountPaid}`);
  console.log(`  Remaining: $${invoice.balance}`);
  console.log(`  Payment status: ${invoice.paymentStatus}`);

  const remainingPayments = await Payment.countDocuments(paymentFilter);
  console.log(`  Remaining payment records for this invoice: ${remainingPayments}`);

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
