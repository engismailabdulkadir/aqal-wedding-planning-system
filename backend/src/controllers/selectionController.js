import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Order from '../models/Order.js';
import WeddingListing from '../models/WeddingListing.js';
import WeddingSelection from '../models/WeddingSelection.js';
import { resolveOwnedWedding } from '../utils/ownedWedding.js';
import { notify } from '../utils/notify.js';
import { evaluateBudgetCommitment } from '../utils/budgetValidation.js';
import { syncWeddingTimelineSafe } from '../utils/workspaceOverview.js';

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

const populate = [
  { path: 'listing', select: 'name listingType description city available active category availabilityType metadata images' },
  { path: 'vendor', select: 'firstName lastName' },
  { path: 'listing', populate: { path: 'vendorProfile', select: 'businessName' } },
];

function summary(items) {
  return {
    selectedItems: items.filter((x) => !['cancelled', 'rejected'].includes(x.status)).length,
    pendingPayment: items.filter((x) => x.status === 'pending_payment' || x.paymentStatus === 'unpaid').length,
    paidItems: items.filter((x) => x.status === 'paid' || x.status === 'fulfilled' || x.paymentStatus === 'paid').length,
    totalCost: items.filter((x) => !['cancelled', 'rejected'].includes(x.status)).reduce((n, x) => n + x.totalAmount, 0),
  };
}

function grouped(items) {
  const groups = {};
  for (const item of items) {
    const key = item.category || 'other';
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

export const listSelections = asyncHandler(async (req, res) => {
  const wedding = await resolveOwnedWedding(req, res, { required: false });
  const selections = wedding
    ? await WeddingSelection.find({ wedding: wedding._id }).populate(populate).sort({ createdAt: -1 })
    : [];
  res.json({ success: true, wedding, selections, grouped: grouped(selections), summary: summary(selections) });
});

export const createSelection = asyncHandler(async (req, res) => {
  const wedding = await resolveOwnedWedding(req, res);
  const listing = mongoose.isValidObjectId(req.body.listing)
    ? await WeddingListing.findOne({ _id: req.body.listing, active: true, available: true })
    : null;
  if (!listing) {
    res.status(404);
    throw new Error('Wedding service not found or unavailable');
  }
  let quantity = Number(req.body.quantity || 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 5000) {
    res.status(400);
    throw new Error('Quantity must be a whole number');
  }

  let unitPrice = listing.discountPrice ?? listing.price;
  if (listing.availabilityType === 'capacity' || listing.category === 'catering') {
    const guests = Number(req.body.guestCount || wedding.expectedGuests || quantity);
    const min = listing.metadata?.minimumGuests;
    const max = listing.metadata?.maximumGuests;
    if (min && guests < min) {
      res.status(400);
      throw new Error(`Minimum guests for this package is ${min}`);
    }
    if (max && guests > max) {
      res.status(400);
      throw new Error(`Maximum guests for this package is ${max}`);
    }
    const perPerson = listing.metadata?.pricePerPerson ?? unitPrice;
    quantity = guests;
    unitPrice = perPerson;
  }

  if (listing.category === 'hall') {
    const existing = await WeddingSelection.exists({ wedding: wedding._id, category: 'hall', status: { $nin: ['cancelled', 'rejected'] } });
    if (existing && !req.body.replace) {
      res.status(409);
      throw new Error('You already selected a wedding hall. Cancel it or choose Replace Current Hall.');
    }
    if (existing && req.body.replace) {
      await WeddingSelection.updateMany(
        { wedding: wedding._id, category: 'hall', status: { $nin: ['cancelled', 'paid', 'fulfilled', 'completed'] } },
        { status: 'cancelled' },
      );
    }
  }

  if (listing.availabilityType === 'inventory') {
    const reserved = await Order.aggregate([
      { $match: { service: listing._id, status: { $nin: ['cancelled', 'rejected'] } } },
      { $group: { _id: null, qty: { $sum: '$quantity' } } },
    ]);
    const used = reserved[0]?.qty || 0;
    if (used + quantity > Number(listing.quantity || 0)) {
      res.status(409);
      throw new Error('This item is no longer available in the requested quantity');
    }
  }

  const totalAmount = unitPrice * quantity;
  await evaluateBudgetCommitment(wedding, totalAmount, { allowOverBudget: req.body.confirmOverBudget === true, category: listing.category });
  const depositRequired = roundMoney(Number(listing.metadata?.deposit ?? listing.metadata?.depositRequired ?? 0));
  const selection = await WeddingSelection.create({
    wedding: wedding._id,
    customer: req.user._id,
    listing: listing._id,
    vendor: listing.vendor,
    category: listing.category,
    itemName: listing.name,
    price: unitPrice,
    basePrice: unitPrice,
    quantity,
    totalAmount,
    totalPrice: totalAmount,
    eventDate: req.body.eventDate || wedding.weddingDate,
    status: 'pending',
    paymentStatus: 'unpaid',
    amountPaid: 0,
    balance: totalAmount,
    notes: req.body.notes,
  });
  await Order.create({
    customer: req.user._id,
    wedding: wedding._id,
    vendor: listing.vendor,
    service: listing._id,
    selection: selection._id,
    category: listing.category,
    itemName: listing.name,
    quantity,
    amount: totalAmount,
    depositRequired,
    amountPaid: 0,
    balance: totalAmount,
    status: 'pending',
    paymentStatus: 'unpaid',
    eventDate: selection.eventDate,
  });
  await notify(listing.vendor, {
    title: 'New order',
    message: `${listing.name} was selected for a wedding.`,
    type: 'new_order',
    link: '/vendor/orders',
    wedding: wedding._id,
  });
  if (wedding.planner) {
    await notify(wedding.planner, {
      title: 'New vendor order',
      message: `${listing.name} was selected for ${wedding.weddingName}.`,
      type: 'new_order',
      link: `/planner/weddings/${wedding._id}`,
      wedding: wedding._id,
    });
  }
  await syncWeddingTimelineSafe(wedding._id);
  await selection.populate(populate);
  res.status(201).json({ success: true, selection });
});

export const getSelection = asyncHandler(async (req, res) => {
  const selection = mongoose.isValidObjectId(req.params.id)
    ? await WeddingSelection.findOne({ _id: req.params.id, customer: req.user._id }).populate(populate)
    : null;
  if (!selection) {
    res.status(404);
    throw new Error('Selection not found');
  }
  res.json({ success: true, selection });
});

export const updateSelection = asyncHandler(async (req, res) => {
  const selection = mongoose.isValidObjectId(req.params.id)
    ? await WeddingSelection.findOne({ _id: req.params.id, customer: req.user._id })
    : null;
  if (!selection) {
    res.status(404);
    throw new Error('Selection not found');
  }
  if (['fulfilled', 'completed'].includes(selection.status)) {
    res.status(409);
    throw new Error('Completed services cannot be removed. Historical transactions are preserved.');
  }
  const cancelling = req.body.status === 'cancelled';
  if (['paid', 'fulfilled', 'completed'].includes(selection.status) && !cancelling) {
    res.status(409);
    throw new Error('Paid selections cannot be changed. Cancel the booking to archive it without deleting payment history.');
  }
  if (cancelling) {
    selection.status = 'cancelled';
    await selection.save();
    await Order.updateMany(
      { selection: selection._id, status: { $in: ['pending', 'confirmed'] } },
      { $set: { status: 'cancelled' } },
    );
    await syncWeddingTimelineSafe(selection.wedding);
    await selection.populate(populate);
    return res.json({
      success: true,
      selection,
      paymentsPreserved: true,
      message: 'Selection cancelled. Payment history was not deleted.',
    });
  }
  if (req.body.quantity !== undefined) {
    const q = Number(req.body.quantity);
    if (!Number.isInteger(q) || q < 1 || q > 5000) {
      res.status(400);
      throw new Error('Invalid quantity');
    }
    selection.quantity = q;
    selection.totalAmount = selection.price * q;
    selection.totalPrice = selection.totalAmount;
  }
  if (req.body.notes !== undefined) selection.notes = req.body.notes;
  await selection.save();
  res.json({ success: true, selection });
});

export const vendorOrders = asyncHandler(async (req, res) => {
  const orders = await WeddingSelection.find({ vendor: req.user._id })
    .populate('customer', 'firstName lastName email phone')
    .populate('wedding', 'weddingName weddingDate city')
    .sort({ createdAt: -1 });
  res.json({ success: true, orders });
});
