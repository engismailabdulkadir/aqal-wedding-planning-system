import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assignPlanner, getAdminWeddings } from '../../services/roleService.js';
import { confirmAction, showApiError, showSuccess } from '../../utils/alerts.js';
import { formatWeddingDate } from '../../utils/weddingFormat.js';

export default function AdminWeddingsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = () => getAdminWeddings().then(setData).catch((e) => setError(e.response?.data?.message || 'Could not load weddings'));
  useEffect(() => {
    load();
  }, []);

  const assign = async (wedding, planner) => {
    const plannerName = data.planners.find((item) => item._id === planner);
    const confirmed = await confirmAction({
      title: planner
        ? `Assign ${plannerName?.firstName || 'this planner'} to ${wedding.weddingName}?`
        : `Remove planner from ${wedding.weddingName}?`,
      text: planner
        ? 'The planner will be able to coordinate this wedding.'
        : 'Wedding history will be preserved.',
      confirmButtonText: planner ? 'Assign Planner' : 'Remove Planner',
      danger: !planner,
    });
    if (!confirmed) return;
    try {
      const result = await assignPlanner(wedding._id, planner || null);
      await showSuccess(result.message || (planner ? 'Planner assigned successfully.' : 'Planner removed. Wedding history was preserved.'));
      load();
    } catch (err) {
      await showApiError(err, 'Assignment failed');
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-600">System Management</p>
          <h1 className="font-display text-4xl font-semibold">All Weddings</h1>
        </div>
        <Link to="/admin/weddings/new" className="rounded-full bg-brand-600 px-5 py-3 text-sm font-semibold text-white">Create Wedding</Link>
      </div>
      {error ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-red-700">{error}</p> : null}
      <div className="mt-7 overflow-x-auto rounded-2xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-50"><tr>{['Wedding', 'Customer', 'Date', 'City', 'Planner'].map((heading) => <th key={heading} className="px-5 py-4">{heading}</th>)}</tr></thead>
          <tbody className="divide-y">
            {data?.weddings.map((wedding) => (
              <tr key={wedding._id}>
                <td className="px-5 py-4 font-semibold"><Link className="text-brand-700" to={`/admin/weddings/${wedding._id}`}>{wedding.weddingName}</Link></td>
                <td className="px-5 py-4">{wedding.customer?.firstName} {wedding.customer?.lastName}</td>
                <td className="px-5 py-4">{formatWeddingDate(wedding.weddingDate)}</td>
                <td className="px-5 py-4">{wedding.city}</td>
                <td className="px-5 py-4">
                  <select
                    key={`${wedding._id}-${wedding.planner?._id || 'none'}`}
                    value={wedding.planner?._id || ''}
                    onChange={(event) => assign(wedding, event.target.value)}
                    className="rounded-xl border px-3 py-2"
                  >
                    <option value="">Unassigned</option>
                    {data.planners.map((planner) => <option key={planner._id} value={planner._id}>{planner.firstName} {planner.lastName}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
