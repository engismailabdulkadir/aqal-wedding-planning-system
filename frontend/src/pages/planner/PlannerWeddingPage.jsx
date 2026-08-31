/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FormModal, fieldClass, FieldError } from '../../components/common/index.js';
import { createConversation, createTimelineEvent, updateTimelineEvent } from '../../services/planningService.js';
import { updateGuest } from '../../services/guestService.js';
import { deleteTask } from '../../services/taskService.js';
import { createPlannerTask, getPlannerWedding, updatePlannerTask } from '../../services/venueService.js';
import { confirmAction, confirmDelete, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget, formatSlot, formatWeddingDate } from '../../utils/weddingFormat.js';

const TABS = ['Overview', 'Customer / Couple', 'Venue & Hall', 'Bride Services', 'Groom Services', 'Wedding Services', 'Guests Overview', 'Tasks', 'Timeline', 'Vendors', 'Bookings', 'Payment Status Overview', 'Messages', 'Reports'];

const TAB_FROM_QUERY = {
  tasks: 'Tasks',
  timeline: 'Timeline',
  guests: 'Guests Overview',
  services: 'Wedding Services',
  bookings: 'Bookings',
};

function Status({ value }) {
  if (!value) return null;
  return <span className="capitalize">{String(value).replaceAll('_', ' ')}</span>;
}

export default function PlannerWeddingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(() => TAB_FROM_QUERY[searchParams.get('tab')] || 'Overview');
  const [error, setError] = useState('');
  const [taskForm, setTaskForm] = useState(null);
  const [taskErrors, setTaskErrors] = useState({});
  const [milestoneForm, setMilestoneForm] = useState(null);
  const [milestoneErrors, setMilestoneErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const load = () => getPlannerWedding(id).then(setData).catch((e) => setError(getApiError(e)));
  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const mapped = TAB_FROM_QUERY[searchParams.get('tab')];
    if (mapped) setTab(mapped);
  }, [searchParams]);

  const vendors = useMemo(() => {
    const map = new Map();
    for (const order of data?.orders || []) {
      if (order.vendor?._id) map.set(String(order.vendor._id), order.vendor);
    }
    for (const booking of data?.hallBookings || []) {
      if (booking.vendor?._id) map.set(String(booking.vendor._id), booking.vendor);
    }
    return [...map.values()];
  }, [data]);

  if (error && !data) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!data) return <p className="p-8 text-stone-400">Loading wedding workspace…</p>;

  const { wedding, hallBookings, selections, orders, tasks, guests, invitations, budget, payments, timeline, overview, bride, groom } = data;
  const hall = hallBookings?.[0];

  const addTask = async () => {
    const nextErrors = {};
    if (!taskForm?.title?.trim()) nextErrors.title = 'Title is required.';
    setTaskErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      if (taskForm._id) {
        await updatePlannerTask(taskForm._id, { title: taskForm.title, assignedTo: taskForm.assignedTo || undefined });
        await showSuccess('Task updated successfully.');
      } else {
        await createPlannerTask(id, { title: taskForm.title, assignedTo: taskForm.assignedTo || undefined, vendor: taskForm.assignedTo || undefined });
        await showSuccess('Task added successfully.');
      }
      setTaskForm(null);
      load();
    } catch (err) {
      await showApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const messageVendor = async (vendorId) => {
    try {
      const result = await createConversation({ recipient: vendorId, weddingId: id }, id);
      navigate(`/planner/messages?weddingId=${id}`, { state: { conversationId: result.conversation._id } });
    } catch (err) {
      setError(getApiError(err));
    }
  };

  const addMilestone = async () => {
    const nextErrors = {};
    if (!milestoneForm?.title?.trim()) nextErrors.title = 'Title is required.';
    setMilestoneErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true);
    try {
      if (milestoneForm._id) {
        await updateTimelineEvent(milestoneForm._id, { title: milestoneForm.title, dueDate: milestoneForm.dueDate || undefined, weddingId: id });
        await showSuccess('Timeline updated successfully.');
      } else {
        await createTimelineEvent({ title: milestoneForm.title, dueDate: milestoneForm.dueDate || undefined, weddingId: id }, id);
        await showSuccess('Timeline item added successfully.');
      }
      setMilestoneForm(null);
      load();
    } catch (err) {
      await showApiError(err);
    } finally {
      setSaving(false);
    }
  };

  const changeTaskStatus = async (task, status) => {
    if (status === task.status) return;
    const confirmed = await confirmAction({
      title: status === 'completed' ? 'Mark this task complete?' : `Update “${task.title}” to ${status.replaceAll('_', ' ')}?`,
      confirmButtonText: status === 'completed' ? 'Mark Complete' : 'Update Status',
    });
    if (!confirmed) return;
    try {
      await updatePlannerTask(task._id, { status });
      await showSuccess(status === 'completed' ? 'Task marked complete.' : 'Task status updated.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  };

  const removeTask = async (task) => {
    const confirmed = await confirmDelete('Delete this task?', 'This task will be removed from the assigned wedding.');
    if (!confirmed) return;
    try {
      await deleteTask(task._id);
      await showSuccess('Task deleted successfully.');
      load();
    } catch (err) {
      await showApiError(err);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <Link to="/planner/weddings" className="text-sm font-semibold text-brand-700">← Assigned weddings</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{wedding.weddingName}</h1>
      <p className="mt-1 text-stone-500">Customer owner: {wedding.customer?.firstName} {wedding.customer?.lastName} · You are the assigned coordinator</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-sm ${tab === item ? 'bg-brand-600 text-white' : 'bg-white shadow-sm'}`}>{item}</button>)}
      </div>
      <div className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        {tab === 'Overview' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <p>Date {formatWeddingDate(wedding.weddingDate)}</p>
            <p>Hall {hall?.hallName || hall?.hall?.hallName || 'none'} · {formatSlot(hall?.slotType)} · <Status value={hall?.status || 'none'} /></p>
            <p>Guests {overview?.guestsAdded || guests?.total || 0} of {overview?.expectedGuests || guests?.expected || 0}</p>
            <p>Tasks {overview?.tasksCompleted || tasks?.completed || 0}/{overview?.tasksTotal || tasks?.total || 0}</p>
            <p>Planned {formatBudget(overview?.plannedCost || budget?.planned)} · Paid {formatBudget(budget?.totalPaid)} · Due {formatBudget(overview?.amountDue || budget?.outstanding)}</p>
            <p>Bookings {overview?.confirmedBookings || 0} · Confirmed vendors {overview?.confirmedVendors || 0}</p>
          </div>
        )}
        {tab === 'Customer / Couple' && (
          <div className="space-y-2">
            <p>Customer: {wedding.customer?.firstName} {wedding.customer?.lastName} · {wedding.customer?.email}</p>
            <p>Couple: {wedding.partner1Name} & {wedding.partner2Name}</p>
          </div>
        )}
        {tab === 'Venue & Hall' && (
          <div className="space-y-2">
            {(hallBookings || []).map((b) => (
              <p key={b._id}>{b.venue?.name} · {b.hall?.hallName} · {formatSlot(b.slotType)} · <Status value={b.status} /> · {b.paymentStatus}</p>
            ))}
            {!hallBookings?.length && <p className="text-stone-400">No hall booking yet.</p>}
          </div>
        )}
        {tab === 'Bride Services' && ((bride || []).length ? bride.map((s) => <p key={s._id}>{s.itemName} · <Status value={s.status} /></p>) : <p className="text-stone-400">No bride services yet.</p>)}
        {tab === 'Groom Services' && ((groom || []).length ? groom.map((s) => <p key={s._id}>{s.itemName} · <Status value={s.status} /></p>) : <p className="text-stone-400">No groom services yet.</p>)}
        {tab === 'Wedding Services' && (selections || []).map((s) => <p key={s._id}>{s.itemName} · <Status value={s.status} /> · {s.vendor?.firstName} {s.vendor?.lastName}</p>)}
        {tab === 'Guests Overview' && (
          <div className="space-y-3">
            <p>{guests?.accepted || 0} accepted · {guests?.pending || 0} pending RSVP · {guests?.declined || 0} declined · {guests?.total || 0} guests</p>
            <p>Invitations: draft {invitations?.draft || 0} · sent {invitations?.sent || 0} · pending RSVP {invitations?.pending || 0}</p>
            {(guests?.items || []).map((g) => (
              <div key={g._id} className="flex items-center justify-between gap-3 border-b py-2">
                <span>{g.firstName} {g.lastName} · RSVP {g.rsvpStatus}</span>
                <input
                  defaultValue={g.tableNumber || ''}
                  placeholder="Table"
                  className="w-24 rounded-lg border px-2 py-1 text-sm"
                  onBlur={(e) => updateGuest(g._id, { tableNumber: e.target.value, weddingId: id }).then(load).catch((err) => setError(getApiError(err)))}
                />
              </div>
            ))}
          </div>
        )}
        {tab === 'Tasks' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => { setTaskForm({ title: '', assignedTo: '' }); setTaskErrors({}); }} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add Task</button>
            </div>
            {(tasks?.items || []).map((task) => (
              <div key={task._id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                <span>{task.title}{task.assignedTo ? ` · ${task.assignedTo.firstName} ${task.assignedTo.lastName}` : ''}</span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setTaskForm({ _id: task._id, title: task.title, assignedTo: task.assignedTo?._id || '' }); setTaskErrors({}); }} className="text-sm font-semibold text-brand-700">Edit</button>
                  <button type="button" onClick={() => removeTask(task)} className="text-sm font-semibold text-red-600">Delete</button>
                  <select value={task.status} onChange={(e) => changeTaskStatus(task, e.target.value)} className="rounded-lg border px-2 py-1 text-sm">
                    <option value="todo">To do</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'Timeline' && (
          <div>
            <div className="mb-4 flex justify-end">
              <button type="button" onClick={() => { setMilestoneForm({ title: '', dueDate: '' }); setMilestoneErrors({}); }} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add Timeline Item</button>
            </div>
            {(timeline || []).map((item) => (
              <div key={item._id} className="flex items-center justify-between border-b py-2">
                <span>{item.title} · <Status value={item.displayStatus || item.status} /></span>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => { setMilestoneForm({ _id: item._id, title: item.title, dueDate: item.dueDate ? String(item.dueDate).slice(0, 10) : '' }); setMilestoneErrors({}); }} className="text-sm font-semibold text-brand-700">Edit</button>
                  <select value={item.status} onChange={(e) => updateTimelineEvent(item._id, { status: e.target.value, weddingId: id }).then(() => { showSuccess('Timeline status updated.'); load(); }).catch((err) => showApiError(err))} className="rounded-lg border px-2 py-1 text-sm">
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === 'Vendors' && (
          <div className="space-y-3">
            {(orders || []).map((o) => (
              <div key={o._id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                <p>{o.itemName} · {o.vendor?.firstName} {o.vendor?.lastName} · <Status value={o.status} /></p>
                {o.vendor?._id && <button type="button" onClick={() => messageVendor(o.vendor._id)} className="text-sm font-semibold text-brand-700">Message vendor</button>}
              </div>
            ))}
            {(hallBookings || []).map((b) => (
              <div key={b._id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2">
                <p>Hall · {b.hall?.hallName} · {b.vendor?.firstName} {b.vendor?.lastName} · <Status value={b.status} /></p>
                {b.vendor?._id && <button type="button" onClick={() => messageVendor(b.vendor._id)} className="text-sm font-semibold text-brand-700">Message vendor</button>}
              </div>
            ))}
          </div>
        )}
        {tab === 'Bookings' && (hallBookings || []).map((b) => <p key={b._id}>{b.hall?.hallName} · {formatSlot(b.slotType)} · <Status value={b.status} /></p>)}
        {tab === 'Payment Status Overview' && (
          <div className="space-y-2">
            <p>Total budget {formatBudget(wedding.estimatedBudget)} · Planned {formatBudget(budget?.planned)} · Paid {formatBudget(payments?.totalPaid || budget?.totalPaid)} · Due {formatBudget(payments?.amountDue || budget?.outstanding)} · Remaining {formatBudget(payments?.remainingBudget || budget?.remaining)}</p>
            {(payments?.records || []).map((p) => <p key={p._id}>{formatBudget(p.amount)} · <Status value={p.status} /></p>)}
          </div>
        )}
        {tab === 'Messages' && <Link className="font-semibold text-brand-700" to={`/planner/messages?weddingId=${id}`}>Open messages</Link>}
        {tab === 'Reports' && <Link className="font-semibold text-brand-700" to="/planner/reports">Open reports</Link>}
      </div>

      <FormModal
        isOpen={Boolean(taskForm)}
        onClose={() => setTaskForm(null)}
        title={taskForm?._id ? 'Edit Task' : 'Add Task'}
        loading={saving}
        onSubmit={addTask}
        submitLabel={taskForm?._id ? 'Save Task' : 'Save Task'}
      >
        {taskForm ? (
          <>
            <label className="block text-sm font-medium text-stone-700">
              Title
              <input value={taskForm.title} onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })} className={fieldClass} />
              <FieldError message={taskErrors.title} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Assign to vendor
              <select value={taskForm.assignedTo} onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })} className={fieldClass}>
                <option value="">Unassigned</option>
                {vendors.map((vendor) => <option key={vendor._id} value={vendor._id}>{vendor.firstName} {vendor.lastName}</option>)}
              </select>
            </label>
          </>
        ) : null}
      </FormModal>

      <FormModal
        isOpen={Boolean(milestoneForm)}
        onClose={() => setMilestoneForm(null)}
        title={milestoneForm?._id ? 'Edit Timeline Item' : 'Add Timeline Item'}
        loading={saving}
        onSubmit={addMilestone}
        submitLabel={milestoneForm?._id ? 'Save Item' : 'Add Item'}
      >
        {milestoneForm ? (
          <>
            <label className="block text-sm font-medium text-stone-700">
              Title
              <input value={milestoneForm.title} onChange={(e) => setMilestoneForm({ ...milestoneForm, title: e.target.value })} className={fieldClass} />
              <FieldError message={milestoneErrors.title} />
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Due date
              <input type="date" value={milestoneForm.dueDate || ''} onChange={(e) => setMilestoneForm({ ...milestoneForm, dueDate: e.target.value })} className={fieldClass} />
            </label>
          </>
        ) : null}
      </FormModal>
    </div>
  );
}
