import { useEffect, useMemo, useState } from 'react';
import { FiHeart, FiPlus, FiUserCheck, FiUserPlus, FiUsers } from 'react-icons/fi';
import EmptyState from '../../components/dashboard/EmptyState.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import GuestFilters from '../../components/guests/GuestFilters.jsx';
import GuestForm from '../../components/guests/GuestForm.jsx';
import GuestImportPanel from '../../components/guests/GuestImportPanel.jsx';
import GuestList from '../../components/guests/GuestList.jsx';
import { createGuest, deleteGuest, getGuests, updateGuest } from '../../services/guestService.js';
import { Modal } from '../../components/common/index.js';
import { confirmDelete, showApiError, showSuccess } from '../../utils/alerts.js';
import { getApiError } from '../../utils/apiError.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { filterGuests } from '../../utils/filterGuests.js';

function GuestsPage() {
  const { activeWeddingId } = useActiveWedding();
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [side, setSide] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    getGuests(activeWeddingId).then((result) => { if (active) setData(result); }).catch((error) => { if (active) setLoadError(getApiError(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [activeWeddingId]);

  const filteredGuests = useMemo(() => {
    if (!data?.guests) return [];
    return filterGuests(data.guests, { search, category, side });
  }, [data, search, category, side]);

  async function refreshGuests() { const result = await getGuests(activeWeddingId); setData(result); }
  function openAdd() { setEditingGuest(null); setFormError(''); setFormOpen(true); }
  function openEdit(guest) { setEditingGuest(guest); setFormError(''); setFormOpen(true); }
  function closeForm() { if (!submitting) { setFormOpen(false); setEditingGuest(null); setFormError(''); } }
  async function handleSubmit(values) {
    setSubmitting(true); setFormError(''); setMessage('');
    try { if (editingGuest) await updateGuest(editingGuest._id, values); else await createGuest(values, activeWeddingId); await refreshGuests(); await showSuccess(editingGuest ? 'Guest updated successfully.' : 'Guest added successfully.'); setFormOpen(false); setEditingGuest(null); }
    catch (error) { setFormError(getApiError(error)); await showApiError(error); }
    finally { setSubmitting(false); }
  }
  async function handleDelete(guest) {
    const confirmed = await confirmDelete(`Delete ${guest.firstName} ${guest.lastName || ''}?`, 'This guest will be removed from the wedding.');
    if (!confirmed) return;
    setDeleting(guest._id); setLoadError(''); setMessage('');
    try { await deleteGuest(guest._id); await refreshGuests(); await showSuccess('Guest removed successfully.'); }
    catch (error) { setLoadError(getApiError(error)); await showApiError(error, 'Unable to delete guest'); }
    finally { setDeleting(null); }
  }

  if (loading) return <div className="mx-auto max-w-[1500px]"><div className="h-10 w-64 animate-pulse rounded bg-stone-200" /><div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div><div className="mt-6 h-56 animate-pulse rounded-2xl bg-white" /></div>;
  if (loadError && !data) return <div className="mx-auto max-w-[1500px]"><div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700"><h1 className="font-semibold">Could not load your guests</h1><p className="mt-2 text-sm">{loadError}</p><button onClick={() => window.location.reload()} className="mt-4 rounded-full bg-red-700 px-5 py-2.5 text-sm font-semibold text-white">Try Again</button></div></div>;
  if (data.wedding === null) return <div className="mx-auto max-w-[1500px]"><p className="text-sm font-medium text-brand-600">Your Celebration</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Guest Management</h1><div className="mt-8"><EmptyState icon={FiHeart} title="Create your wedding first" description="Create your wedding profile before adding and organizing guests." action="Create Wedding" to="/weddings/new" /></div></div>;

  const summaryCards = [
    { icon: FiUsers, label: 'Total Invited', value: String(data.summary.totalGuests), helper: data.wedding?.expectedGuests != null ? `${data.summary.totalGuests} of ${data.wedding.expectedGuests} expected` : `${data.summary.expectedAttendees || 0} expected attendees` },
    { icon: FiUserCheck, label: 'Accepted', value: String(data.summary.accepted) },
    { icon: FiUserPlus, label: 'Pending', value: String(data.summary.pending) },
    { icon: FiUserPlus, label: 'Declined', value: String(data.summary.declined) },
  ];

  return <div className="mx-auto max-w-[1500px]"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-brand-600">Your Celebration</p><h1 className="mt-1 font-display text-3xl font-semibold text-stone-900 sm:text-4xl">Guest Management</h1><p className="mt-2 text-stone-500">Build, organize, and find everyone on your wedding guest list.</p></div><div className="flex flex-wrap items-center gap-2"><GuestImportPanel weddingId={activeWeddingId} onImported={refreshGuests} /><button onClick={openAdd} className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700"><FiPlus /> Add Guest</button></div></div>
    {message && <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}{loadError && <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{loadError}</div>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map((card) => <StatCard key={card.label} {...card} />)}</div>
    <section className="mt-8 overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-sm"><div className="border-b p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-stone-900">Guest List</h2><p className="mt-1 text-sm text-stone-500">{data.count} {data.count === 1 ? 'guest' : 'guests'} added</p></div>{data.count > 0 && <button onClick={openAdd} className="hidden items-center gap-2 text-sm font-semibold text-brand-700 sm:inline-flex"><FiPlus /> Add Guest</button>}</div>{data.count > 0 && <GuestFilters search={search} category={category} side={side} onSearch={setSearch} onCategory={setCategory} onSide={setSide} />}</div>
      {data.count === 0 ? <div className="p-6 text-center sm:p-10"><EmptyState icon={FiUsers} title="No guests added yet" description="Start building your wedding guest list." /><button onClick={openAdd} className="mt-5 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white"><FiPlus /> Add Guest</button></div> : filteredGuests.length === 0 ? <div className="p-12 text-center"><FiUsers className="mx-auto text-3xl text-stone-300" /><h3 className="mt-4 font-semibold text-stone-700">No guests match your search</h3><p className="mt-2 text-sm text-stone-500">Try changing your search or filters.</p><button onClick={() => { setSearch(''); setCategory('all'); setSide('all'); }} className="mt-4 text-sm font-semibold text-brand-700">Clear filters</button></div> : <GuestList guests={filteredGuests} onEdit={openEdit} onDelete={handleDelete} deleting={deleting} />}
    </section>
    <Modal isOpen={formOpen} onClose={closeForm} size="lg" title={editingGuest ? 'Edit Guest' : 'Add Guest'} loading={submitting}>
      <GuestForm key={editingGuest?._id || 'new'} guest={editingGuest} submitting={submitting} error={formError} hideHeader onSubmit={handleSubmit} onCancel={closeForm} />
    </Modal>
  </div>;
}

export default GuestsPage;
