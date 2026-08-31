import Payment from '../models/Payment.js';
import { isSuccessfulStatus } from './paymentSettlement.js';

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export async function hasSuccessfulDeposit({ orderId, bookingId }) {
  const filter = {
    paymentType: 'deposit',
    status: { $in: ['successful', 'paid'] },
    isTestPayment: { $ne: true },
  };
  if (orderId) filter.order = orderId;
  if (bookingId) filter.booking = bookingId;
  return Boolean(await Payment.exists(filter));
}

export function resolvePaymentOptions({ paid, due, depositRequired, depositAlreadyPaid }) {
  const amountPaid = roundMoney(paid);
  const amountDue = roundMoney(due);
  const requiredDeposit = roundMoney(depositRequired);

  if (amountDue <= 0) {
    return {
      allowedPaymentTypes: [],
      suggestedAmount: 0,
      canPay: false,
      paidInFull: true,
    };
  }

  if (amountPaid > 0 || depositAlreadyPaid) {
    return {
      allowedPaymentTypes: ['remaining'],
      suggestedAmount: amountDue,
      defaultPaymentType: 'remaining',
      canPay: true,
      paidInFull: false,
    };
  }

  if (requiredDeposit > 0 && requiredDeposit < amountDue) {
    return {
      allowedPaymentTypes: ['full', 'deposit'],
      suggestedAmounts: { full: amountDue, deposit: Math.min(requiredDeposit, amountDue) },
      defaultPaymentType: 'deposit',
      canPay: true,
      paidInFull: false,
    };
  }

  return {
    allowedPaymentTypes: ['full'],
    suggestedAmount: amountDue,
    defaultPaymentType: 'full',
    canPay: true,
    paidInFull: false,
  };
}
