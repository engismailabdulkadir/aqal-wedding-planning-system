import { useEffect, useMemo, useState } from 'react';
import { FiAlertTriangle, FiCheckCircle, FiClock, FiHeart, FiList, FiPlus } from 'react-icons/fi';
import EmptyState from '../../components/dashboard/EmptyState.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import TaskFilters from '../../components/tasks/TaskFilters.jsx';
import TaskForm from '../../components/tasks/TaskForm.jsx';
import TaskList from '../../components/tasks/TaskList.jsx';
import TaskProgress from '../../components/tasks/TaskProgress.jsx';
import { createTask, deleteTask, getTasks, updateTask } from '../../services/taskService.js';
import { Modal } from '../../components/common/index.js';
import { confirmAction, confirmDelete, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { filterTasks } from '../../utils/filterTasks.js';

export default function TasksPage() {
  const { activeWeddingId } = useActiveWedding();
  const [data, setData] = useState(); const [loading, setLoading] = useState(true); const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState(''); const [status, setStatus] = useState('all'); const [category, setCategory] = useState('all'); const [priority, setPriority] = useState('all');
  const [formOpen, setFormOpen] = useState(false); const [editingTask, setEditingTask] = useState(null); const [submitting, setSubmitting] = useState(false); const [formError, setFormError] = useState(''); const [busyId, setBusyId] = useState(null); const [message, setMessage] = useState('');
  useEffect(() => { let active = true; getTasks(activeWeddingId).then((result) => { if (active) setData(result); }).catch((error) => { if (active) setLoadError(getApiError(error)); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [activeWeddingId]);
  const filteredTasks = useMemo(() => filterTasks(data?.tasks || [], { search, status, category, priority }), [data, search, status, category, priority]);
  async function refresh() { setData(await getTasks(activeWeddingId)); }
  function openAdd() { setEditingTask(null); setFormError(''); setFormOpen(true); }
  function openEdit(task) { setEditingTask(task); setFormError(''); setFormOpen(true); }
  function closeForm() { if (!submitting) { setFormOpen(false); setEditingTask(null); setFormError(''); } }
  async function handleSubmit(values) { setSubmitting(true); setFormError(''); setMessage(''); try { if (editingTask) await updateTask(editingTask._id, values); else await createTask(values, activeWeddingId); await refresh(); await showSuccess(editingTask ? 'Task updated successfully.' : 'Task added successfully.'); setFormOpen(false); setEditingTask(null); } catch (error) { setFormError(getApiError(error)); await showApiError(error); } finally { setSubmitting(false); } }
  async function handleStatus(task, nextStatus) {
    if (nextStatus === 'completed') {
      const confirmed = await confirmAction({ title: 'Mark this task complete?', confirmButtonText: 'Mark Complete' });
      if (!confirmed) return;
    }
    setBusyId(task._id); setLoadError(''); setMessage('');
    try { await updateTask(task._id, { status: nextStatus }); await refresh(); await showSuccess(nextStatus === 'completed' ? 'Task marked complete.' : 'Task reopened.'); }
    catch (error) { setLoadError(getApiError(error)); await showApiError(error); }
    finally { setBusyId(null); }
  }
  async function handleDelete(task) {
    const confirmed = await confirmDelete('Delete this task?', 'This task will be removed from the wedding checklist.');
    if (!confirmed) return;
    setBusyId(task._id); setLoadError(''); setMessage('');
    try { await deleteTask(task._id); await refresh(); await showSuccess('Task deleted successfully.'); }
    catch (error) { setLoadError(getApiError(error)); await showApiError(error, 'Unable to delete task'); }
    finally { setBusyId(null); }
  }
  if (loading) return <div className="mx-auto max-w-[1500px]"><div className="h-10 w-64 animate-pulse rounded bg-stone-200" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div><div className="mt-6 h-64 animate-pulse rounded-2xl bg-white" /></div>;
  if (loadError && !data) return <div className="mx-auto max-w-[1500px]"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"><h1 className="font-semibold">Could not load your wedding checklist</h1><p className="mt-2 text-sm">{loadError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white">Try Again</button></div></div>;
  if (data.wedding === null) return <div className="mx-auto max-w-[1500px]"><p className="text-sm font-medium text-brand-600">Plan With Confidence</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Wedding Checklist</h1><div className="mt-8"><EmptyState icon={FiHeart} title="Create your wedding first" description="Create your wedding profile before creating your wedding checklist." action="Create Wedding" to="/weddings/new" /></div></div>;
  const summary = data.summary; const cards = [{ icon: FiList, label: 'Total Tasks', value: String(summary.total) }, { icon: FiCheckCircle, label: 'Completed', value: String(summary.completed) }, { icon: FiClock, label: 'In Progress', value: String(summary.inProgress) }, { icon: FiAlertTriangle, label: 'Overdue', value: String(summary.overdue) }];
  return <div className="mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-brand-600">Plan With Confidence</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Wedding Checklist</h1><p className="mt-2 text-stone-500">Organize every step and celebrate your planning progress.</p></div><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"><FiPlus /> Add Task</button></div>{message && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}{loadError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}<div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => <StatCard key={card.label} {...card} />)}</div><div className="mt-6"><TaskProgress percentage={summary.completionPercentage} /></div><section className="mt-8 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"><div className="border-b p-5 sm:p-6"><div className="mb-5"><h2 className="text-lg font-semibold text-stone-900">Task List</h2><p className="mt-1 text-sm text-stone-500">{summary.total} {summary.total === 1 ? 'task' : 'tasks'} in your checklist</p></div>{summary.total > 0 && <TaskFilters search={search} status={status} category={category} priority={priority} onSearch={setSearch} onStatus={setStatus} onCategory={setCategory} onPriority={setPriority} />}</div>{summary.total === 0 ? <div className="p-6 text-center sm:p-10"><EmptyState icon={FiList} title="No wedding tasks yet" description="Create your first task and start building your wedding checklist." /><button onClick={openAdd} className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white"><FiPlus /> Add Task</button></div> : filteredTasks.length === 0 ? <div className="p-12 text-center"><FiList className="mx-auto text-3xl text-stone-300" /><h3 className="mt-4 font-semibold text-stone-700">No tasks match your filters</h3><button onClick={() => { setSearch(''); setStatus('all'); setCategory('all'); setPriority('all'); }} className="mt-4 text-sm font-semibold text-brand-700">Clear filters</button></div> : <TaskList tasks={filteredTasks} busyId={busyId} onEdit={openEdit} onStatus={handleStatus} onDelete={handleDelete} />}</section>    <Modal isOpen={formOpen} onClose={closeForm} size="lg" title={editingTask ? 'Edit Task' : 'Add Task'} loading={submitting}>
      <TaskForm key={editingTask?._id || 'new'} task={editingTask} weddingDate={data.wedding.weddingDate} submitting={submitting} error={formError} hideHeader onSubmit={handleSubmit} onCancel={closeForm} />
    </Modal></div>;
}
