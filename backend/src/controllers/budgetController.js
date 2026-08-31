import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import BudgetItem from '../models/BudgetItem.js';
import Wedding from '../models/Wedding.js';
import { computeWeddingBudget } from '../utils/budgetTotals.js';
import { loadAccessibleWedding } from '../utils/weddingAccess.js';
import { canAccessWeddingAsCustomer } from '../utils/weddingMembership.js';
import { isCoupleRole } from '../utils/roles.js';

const editableFields = ['category', 'title', 'plannedAmount', 'actualAmount', 'notes'];

function requireBudgetEditor(req, res) {
  if (!isCoupleRole(req.user.role) && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('Only customers can manage a wedding budget');
  }
}

async function getItemWithOwnership(itemId, req, res) {
  if (!mongoose.isValidObjectId(itemId)) {
    res.status(400);
    throw new Error('Invalid budget item ID');
  }
  const item = await BudgetItem.findById(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Budget item not found');
  }
  const ownsWedding = await canAccessWeddingAsCustomer(req.user._id, item.wedding);
  if (!ownsWedding && req.user.role !== 'admin') {
    res.status(403);
    throw new Error('You are not authorized to manage this budget item');
  }
  return item;
}

export const getBudget = asyncHandler(async (req, res) => {
  if (req.user.role === 'vendor') {
    res.status(403);
    throw new Error('Vendors cannot access customer budgets');
  }
  if ((req.user.role === 'planner' || req.user.role === 'admin') && !(req.query.weddingId || req.headers['x-wedding-id'])) {
    res.status(403);
    throw new Error('Select an assigned wedding');
  }
  const wedding = await loadAccessibleWedding(req, res, { required: false });
  if (!wedding) return res.json({ success: true, budget: null });
  const computed = await computeWeddingBudget(wedding);
  return res.json({
    success: true,
    budget: {
      estimatedBudget: computed.estimatedBudget,
      totalBudget: computed.totalBudget,
      totalPlanned: computed.totalPlannedCost,
      totalPlannedCost: computed.totalPlannedCost,
      totalSpent: computed.totalSpent,
      totalPaid: computed.totalPaid,
      outstandingPayments: computed.outstandingPayments,
      totalAmountDue: computed.totalAmountDue,
      remainingBudget: computed.remainingBudget,
      remainingPlanned: computed.remainingPlanned,
      overBudget: computed.overBudget,
      budgetUsagePercentage: computed.budgetUsagePercentage,
      categories: computed.categories,
      items: computed.items,
      lockedTotals: true,
    },
  });
});

export const createBudgetItem = asyncHandler(async (req, res) => {
  requireBudgetEditor(req, res);
  const wedding = await loadAccessibleWedding(req, res, { write: true });
  if (!wedding) {
    res.status(400);
    throw new Error('Create your wedding profile before adding budget items');
  }
  const itemData = { wedding: wedding._id };
  for (const field of editableFields) {
    if (req.body[field] !== undefined) itemData[field] = req.body[field];
  }
  const item = await BudgetItem.create(itemData);
  res.status(201).json({ success: true, item });
});

export const updateBudgetItem = asyncHandler(async (req, res) => {
  requireBudgetEditor(req, res);
  const item = await getItemWithOwnership(req.params.id, req, res);
  if (item.selection) {
    if (req.body.actualAmount !== undefined) {
      res.status(409);
      throw new Error('Paid totals are calculated from payments and cannot be edited');
    }
  }
  for (const field of editableFields) {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  }
  await item.save();
  res.json({ success: true, item });
});

export const deleteBudgetItem = asyncHandler(async (req, res) => {
  requireBudgetEditor(req, res);
  const item = await getItemWithOwnership(req.params.id, req, res);
  if (item.selection) {
    res.status(409);
    throw new Error('Payment-linked budget items cannot be deleted');
  }
  await item.deleteOne();
  res.json({ success: true, message: 'Budget item deleted successfully.' });
});
