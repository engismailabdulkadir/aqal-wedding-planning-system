import BudgetItem from '../models/BudgetItem.js';
import HallBooking from '../models/HallBooking.js';
import Order from '../models/Order.js';
import Payment from '../models/Payment.js';

export const REPORT_CATEGORIES = [
  'Hall', 'Bride', 'Groom', 'Salon', 'Makeup', 'Flowers', 'Decoration',
  'Catering', 'Photography', 'Videography', 'Cake', 'Transport', 'Other',
];

export function reportCategoryFromService(category = '') {
  const map = {
    hall: 'Hall',
    bride_dress: 'Bride',
    bride_shoes: 'Bride',
    accessories: 'Bride',
    bridal_salon: 'Salon',
    makeup: 'Makeup',
    hair: 'Salon',
    bouquet: 'Flowers',
    flowers: 'Flowers',
    groom_attire: 'Groom',
    groom_shoes: 'Groom',
    groom_salon: 'Groom',
    decoration: 'Decoration',
    catering: 'Catering',
    photography: 'Photography',
    videography: 'Videography',
    cake: 'Cake',
    transportation: 'Transport',
    invitation: 'Other',
    entertainment: 'Other',
    accommodation: 'Other',
    equipment: 'Other',
    other: 'Other',
  };
  if (REPORT_CATEGORIES.includes(category)) return category;
  return map[category] || 'Other';
}

export function paymentStatusFromAmounts(total, paid) {
  if (paid <= 0) return 'unpaid';
  if (paid >= total) return 'paid';
  return 'partially_paid';
}

const SUCCESS_STATUSES = ['successful', 'paid'];
const COMMITTED_ORDER_STATUSES = ['pending', 'confirmed', 'in_progress', 'completed'];
/** Held = accepted quote (planned cost). Confirmed/completed remain after payment. */
const COMMITTED_HALL_STATUSES = ['held', 'confirmed', 'completed'];

export async function computeWeddingBudget(wedding) {
  const [items, orders, payments, hallBookings] = await Promise.all([
    BudgetItem.find({ wedding: wedding._id }).sort({ createdAt: -1 }),
    Order.find({ wedding: wedding._id, status: { $nin: ['cancelled', 'rejected'] } }),
    Payment.find({
      wedding: wedding._id,
      status: { $in: SUCCESS_STATUSES },
      isTestPayment: { $ne: true },
    }),
    HallBooking.find({ wedding: wedding._id, status: { $in: COMMITTED_HALL_STATUSES } }).select('_id status'),
  ]);

  const hallStatusMap = new Map(hallBookings.map((b) => [String(b._id), b.status]));

  let orderPlanned = 0;
  for (const order of orders) {
    if (order.booking) {
      const hallStatus = hallStatusMap.get(String(order.booking));
      if (hallStatus && COMMITTED_HALL_STATUSES.includes(hallStatus)) {
        orderPlanned += Number(order.amount || 0);
      }
      continue;
    }
    if (COMMITTED_ORDER_STATUSES.includes(order.status)) {
      orderPlanned += Number(order.amount || 0);
    }
  }

  const paymentPaid = payments.reduce((n, payment) => {
    if (payment.paymentType === 'refund') return n - Number(payment.amount || 0);
    return n + Number(payment.amount || 0);
  }, 0);

  const unlinkedPlanned = items
    .filter((item) => !item.selection)
    .reduce((n, item) => n + Number(item.plannedAmount || 0), 0);

  const totalPlannedCost = roundMoney(orderPlanned + unlinkedPlanned);
  const totalPaid = roundMoney(paymentPaid);
  const outstandingPayments = roundMoney(Math.max(0, totalPlannedCost - totalPaid));
  const estimatedBudget = Number(wedding.estimatedBudget || 0);
  const remainingBudget = roundMoney(estimatedBudget - totalPlannedCost);
  const remainingPlanned = remainingBudget;

  const categories = Object.fromEntries(REPORT_CATEGORIES.map((name) => [name, { category: name, planned: 0, paid: 0 }]));
  for (const order of orders) {
    let counts = false;
    if (order.booking) {
      const hallStatus = hallStatusMap.get(String(order.booking));
      counts = hallStatus && COMMITTED_HALL_STATUSES.includes(hallStatus);
    } else {
      counts = COMMITTED_ORDER_STATUSES.includes(order.status);
    }
    if (!counts) continue;
    const key = reportCategoryFromService(order.category);
    categories[key].planned += Number(order.amount || 0);
    categories[key].paid += Number(order.amountPaid || 0);
  }
  for (const item of items.filter((entry) => !entry.selection)) {
    const key = reportCategoryFromService(item.category);
    categories[key].planned += Number(item.plannedAmount || 0);
  }

  return {
    estimatedBudget,
    totalBudget: estimatedBudget,
    totalPlannedCost,
    totalPaid,
    totalSpent: totalPaid,
    outstandingPayments,
    totalAmountDue: outstandingPayments,
    remainingBudget,
    remainingPlanned,
    overBudget: remainingBudget < 0,
    budgetUsagePercentage: estimatedBudget > 0
      ? Number(((totalPlannedCost / estimatedBudget) * 100).toFixed(2))
      : 0,
    categories: Object.values(categories).map((row) => ({
      ...row,
      outstanding: Math.max(0, row.planned - row.paid),
    })),
    items,
    orders,
    lockedTotals: true,
  };
}

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}
