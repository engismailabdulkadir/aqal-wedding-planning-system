import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createAdminWedding, getAdminCustomers, getAdminPlanners } from '../../services/roleService.js';
import { getApiError } from '../../utils/apiError.js';

const empty = {
  customer: '',
  weddingName: '',
  partner1Name: '',
  partner2Name: '',
  weddingDate: '',
  city: '',
  expectedGuests: '',
  estimatedBudget: '',
  planner: '',
  notes: '',
};

export default function AdminCreateWeddingPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [customers, setCustomers] = useState([]);
  const [planners, setPlanners] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      getAdminCustomers({ search }).then((data) => setCustomers((data.customers || []).filter((c) => c.isActive))).catch((e) => setError(getApiError(e)));
    }, 150);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    getAdminPlanners()
      .then((data) => setPlanners((data.planners || []).filter((p) => p.isActive)))
      .catch((e) => setError(getApiError(e)));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const data = await createAdminWedding({
        ...form,
        expectedGuests: Number(form.expectedGuests || 0),
        estimatedBudget: Number(form.estimatedBudget || 0),
        planner: form.planner || undefined,
      });
      navigate(`/admin/weddings/${data.wedding._id}`, { state: { message: data.message || 'Wedding created for the selected customer.' } });
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/admin/weddings" className="text-sm font-semibold text-brand-600">← Weddings</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">Create Wedding</h1>
      <p className="mt-2 text-stone-500">The selected customer becomes the wedding owner. Admin is not the owner.</p>
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
      <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium">Search customers
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className="mt-1 w-full rounded-xl border p-3" />
        </label>
        <label className="block text-sm font-medium">Customer *
          <select required value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className="mt-1 w-full rounded-xl border p-3">
            <option value="">Select customer</option>
            {customers.map((c) => (
              <option key={c._id} value={c._id}>{c.firstName} {c.lastName} · {c.email}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">Wedding Name *
          <input required value={form.weddingName} onChange={(e) => setForm({ ...form, weddingName: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium">Partner 1 *
            <input required value={form.partner1Name} onChange={(e) => setForm({ ...form, partner1Name: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
          </label>
          <label className="text-sm font-medium">Partner 2 *
            <input required value={form.partner2Name} onChange={(e) => setForm({ ...form, partner2Name: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
          </label>
          <label className="text-sm font-medium">Wedding Date *
            <input required type="date" value={form.weddingDate} onChange={(e) => setForm({ ...form, weddingDate: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
          </label>
          <label className="text-sm font-medium">City
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
          </label>
          <label className="text-sm font-medium">Expected Guests
            <input type="number" min="0" value={form.expectedGuests} onChange={(e) => setForm({ ...form, expectedGuests: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
          </label>
          <label className="text-sm font-medium">Budget
            <input type="number" min="0" value={form.estimatedBudget} onChange={(e) => setForm({ ...form, estimatedBudget: e.target.value })} className="mt-1 w-full rounded-xl border p-3" />
          </label>
        </div>
        <label className="block text-sm font-medium">Planner (optional)
          <select value={form.planner} onChange={(e) => setForm({ ...form, planner: e.target.value })} className="mt-1 w-full rounded-xl border p-3">
            <option value="">Unassigned</option>
            {planners.map((p) => (
              <option key={p._id} value={p._id}>{p.firstName} {p.lastName}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">Notes
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3" />
        </label>
        <button disabled={submitting} className="rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white disabled:opacity-60">{submitting ? 'Creating…' : 'Create wedding'}</button>
      </form>
    </div>
  );
}
