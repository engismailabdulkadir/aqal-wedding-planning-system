import { useEffect, useState } from 'react';
import { getPlannerReports } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';

export default function PlannerReportsPage() {
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    getPlannerReports().then((d) => setReport(d.report)).catch((e) => setError(getApiError(e)));
  }, []);
  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!report) return <p className="p-8 text-stone-400">Loading report…</p>;
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-4xl font-semibold">Planner reports</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Assigned weddings" value={report.assignedWeddings} />
        <Card label="Task completion" value={`${report.taskCompletion?.completionPercentage || 0}%`} />
        <Card label="Service confirmations" value={report.serviceConfirmations} />
      </div>
    </div>
  );
}

function Card({ label, value }) {
  return <div className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p></div>;
}
