import crypto from 'crypto';
import BookingInvoice from '../models/BookingInvoice.js';
import { paymentStatusFromAmounts } from './budgetTotals.js';
import { addMoney, roundMoney, subtractMoney, toCents } from './money.js';

export function generateInvoiceNumber() {
  const stamp = Date.now().toString(36).toUpperCase();
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INV-${stamp}-${suffix}`;
}

function syncInvoiceBalances(invoice) {
  const total = roundMoney(invoice.amount);
  const paid = roundMoney(invoice.amountPaid || 0);
  invoice.amount = total;
  invoice.amountPaid = paid;
  invoice.balance = subtractMoney(total, paid);
  invoice.paymentStatus = paymentStatusFromAmounts(total, paid);
  return invoice;
}

/**
 * Create a payable invoice when vendor accepts a booking.
 * Invoices are NOT created for pending/rejected bookings.
 */
export async function issueInvoiceForBooking(booking) {
  const total = roundMoney(booking.amount);
  const existing = await BookingInvoice.findOne({ booking: booking._id });
  if (existing) {
    if (existing.status === 'cancelled') {
      existing.status = 'issued';
      existing.issuedAt = new Date();
      existing.paidAt = null;
      existing.payment = null;
      existing.amount = total;
      existing.serviceName = booking.serviceName;
      existing.amountPaid = 0;
      syncInvoiceBalances(existing);
      await existing.save();
      return existing;
    }
    if (existing.amount !== total) {
      existing.amount = total;
      syncInvoiceBalances(existing);
      await existing.save();
    }
    return existing;
  }

  const invoice = await BookingInvoice.create({
    booking: booking._id,
    wedding: booking.wedding,
    customer: booking.customer,
    vendor: booking.vendor,
    vendorProfile: booking.vendorProfile,
    serviceName: booking.serviceName,
    amount: total,
    amountPaid: 0,
    balance: total,
    paymentStatus: 'unpaid',
    invoiceNumber: generateInvoiceNumber(),
    status: 'issued',
  });
  return invoice;
}

export async function cancelInvoiceForBooking(bookingId) {
  const invoice = await BookingInvoice.findOne({ booking: bookingId, status: 'issued' });
  if (!invoice) return null;
  invoice.status = 'cancelled';
  await invoice.save();
  return invoice;
}

export async function markInvoicePaid(invoice, paymentId) {
  invoice.amountPaid = roundMoney(invoice.amount);
  invoice.balance = 0;
  invoice.paymentStatus = 'paid';
  invoice.status = 'paid';
  invoice.paidAt = new Date();
  invoice.payment = paymentId;
  await invoice.save();
  return invoice;
}

/**
 * Apply a successful payment against an invoice (supports partial payments).
 */
export async function applyPartialPaymentToInvoice(invoice, paymentAmount, paymentId) {
  if (!invoice || invoice.status === 'cancelled') {
    const err = new Error('Invoice is not payable');
    err.statusCode = 409;
    throw err;
  }

  const payCents = toCents(paymentAmount);
  if (payCents <= 0) {
    const err = new Error('Payment amount must be greater than zero');
    err.statusCode = 400;
    throw err;
  }

  const totalCents = toCents(invoice.amount);
  const paidCents = toCents(invoice.amountPaid || 0);
  const remainingCents = totalCents - paidCents;

  if (remainingCents <= 0) {
    const err = new Error('This invoice is already paid in full');
    err.statusCode = 409;
    throw err;
  }

  if (payCents > remainingCents) {
    const err = new Error('Payment would exceed the outstanding balance');
    err.statusCode = 409;
    throw err;
  }

  invoice.amountPaid = roundMoney((paidCents + payCents) / 100);
  syncInvoiceBalances(invoice);

  if (invoice.paymentStatus === 'paid') {
    invoice.status = 'paid';
    invoice.paidAt = new Date();
    invoice.payment = paymentId;
  }

  await invoice.save();
  return invoice;
}

export function invoiceAmountDue(invoice) {
  return subtractMoney(invoice.amount, invoice.amountPaid || 0);
}
