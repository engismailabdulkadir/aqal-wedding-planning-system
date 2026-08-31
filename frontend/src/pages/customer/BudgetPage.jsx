import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiCreditCard, FiDollarSign, FiPieChart, FiPlus, FiTrendingUp } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import BudgetItemForm from '../../components/budget/BudgetItemForm.jsx';
import BudgetItemList from '../../components/budget/BudgetItemList.jsx';
import BudgetProgress from '../../components/budget/BudgetProgress.jsx';
import BudgetSummaryCard from '../../components/budget/BudgetSummaryCard.jsx';
import EmptyState from '../../components/dashboard/EmptyState.jsx';
import { createBudgetItem, deleteBudgetItem, getBudget, updateBudgetItem } from '../../services/budgetService.js';
import { Modal } from '../../components/common/index.js';
import { confirmDelete, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { formatBudget } from '../../utils/weddingFormat.js';

function BudgetPage() {
  const { activeWeddingId } = useActiveWedding();
  const [budget, setBudget] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getBudget(activeWeddingId).then((data) => { if (active) setBudget(data.budget); }).catch((error) => { if (active) setLoadError(getApiError(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeWeddingId]);

  async function refreshBudget() {
    const data = await getBudget(activeWeddingId);
    setBudget(data.budget);
  }
  function openAddForm() { setEditingItem(null); setFormError(''); setFormOpen(true); }
  function openEditForm(item) { setEditingItem(item); setFormError(''); setFormOpen(true); }
  function closeForm() { if (!submitting) { setFormOpen(false); setEditingItem(null); setFormError(''); } }

  async function handleFormSubmit(values) {
    setSubmitting(true); setFormError(''); setMessage('');
    try {
      if (editingItem) await updateBudgetItem(editingItem._id, values);
      else await createBudgetItem(values, activeWeddingId);
      await refreshBudget();
      setMessage(editingItem ? 'Budget item updated successfully.' : 'Budget item added successfully.');
      await showSuccess(editingItem ? 'Budget item updated successfully.' : 'Budget item added successfully.');
      setFormOpen(false); setEditingItem(null);
    } catch (error) { setFormError(getApiError(error)); await showApiError(error); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(item) {
    const confirmed = await confirmDelete(`Delete “${item.title}”?`, 'This budget item will be removed from the wedding.');
    if (!confirmed) return;
    setDeleting(item._id); setLoadError(''); setMessage('');
    try { await deleteBudgetItem(item._id); await refreshBudget(); await showSuccess('Budget item deleted successfully.'); }
    catch (error) { setLoadError(getApiError(error)); await showApiError(error, 'Unable to delete budget item'); }
    finally { setDeleting(null); }
  }

  if (loading) return <div className="mx-auto max-w-[1500px]"><div className="h-10 w-64 animate-pulse rounded bg-stone-200" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div><div className="mt-6 h-44 animate-pulse rounded-2xl bg-white" /></div>;
  if (loadError && budget === undefined) return <div className="mx-auto max-w-[1500px]"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"><h1 className="font-semibold">Could not load your budget</h1><p className="mt-2 text-sm">{loadError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white">Try Again</button></div></div>;
  if (budget === null) return <div className="mx-auto max-w-[1500px]"><p className="text-sm font-medium text-brand-600">Wedding Finances</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Budget Management</h1><div className="mt-8"><EmptyState icon={FiCreditCard} title="Create your wedding first" description="Create your wedding profile before setting up and organizing your wedding budget." action="Create Wedding" to="/weddings/new" /></div></div>;

  const overBudget = budget.overBudget ?? budget.remainingBudget < 0;
  const summaryCards = [
    { icon: FiDollarSign, label: 'Total Budget', value: formatBudget(budget.totalBudget || budget.estimatedBudget), helper: 'From your wedding profile' },
    { icon: FiPieChart, label: 'Total Planned Cost', value: formatBudget(budget.totalPlannedCost || budget.totalPlanned), tone: overBudget ? 'red' : 'amber' },
    { icon: FiTrendingUp, label: 'Total Paid', value: formatBudget(budget.totalPaid || budget.totalSpent), tone: 'emerald' },
    { icon: FiCreditCard, label: 'Amount Due', value: formatBudget(budget.totalAmountDue ?? budget.outstandingPayments ?? Math.max(0, (budget.totalPlannedCost || 0) - (budget.totalPaid || 0))), tone: 'brand' },
    { icon: FiDollarSign, label: 'Remaining Budget', value: formatBudget(budget.remainingBudget), tone: overBudget ? 'red' : 'emerald', helper: 'Budget minus planned cost' },
  ];

  return <div className="mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-brand-600">Wedding Finances</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Budget Management</h1><p className="mt-2 text-stone-500">Plan allocations, record actual spending, and stay aware of every cost.</p></div><button onClick={openAddForm} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"><FiPlus /> Add Budget Item</button></div>
    {message && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}{loadError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{summaryCards.map((card) => <BudgetSummaryCard key={card.label} {...card} />)}</div>
    <div className="mt-6"><BudgetProgress percentage={budget.budgetUsagePercentage} overBudget={overBudget} /></div>
    {overBudget && <div className="mt-6 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><FiAlertTriangle className="mt-0.5 shrink-0" /><span>Committed service costs exceed your wedding budget by <strong>{formatBudget(Math.abs(budget.remainingBudget))}</strong>.</span></div>}
    <section className="mt-8 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"><div className="flex items-center justify-between border-b px-5 py-5 sm:px-6"><div><h2 className="text-lg font-semibold text-stone-900">Budget Items</h2><p className="mt-1 text-sm text-stone-500">{budget.items.length} {budget.items.length === 1 ? 'item' : 'items'} in your plan</p></div>{budget.items.length > 0 && <button onClick={openAddForm} className="hidden items-center gap-2 text-sm font-semibold text-brand-700 sm:inline-flex"><FiPlus /> Add Item</button>}</div>{budget.items.length === 0 ? <div className="p-6 text-center sm:p-10"><EmptyState icon={FiCreditCard} title="No budget items yet" description="Start organizing your wedding expenses by adding your first budget item." /><button onClick={openAddForm} className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white"><FiPlus /> Add Budget Item</button></div> : <BudgetItemList items={budget.items} onEdit={openEditForm} onDelete={handleDelete} deleting={deleting} />}</section>
    <p className="mt-5 text-sm text-stone-500">Need to change the overall budget? <Link to="/wedding/edit" className="font-semibold text-brand-700">Edit your wedding profile</Link>.</p>
    <Modal isOpen={formOpen} onClose={closeForm} size="lg" title={editingItem ? 'Edit Budget Item' : 'Add Budget Item'} loading={submitting}>
      <BudgetItemForm key={editingItem?._id || 'new'} item={editingItem} submitting={submitting} error={formError} hideHeader onSubmit={handleFormSubmit} onCancel={closeForm} />
    </Modal>
  </div>;
}

export default BudgetPage;
