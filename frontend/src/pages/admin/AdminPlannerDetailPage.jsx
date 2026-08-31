import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getAdminPlanner } from '../../services/roleService.js';
import { getApiError } from '../../utils/apiError.js';

export default function AdminPlannerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminPlanner(id)
      .then(setData)
      .catch((e) => setError(getApiError(e)));
  }, [id]);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!data) return <div className="grid min-h-[40vh] place-items-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" /></div>;

  const { planner, profile, weddings } = data;

  return (
    <div className="mx-auto max-w-7xl">
      <Link to="/admin/planners" className="text-sm font-semibold text-brand-600">← Back to Planners</Link>
      <h1 className="mt-2 font-display text-4xl font-semibold">{planner.firstName} {planner.lastName}</h1>
      <p className="mt-1 text-stone-500">{planner.email}</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Profile</h2>
          <div className="mt-4 space-y-2 text-sm">
            <p><span className="text-stone-500">Title:</span> {profile?.title || '—'}</p>
            <p><span className="text-stone-500">Experience:</span> {profile?.experienceYears ?? 0} years</p>
            <p><span className="text-stone-500">City:</span> {profile?.city || '—'}</p>
            <p><span className="text-stone-500">Bio:</span> {profile?.bio || '—'}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Assigned Weddings ({weddings?.length || 0})</h2>
          <div className="mt-4 space-y-3">
            {weddings?.length ? weddings.map((w) => (
              <div key={w._id} className="rounded-xl border p-4">
                <p className="font-semibold">{w.weddingName}</p>
                <p className="text-sm text-stone-500">
                  {w.customer?.firstName} {w.customer?.lastName} · {new Date(w.weddingDate).toLocaleDateString()}
                </p>
              </div>
            )) : <p className="text-stone-400">No assigned weddings.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
