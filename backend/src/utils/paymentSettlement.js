import BudgetItem from '../models/BudgetItem.js';
import Booking from '../models/Booking.js';
import HallBooking from '../models/HallBooking.js';
import HallSlotLock from '../models/HallSlotLock.js';
import Order from '../models/Order.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { paymentStatusFromAmounts, reportCategoryFromService } from './budgetTotals.js';
import { notify } from './notify.js';
import { syncWeddingTimelineSafe } from './workspaceOverview.js';
import { applyPartialPaymentToInvoice } from './bookingInvoiceService.js';
import BookingInvoice from '../models/BookingInvoice.js';
import { addMoney, roundMoney, subtractMoney, toCents } from './money.js';

const SUCCESS = new Set(['successful', 'paid']);

export function isSuccessfulStatus(status) {
  return SUCCESS.has(status);
}

export async function applyPaymentResult(payment, providerResult) {
  if (payment.paymentType === 'refund' || providerResult.status === 'refunded') {
    payment.status = 'refunded';
    payment.paidAt = payment.paidAt || new Date();
    payment.providerReference = providerResult.providerReference || payment.providerReference;
    await payment.save();
    await settleSuccessfulPayment(payment);
    return payment;
  }
  if (providerResult.status === 'successful' || providerResult.status === 'paid') {
    payment.status = 'successful';
    payment.paidAt = new Date();
    payment.providerReference = providerResult.providerReference || payment.providerReference;
    payment.receiptNumber = payment.receiptNumber || `RCPT-${payment.transactionReference}`;
    await payment.save();
    await settleSuccessfulPayment(payment);
    return payment;
  }
  if (providerResult.status === 'failed') {
    payment.status = 'failed';
    await payment.save();
    return payment;
  }
  payment.status = providerResult.status || 'pending';
  payment.providerReference = providerResult.providerReference || payment.providerReference;
  await payment.save();
  return payment;
}

export async function settleSuccessfulPayment(payment) {
  if (payment.paymentType === 'refund') {
    await applyRefund(payment);
    return;
  }

  if (payment.order) {
    const order = await Order.findById(payment.order);
    if (order) {
      const nextPaid = addMoney(order.amountPaid || 0, payment.amount);
      if (toCents(nextPaid) > toCents(order.amount || 0)) {
        const err = new Error('Payment would exceed the outstanding balance');
        err.statusCode = 409;
        throw err;
      }
      order.amountPaid = nextPaid;
      order.balance = subtractMoney(order.amount, nextPaid);
      order.paymentStatus = paymentStatusFromAmounts(order.amount, order.amountPaid);
      if (order.status === 'pending' && order.paymentStatus === 'paid') {
        order.status = 'confirmed';
      }
      await order.save();
    }
  }

  if (payment.booking) {
    const booking = await HallBooking.findById(payment.booking);
    if (booking && ['held', 'pending', 'confirmed'].includes(booking.status)) {
      const nextPaid = addMoney(booking.amountPaid || 0, payment.amount);
      if (toCents(nextPaid) > toCents(booking.basePrice || 0)) {
        const err = new Error('Payment would exceed the hall booking balance');
        err.statusCode = 409;
        throw err;
      }
      booking.amountPaid = nextPaid;
      booking.balance = subtractMoney(booking.basePrice, nextPaid);
      booking.paymentStatus = paymentStatusFromAmounts(booking.basePrice, booking.amountPaid);
      if (booking.status === 'held' && toCents(booking.amountPaid) >= toCents(booking.depositRequired || 0)) {
        booking.status = 'confirmed';
        booking.holdExpiresAt = null;
        await HallSlotLock.updateMany({ booking: booking._id }, { $unset: { expiresAt: 1 } });
        await Order.updateMany({ booking: booking._id, status: 'pending' }, { $set: { status: 'confirmed' } });
        await notify(booking.customer, {
          title: 'Hall booking confirmed',
          message: 'Your hall reservation is confirmed after the deposit payment.',
          type: 'booking_confirmed',
          link: '/workspace',
          wedding: booking.wedding,
        });
        await notify(booking.vendor, {
          title: 'New hall booking',
          message: 'A hall booking was confirmed after payment.',
          type: 'new_booking',
          link: '/vendor/orders',
          wedding: booking.wedding,
        });
      }
      await booking.save();
    }
  }

  if (payment.vendorBooking || payment.bookingInvoice) {
    const serviceBooking = payment.vendorBooking
      ? await Booking.findById(payment.vendorBooking)
      : null;
    const invoice = payment.bookingInvoice
      ? await BookingInvoice.findById(payment.bookingInvoice)
      : serviceBooking
        ? await BookingInvoice.findOne({ booking: serviceBooking._id })
        : null;

    if (invoice && invoice.status !== 'cancelled') {
      const booking = serviceBooking || await Booking.findById(invoice.booking);
      if (booking && ['accepted', 'confirmed'].includes(booking.status)) {
        await applyPartialPaymentToInvoice(invoice, payment.amount, payment._id);

        if (invoice.paymentStatus === 'paid') {
          booking.status = 'confirmed';
          booking.isPaid = true;
          await booking.save();

          await notify(booking.customer, {
            title: 'Booking confirmed',
            message: `Payment received. Your ${booking.serviceName} booking is now confirmed.`,
            type: 'booking_confirmed',
            link: '/bookings',
            wedding: booking.wedding,
          });
          await notify(booking.vendor, {
            title: 'Booking payment received',
            message: `The couple paid invoice ${invoice.invoiceNumber} in full for ${booking.serviceName}.`,
            type: 'booking_payment_received',
            link: '/vendor/bookings',
            wedding: booking.wedding,
          });
        } else {
          booking.isPaid = false;
          await booking.save();

          await notify(booking.customer, {
            title: payment.isTestPayment ? 'Test payment applied' : 'Partial payment received',
            message: `$${roundMoney(payment.amount).toFixed(2)} applied to ${booking.serviceName}. Remaining balance: $${roundMoney(invoice.balance).toFixed(2)}.`,
            type: 'payment_successful',
            link: '/payments',
            wedding: booking.wedding,
          });
          await notify(booking.vendor, {
            title: payment.isTestPayment ? 'Partial test payment received' : 'Partial payment received',
            message: `$${roundMoney(payment.amount).toFixed(2)} received for ${booking.serviceName}. Remaining: $${roundMoney(invoice.balance).toFixed(2)}.`,
            type: 'payment_received',
            link: '/vendor/bookings',
            wedding: booking.wedding,
          });
        }
      }
    }
  }

  if (payment.selection) {
    const selection = await WeddingSelection.findById(payment.selection);
    if (selection) {
      const total = Number(selection.totalAmount || selection.totalPrice || 0);
      const paid = Number(selection.amountPaid || 0) + payment.amount;
      selection.amountPaid = paid;
      selection.balance = Math.max(0, total - paid);
      selection.paymentStatus = paymentStatusFromAmounts(total, paid);
      if (selection.paymentStatus === 'paid') selection.status = 'paid';
      else if (selection.status === 'pending_payment' || selection.status === 'pending') selection.status = 'confirmed';
      await selection.save();
      await BudgetItem.findOneAndUpdate(
        { selection: selection._id },
        {
          $setOnInsert: {
            wedding: selection.wedding,
            selection: selection._id,
            category: mapBudgetItemCategory(selection.category),
            title: `Service: ${selection.itemName}`,
            plannedAmount: total,
          },
          $set: {
            actualAmount: Math.min(paid, total),
            notes: `Recorded from payment ${payment.transactionReference}`,
          },
        },
        { upsert: true, new: true, runValidators: true },
      );
    }
  }

  if (!payment.vendorBooking && !payment.bookingInvoice) {
    await notify(payment.customer, {
      title: payment.isTestPayment ? 'Test payment applied' : 'Payment successful',
      message: `Payment of $${roundMoney(payment.amount).toFixed(2)} was received. Receipt ${payment.receiptNumber}.`,
      type: 'payment_successful',
      link: '/payments',
      wedding: payment.wedding,
    });
    await notify(payment.vendor, {
      title: 'Payment received',
      message: `A customer payment of $${roundMoney(payment.amount).toFixed(2)} was captured.`,
      type: 'payment_received',
      link: '/vendor/payments',
      wedding: payment.wedding,
    });
  }

  await syncWeddingTimelineSafe(payment.wedding);
}

async function applyRefund(payment) {
  if (payment.order) {
    const order = await Order.findById(payment.order);
    if (order) {
      order.amountPaid = Math.max(0, subtractMoney(order.amountPaid || 0, payment.amount));
      order.balance = subtractMoney(order.amount, order.amountPaid);
      order.paymentStatus = order.amountPaid <= 0 ? 'refunded' : paymentStatusFromAmounts(order.amount, order.amountPaid);
      await order.save();
    }
  }
  if (payment.booking) {
    const booking = await HallBooking.findById(payment.booking);
    if (booking) {
      booking.amountPaid = Math.max(0, subtractMoney(booking.amountPaid || 0, payment.amount));
      booking.balance = subtractMoney(booking.basePrice, booking.amountPaid);
      booking.paymentStatus = booking.amountPaid <= 0 ? 'refunded' : paymentStatusFromAmounts(booking.basePrice, booking.amountPaid);
      await booking.save();
    }
  }
  await syncWeddingTimelineSafe(payment.wedding);
}

function mapBudgetItemCategory(category) {
  const allowed = [
    'Venue', 'Catering', 'Photography', 'Videography', 'Decoration',
    'Wedding Dress', 'Groom Attire', 'Beauty & Makeup', 'Entertainment',
    'Transportation', 'Invitations', 'Flowers', 'Cake', 'Accommodation',
    'Gifts', 'Other',
  ];
  const mapped = {
    hall: 'Venue',
    bride_dress: 'Wedding Dress',
    groom_attire: 'Groom Attire',
    makeup: 'Beauty & Makeup',
    bridal_salon: 'Beauty & Makeup',
    flowers: 'Flowers',
    bouquet: 'Flowers',
    decoration: 'Decoration',
    catering: 'Catering',
    photography: 'Photography',
    videography: 'Videography',
    cake: 'Cake',
    transportation: 'Transportation',
  }[category] || reportCategoryFromService(category);
  return allowed.includes(mapped) ? mapped : 'Other';
}
