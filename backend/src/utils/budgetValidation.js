import Wedding from '../models/Wedding.js';
import { computeWeddingBudget } from './budgetTotals.js';

function roundMoney(value) {
  return Math.round(Number(value) * 100) / 100;
}

export function budgetExceededMessage(category) {
  const key = String(category || '');
  if (key === 'hall') return 'This hall exceeds your current wedding budget.';
  if (key === 'videography') return 'This videography package exceeds your remaining wedding budget.';
  if (key === 'photography') return 'This photography package exceeds your remaining wedding budget.';
  if (key === 'catering') return 'This catering package exceeds your remaining wedding budget.';
  return 'This service exceeds your remaining wedding budget.';
}

export async function evaluateBudgetCommitment(wedding, additionalCost, { allowOverBudget = false, category = 'hall' } = {}) {
  const computed = await computeWeddingBudget(wedding);
  const add = roundMoney(additionalCost || 0);
  const totalBudget = roundMoney(computed.totalBudget);
  const currentPlannedCost = roundMoney(computed.totalPlannedCost);
  const remainingBefore = roundMoney(totalBudget - currentPlannedCost);
  const projectedPlannedCost = roundMoney(currentPlannedCost + add);
  const overBy = roundMoney(add - remainingBefore);
  const overBudget = add > remainingBefore;

  const itemKind = category === 'hall' ? 'hall' : 'service';

  if (overBudget && !allowOverBudget) {
    const err = new Error(budgetExceededMessage(category));
    err.statusCode = 422;
    err.code = 'BUDGET_EXCEEDED';
    err.details = {
      overBudget: true,
      itemKind,
      category,
      totalBudget,
      hallCost: add,
      itemCost: add,
      servicePrice: add,
      currentPlannedCost,
      projectedPlannedCost,
      overBy,
      difference: overBy,
      remainingBudget: remainingBefore,
    };
    throw err;
  }

  return {
    overBudget,
    itemKind,
    category,
    totalBudget,
    currentPlannedCost,
    projectedPlannedCost,
    overBy: Math.max(0, overBy),
    remainingBudget: roundMoney(totalBudget - projectedPlannedCost),
    remainingBefore,
    warning: overBudget
      ? itemKind === 'hall'
        ? `Your wedding budget is $${totalBudget.toFixed(2)}. This hall will exceed your budget by $${overBy.toFixed(2)}.`
        : `This service exceeds your remaining wedding budget by $${overBy.toFixed(2)}.`
      : projectedPlannedCost > totalBudget * 0.9
        ? `This booking will leave only $${(totalBudget - projectedPlannedCost).toFixed(2)} in your wedding budget.`
        : null,
  };
}

export async function loadWeddingForBudgetCheck(weddingId) {
  return Wedding.findById(weddingId);
}
