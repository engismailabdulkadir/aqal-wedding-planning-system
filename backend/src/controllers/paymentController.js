import crypto from 'crypto';
import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Booking from '../models/Booking.js';
import BookingInvoice from '../models/BookingInvoice.js';
import HallBooking from '../models/HallBooking.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { env } from '../config/env.js';
import { getPaymentProvider } from '../payments/provider.js';
import { generateReference, initiateWaafiPurchase, isWaafiConfigured } from '../services/payments/WaafiPayService.js';
import { invoiceAmountDue } from '../utils/bookingInvoiceService.js';
import { applyPaymentResult, isSuccessfulStatus } from '../utils/paymentSettlement.js';
import { hasSuccessfulDeposit, resolvePaymentOptions } from '../utils/paymentOptions.js';
import { paymentStatusFromAmounts } from '../utils/budgetTotals.js';
import { roundMoney, subtractMoney } from '../utils/money.js';
import { normalizePhoneForWaafi } from '../utils/phone.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { isCoupleRole } from '../utils/roles.js';
import { canAccessWeddingAsCustomer } from '../utils/weddingMembership.js';

const populated = [
  { path: 'selection', select: 'itemName category totalAmount status paymentStatus' },
  { path: 'order', select: 'itemName category amount amountPaid balance paymentStatus status' },
  { path: 'booking', select: 'hall slotType basePrice depositRequired amountPaid balance status paymentStatus' },
  { path: 'vendorBooking', select: 'serviceName amount status' },
  { path: 'bookingInvoice', select: 'invoiceNumber amount amountPaid balance paymentStatus status serviceName' },
  { path: 'wedding', select: 'weddingName weddingDate' },
  { path: 'vendor', select: 'firstName lastName' },
];

async function resolvePayable(req, res) {
  const { orderId, bookingId, selectionId } = req.body;
  const wedding = await resolveOwnedWedding(req, res);
  let order = null;
  let booking = null;
  let selection = null;

  if (mongoose.isValidObjectId(orderId)) {
    order = await Order.findOne({ _id: orderId, wedding: wedding._id });
  } else if (mongoose.isValidObjectId(bookingId)) {
    booking = await HallBooking.findOne({ _id: bookingId, wedding: wedding._id });
    if (booking) order = await Order.findOne({ booking: booking._id, wedding: wedding._id });
  } else if (mongoose.isValidObjectId(selectionId)) {
    selection = await WeddingSelection.findOne({ _id: selectionId, wedding: wedding._id });
    if (selection) order = await Order.findOne({ selection: selection._id, wedding: wedding._id });
  }

  if (!order && !booking && !selection) {
    res.status(404);
    throw new Error('Payable item not found');
  }
  if (order && ['cancelled', 'rejected'].includes(order.status)) {
    res.status(409);
    throw new Error('This order cannot be paid');
  }
  if (booking && ['cancelled', 'expired', 'completed'].includes(booking.status)) {
    res.status(409);
    throw new Error('This hall booking cannot be paid');
  }

  const weddingId = order?.wedding || booking?.wedding || selection?.wedding;
  if (!weddingId || !await canAccessWeddingAsCustomer(req.user._id, weddingId)) {
    res.status(403);
    throw new Error('Not authorized for this payment');
  }

  const total = roundMoney(order?.amount ?? booking?.basePrice ?? selection?.totalAmount ?? 0);
  const paid = roundMoney(order?.amountPaid ?? booking?.amountPaid ?? selection?.amountPaid ?? 0);
  const due = roundMoney(Math.max(0, total - paid));
  const depositRequired = roundMoney(
    order?.depositRequired ?? booking?.depositRequired ?? selection?.depositRequired ?? 0,
  );
  const depositAlreadyPaid = paid >= depositRequired && depositRequired > 0
    || await hasSuccessfulDeposit({ orderId: order?._id, bookingId: booking?._id });
  return { order, booking, selection, total, paid, due, depositRequired, depositAlreadyPaid };
}

function resolveChargeAmount(paymentType, payable, res) {
  const { due, paid, depositRequired, depositAlreadyPaid } = payable;
  if (due <= 0) {
    res.status(409);
    throw new Error('This item is already paid in full');
  }
  if (paymentType === 'deposit') {
    if (depositAlreadyPaid || paid >= depositRequired) {
      res.status(409);
      throw new Error('Deposit has already been paid for this item');
    }
    if (depositRequired <= 0) {
      res.status(409);
      throw new Error('This item does not require a deposit. Pay the full amount.');
    }
    const amount = roundMoney(Math.min(depositRequired, due));
    if (amount <= 0) {
      res.status(409);
      throw new Error('No deposit remains for this item');
    }
    return amount;
  }
  if (paymentType === 'full' || paymentType === 'remaining') {
    if (paymentType === 'full' && paid > 0) {
      res.status(409);
      throw new Error('Use remaining balance payment for the outstanding amount');
    }
    return due;
  }
  res.status(400);
  throw new Error('Invalid payment type');
}

async function buildInvoicePayablePayload(invoice, booking) {
  const totalPrice = roundMoney(invoice.amount);
  const amountPaid = roundMoney(invoice.amountPaid || 0);
  const amountDue = invoiceAmountDue(invoice);
  const options = resolvePaymentOptions({
    paid: amountPaid,
    due: amountDue,
    depositRequired: 0,
    depositAlreadyPaid: true,
  });
  return {
    type: 'vendor_booking',
    orderId: null,
    bookingId: null,
    selectionId: null,
    vendorBookingId: booking._id,
    bookingInvoiceId: invoice._id,
    name: invoice.serviceName || booking.serviceName,
    category: 'venue',
    vendor: booking.vendor,
    totalPrice,
    amountPaid,
    amountDue,
    requiredDeposit: 0,
    paymentStatus: paymentStatusFromAmounts(totalPrice, amountPaid),
    status: booking.status,
    invoiceNumber: invoice.invoiceNumber,
    allowedPaymentTypes: options.allowedPaymentTypes,
    defaultPaymentType: 'remaining',
    suggestedAmount: options.suggestedAmount ?? amountDue,
    suggestedAmounts: options.suggestedAmounts,
    canPay: amountDue > 0 && booking.status === 'accepted',
    paidInFull: amountDue <= 0,
  };
}

async function buildPayablePayload(order, booking) {
  const totalPrice = roundMoney(order?.amount ?? booking?.basePrice ?? 0);
  const amountPaid = roundMoney(order?.amountPaid ?? booking?.amountPaid ?? 0);
  const amountDue = roundMoney(Math.max(0, totalPrice - amountPaid));
  const requiredDeposit = roundMoney(order?.depositRequired ?? booking?.depositRequired ?? 0);
  const depositAlreadyPaid = await hasSuccessfulDeposit({ orderId: order?._id, bookingId: booking?._id });
  const options = resolvePaymentOptions({
    paid: amountPaid,
    due: amountDue,
    depositRequired: requiredDeposit,
    depositAlreadyPaid,
  });
  return {
    type: booking ? 'booking' : 'order',
    orderId: order?._id || null,
    bookingId: booking?._id || null,
    selectionId: order?.selection || null,
    name: order?.itemName || `${booking?.hall?.hallName || 'Hall'} · ${booking?.slotType}`,
    category: order?.category || 'hall',
    vendor: order?.vendor || booking?.vendor,
    totalPrice,
    amountPaid,
    amountDue,
    requiredDeposit,
    paymentStatus: paymentStatusFromAmounts(totalPrice, amountPaid),
    status: order?.status || booking?.status,
    allowedPaymentTypes: options.allowedPaymentTypes,
    defaultPaymentType: options.defaultPaymentType,
    suggestedAmount: options.suggestedAmount ?? options.suggestedAmounts?.[options.defaultPaymentType],
    suggestedAmounts: options.suggestedAmounts,
    canPay: options.canPay,
    paidInFull: options.paidInFull,
  };
}

export const listPayments = asyncHandler(async (req, res) => {
  const wedding = await resolveOwnedWedding(req, res, { required: false });
  if (!wedding) return res.json({ success: true, payments: [], payables: [], summary: { totalPending: 0, totalPaid: 0, totalDue: 0 } });

  const [payments, orders, bookings, serviceBookings, invoices] = await Promise.all([
    Payment.find({ wedding: wedding._id }).populate(populated).sort({ createdAt: -1 }),
    Order.find({ wedding: wedding._id, status: { $nin: ['cancelled', 'rejected'] } }).populate('vendor', 'firstName lastName'),
    HallBooking.find({ wedding: wedding._id, status: { $in: ['held', 'pending', 'confirmed'] } })
      .populate('hall', 'hallName')
      .populate('vendor', 'firstName lastName'),
    Booking.find({ wedding: wedding._id, status: 'accepted' })
      .populate('vendor', 'firstName lastName'),
    BookingInvoice.find({ wedding: wedding._id, status: 'issued' }),
  ]);

  const payables = [];
  for (const order of orders) {
    if (order.booking) {
      const booking = bookings.find((b) => String(b._id) === String(order.booking));
      if (booking) payables.push(await buildPayablePayload(order, booking));
    } else {
      payables.push(await buildPayablePayload(order, null));
    }
  }

  for (const booking of bookings) {
    if (!payables.some((item) => String(item.bookingId) === String(booking._id))) {
      const order = await Order.findOne({ booking: booking._id, wedding: wedding._id });
      payables.push(await buildPayablePayload(order, booking));
    }
  }

  for (const invoice of invoices) {
    const paid = roundMoney(invoice.amountPaid || 0);
    const computedStatus = paymentStatusFromAmounts(invoice.amount, paid);
    if (invoice.paymentStatus !== computedStatus) {
      invoice.paymentStatus = computedStatus;
      invoice.balance = subtractMoney(invoice.amount, paid);
      await invoice.save();
    }
    const booking = serviceBookings.find((b) => String(b._id) === String(invoice.booking));
    if (booking) payables.push(await buildInvoicePayablePayload(invoice, booking));
  }

  const activePayables = payables.filter((item) => item.canPay);

  const totalPaidFromInvoices = roundMoney(invoices.reduce((sum, inv) => sum + Number(inv.amountPaid || 0), 0));
  const totalPaidFromOrders = roundMoney(orders.reduce((sum, order) => sum + Number(order.amountPaid || 0), 0));
  const totalPaid = roundMoney(totalPaidFromInvoices + totalPaidFromOrders);
  const totalPending = roundMoney(
    payments.filter((p) => ['pending', 'processing', 'created'].includes(p.status)).reduce((n, p) => n + p.amount, 0),
  );
  const totalDue = roundMoney(activePayables.reduce((n, item) => n + item.amountDue, 0));

  res.json({
    success: true,
    payments,
    payables: activePayables,
    paidItems: payables.filter((item) => item.paidInFull),
    waafiConfigured: isWaafiConfigured(),
    summary: {
      totalPaid,
      totalDue,
      outstanding: totalDue,
      totalPending,
    },
  });
});

export const createPayment = asyncHandler(async (req, res) => {
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Only customers can submit payments');
  }
  const paymentMethod = req.body.paymentMethod;
  const paymentType = req.body.paymentType || (req.body.selection ? 'full' : 'deposit');
  if (!['card', 'mobile_money', 'bank_transfer', 'test'].includes(paymentMethod)) {
    res.status(400);
    throw new Error('Select a valid payment method');
  }
  if (!['deposit', 'full', 'remaining'].includes(paymentType)) {
    res.status(400);
    throw new Error('Select a valid payment type');
  }

  const payable = await resolvePayable(req, res);
  const options = resolvePaymentOptions(payable);
  if (!options.allowedPaymentTypes.includes(paymentType)) {
    res.status(409);
    throw new Error(`Payment type "${paymentType}" is not allowed for this item`);
  }
  if (req.body.amount !== undefined) {
    res.status(400);
    throw new Error('Payment amount is calculated by the server');
  }
  const amount = resolveChargeAmount(paymentType, payable, res);
  const reference = `PAY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  const payment = await Payment.create({
    customer: req.user._id,
    paidBy: req.user._id,
    wedding: payable.order?.wedding || payable.booking?.wedding || payable.selection?.wedding,
    order: payable.order?._id || null,
    booking: payable.booking?._id || payable.order?.booking || null,
    selection: payable.selection?._id || payable.order?.selection || null,
    vendor: payable.order?.vendor || payable.booking?.vendor || payable.selection?.vendor,
    service: payable.order?.service || payable.selection?.listing || null,
    amount,
    currency: 'USD',
    paymentType,
    paymentMethod,
    transactionReference: reference,
    receiptNumber: `RCPT-${reference}`,
    status: 'pending',
  });

  const result = await getPaymentProvider().charge({ amount, paymentMethod, reference });
  await applyPaymentResult(payment, result);
  await payment.populate(populated);

  res.status(201).json({
    success: true,
    message: payment.status === 'successful' ? 'Payment completed successfully' : 'Payment recorded',
    payment,
    testConfirmationAvailable: process.env.NODE_ENV !== 'production' && paymentMethod === 'test' && payment.status !== 'successful',
  });
});

export const getPayment = asyncHandler(async (req, res) => {
  const filter = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : null;
  if (!filter) {
    res.status(404);
    throw new Error('Payment not found');
  }
  if (isCoupleRole(req.user.role)) filter.customer = req.user._id;
  else if (req.user.role === 'vendor') filter.vendor = req.user._id;
  const payment = await Payment.findOne(filter).populate(populated);
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }
  if (req.user.role === 'planner') {
    const assigned = await Wedding.exists({ _id: payment.wedding, planner: req.user._id });
    if (!assigned) {
      res.status(403);
      throw new Error('You cannot view this payment');
    }
  }
  res.json({ success: true, payment });
});

export const confirmTestPayment = asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(403);
    throw new Error('Test payment confirmation is disabled in production');
  }
  const payment = mongoose.isValidObjectId(req.params.id)
    ? await Payment.findOne({ _id: req.params.id, customer: req.user._id, paymentMethod: 'test', status: { $in: ['pending', 'processing'] } })
    : null;
  if (!payment) {
    res.status(404);
    throw new Error('Processing test payment not found');
  }
  await applyPaymentResult(payment, { status: 'successful', providerReference: `TEST-${payment.transactionReference}` });
  await payment.populate(populated);
  res.json({ success: true, payment });
});

export const vendorPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ vendor: req.user._id })
    .populate('order', 'itemName category amount')
    .populate('selection', 'itemName category')
    .populate('booking', 'slotType basePrice')
    .populate('wedding', 'weddingName')
    .populate('customer', 'firstName lastName')
    .sort({ createdAt: -1 });
  const received = payments.filter((p) => isSuccessfulStatus(p.status) && p.paymentType !== 'refund').reduce((n, p) => n + p.amount, 0);
  res.json({ success: true, payments, summary: { received, count: payments.length } });
});

export const adminPayments = asyncHandler(async (_req, res) => {
  const payments = await Payment.find()
    .populate('order', 'itemName category amount')
    .populate('selection', 'itemName category')
    .populate('wedding', 'weddingName')
    .populate('customer', 'firstName lastName email phone username')
    .populate('vendor', 'firstName lastName email')
    .sort({ createdAt: -1 });
  res.json({ success: true, payments });
});

export const initiateWaafiPayment = asyncHandler(async (req, res) => {
  if (!isCoupleRole(req.user.role)) {
    res.status(403);
    throw new Error('Only groom and bride accounts can initiate payments');
  }

  if (!isWaafiConfigured()) {
    res.status(503);
    throw new Error('WaafiPay API credentials are not configured.');
  }

  const wedding = await resolveOwnedWedding(req, res);
  const paymentPhoneInput = String(req.body.paymentPhone || '').trim();
  if (!paymentPhoneInput) {
    res.status(400);
    throw new Error('Payment phone number is required.');
  }
  const phone = normalizePhoneForWaafi(paymentPhoneInput);
  const { orderId, vendorBookingId, bookingInvoiceId, invoiceId } = req.body;
  const resolvedInvoiceId = bookingInvoiceId || invoiceId;

  let order = null;
  let vendorBooking = null;
  let invoice = null;

  if (mongoose.isValidObjectId(vendorBookingId)) {
    vendorBooking = await Booking.findOne({
      _id: vendorBookingId,
      wedding: wedding._id,
      status: 'accepted',
    });
    if (!vendorBooking) {
      res.status(404);
      throw new Error('Accepted booking not found');
    }
    invoice = await BookingInvoice.findOne({ booking: vendorBooking._id, status: 'issued' });
  } else if (mongoose.isValidObjectId(resolvedInvoiceId)) {
    invoice = await BookingInvoice.findOne({
      _id: resolvedInvoiceId,
      wedding: wedding._id,
      status: 'issued',
    });
    if (invoice) vendorBooking = await Booking.findOne({ _id: invoice.booking, status: 'accepted' });
  } else if (mongoose.isValidObjectId(orderId)) {
    order = await Order.findOne({ _id: orderId, wedding: wedding._id, customer: req.user._id });
  }

  if (!order && !invoice) {
    res.status(404);
    throw new Error('Payable invoice or order not found');
  }

  if (invoice && vendorBooking && String(invoice.wedding) !== String(wedding._id)) {
    res.status(403);
    throw new Error('Invoice does not belong to the current wedding');
  }

  const remaining = invoice
    ? invoiceAmountDue(invoice)
    : subtractMoney(order.amount, order.amountPaid || 0);

  if (remaining <= 0 || invoice?.paymentStatus === 'paid' || invoice?.status === 'paid') {
    res.status(409);
    throw new Error('This invoice has already been paid.');
  }

  if (invoice) {
    const paidAlready = await Payment.findOne({
      bookingInvoice: invoice._id,
      status: { $in: ['successful', 'paid'] },
    });
    if (paidAlready) {
      res.status(409);
      throw new Error('This invoice has already been paid.');
    }
  }

  const pendingFilter = {
    customer: req.user._id,
    provider: 'waafipay',
    status: { $in: ['created', 'pending', 'processing'] },
  };
  if (order) pendingFilter.order = order._id;
  if (vendorBooking) pendingFilter.vendorBooking = vendorBooking._id;
  if (invoice) pendingFilter.bookingInvoice = invoice._id;

  const existingPending = await Payment.findOne(pendingFilter);
  if (existingPending) {
    res.status(409);
    throw new Error('A payment is already processing for this invoice. Please wait.');
  }

  const chargeAmount = roundMoney(remaining);
  if (chargeAmount <= 0) {
    res.status(409);
    throw new Error('No remaining balance to pay');
  }

  const invoiceLabel = invoice?.invoiceNumber || `INV-${String(invoice?._id || 'ORDER')}`;
  const transactionReference = generateReference(`${invoiceLabel}-PAY`);

  let lockPayment = await Payment.create({
    customer: req.user._id,
    paidBy: req.user._id,
    wedding: wedding._id,
    order: order?._id || null,
    booking: order?.booking || null,
    vendorBooking: vendorBooking?._id || null,
    bookingInvoice: invoice?._id || null,
    selection: order?.selection || null,
    vendor: order?.vendor || vendorBooking?.vendor || invoice?.vendor,
    service: order?.service || vendorBooking?.listing || null,
    amount: chargeAmount,
    currency: env.waafi.currency || 'USD',
    paymentType: 'full',
    paymentMethod: 'waafi',
    provider: 'waafipay',
    isTestPayment: false,
    customerPhone: paymentPhoneInput,
    transactionReference,
    receiptNumber: `RCPT-${transactionReference}`,
    status: 'processing',
  });

  let waafiResult;
  try {
    waafiResult = await initiateWaafiPurchase({
      normalizedPhone: phone,
      description: invoice
        ? `Invoice ${invoice.invoiceNumber} — ${invoice.serviceName}`
        : 'Wedding Planning Payment',
      internalReference: transactionReference,
      localInvoiceId: invoiceLabel,
      amount: chargeAmount,
    });

    if (waafiResult.status !== 'successful') {
      await Payment.deleteOne({ _id: lockPayment._id });
      lockPayment = null;
      res.status(400);
      throw new Error(waafiResult.userMessage || 'Payment was not completed. Please verify the payment number and try again.');
    }

    lockPayment.requestId = waafiResult.requestId;
    lockPayment.referenceId = waafiResult.referenceId;
    lockPayment.invoiceId = waafiResult.invoiceId;
    lockPayment.providerResponseCode = waafiResult.responseCode;
    lockPayment.providerResponseMessage = waafiResult.responseMessage;
    lockPayment.providerReference = waafiResult.providerReference || '';
    await lockPayment.save();

    await applyPaymentResult(lockPayment, {
      status: 'successful',
      providerReference: waafiResult.providerReference,
    });
  } catch (error) {
    if (lockPayment?._id) {
      await Payment.deleteOne({ _id: lockPayment._id, status: 'processing' });
      lockPayment = null;
    }
    throw error;
  }

  const payment = lockPayment;
  await payment.populate(populated);

  if (invoice && isSuccessfulStatus(payment.status)) {
    invoice = await BookingInvoice.findById(invoice._id);
  }

  res.status(201).json({
    success: true,
    message: `Payment of $${chargeAmount.toFixed(2)} completed successfully. Transaction reference: ${payment.providerReference || payment.transactionReference}.`,
    payment,
    invoice: invoice || undefined,
    amountToPay: chargeAmount,
    waafi: {
      responseCode: waafiResult.responseCode,
      state: waafiResult.providerState,
      transactionId: waafiResult.providerReference,
    },
  });
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  const filter = mongoose.isValidObjectId(req.params.id) ? { _id: req.params.id } : null;
  if (!filter) {
    res.status(404);
    throw new Error('Payment not found');
  }
  if (isCoupleRole(req.user.role)) filter.customer = req.user._id;
  else if (req.user.role === 'vendor') filter.vendor = req.user._id;

  const payment = await Payment.findOne(filter).select(
    'status amount currency paymentType paymentMethod provider isTestPayment transactionReference receiptNumber providerReference customerPhone createdAt paidAt',
  );
  if (!payment) {
    res.status(404);
    throw new Error('Payment not found');
  }

  res.json({
    success: true,
    status: payment.status,
    payment,
    isComplete: ['successful', 'paid', 'failed', 'cancelled', 'expired', 'refunded'].includes(payment.status),
  });
});

export const refundPayment = asyncHandler(async (req, res) => {
  const source = mongoose.isValidObjectId(req.params.id) ? await Payment.findById(req.params.id) : null;
  if (!source || !isSuccessfulStatus(source.status)) {
    res.status(404);
    throw new Error('Successful payment not found');
  }
  const amount = roundMoney(req.body.amount || source.amount);
  if (amount <= 0 || amount > source.amount) {
    res.status(400);
    throw new Error('Refund amount is invalid');
  }
  const reference = `REF-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
  const refund = await Payment.create({
    customer: source.customer,
    wedding: source.wedding,
    order: source.order,
    booking: source.booking,
    selection: source.selection,
    vendor: source.vendor,
    service: source.service,
    amount,
    currency: 'USD',
    paymentType: 'refund',
    paymentMethod: source.paymentMethod,
    transactionReference: reference,
    receiptNumber: `RCPT-${reference}`,
    status: 'refunded',
    paidAt: new Date(),
  });
  await applyPaymentResult(refund, { status: 'refunded' });
  source.status = 'refunded';
  await source.save();
  res.json({ success: true, payment: refund });
});
