import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getAdminReports } from '../../services/planningService.js';
import { getApiError } from '../../utils/apiError.js';
import { formatBudget } from '../../utils/weddingFormat.js';

const TABS = [
  { key: 'overview', label: 'Overview Reports', path: '/admin/reports' },
  { key: 'finance', label: 'Financial Analytics', path: '/admin/reports/finance' },
  { key: 'operations', label: 'Operations Analytics', path: '/admin/reports/operations' },
];

function tabFromPath(pathname) {
  if (pathname.endsWith('/finance')) return 'finance';
  if (pathname.endsWith('/operations')) return 'operations';
  return 'overview';
}

export default function AdminReportsPage() {
  const location = useLocation();
  const tab = tabFromPath(location.pathname);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getAdminReports().then((d) => setReport(d.report)).catch((e) => setError(getApiError(e)));
  }, []);

  if (error) return <p className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>;
  if (!report) return <p className="p-8 text-stone-400">Loading reports…</p>;

  const overviewCards = [
    ['Users', report.users], ['Customers', report.customers], ['Planners', report.planners], ['Vendors', report.vendors],
    ['Weddings', report.weddings], ['Venues', report.venues],
  ];
  const financeCards = [
    ['Revenue', formatBudget(report.revenue)],
    ['Payments', report.payments],
    ['Orders', report.orders],
  ];
  const operationsCards = [
    ['Bookings', report.bookings],
    ['Orders', report.orders],
    ['Popular services', (report.popularServices || []).length],
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <p className="text-sm font-semibold text-brand-600">Analytics</p>
      <h1 className="font-display text-4xl font-semibold">Reports / Analytics</h1>

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <NavLink
            key={item.key}
            to={item.path}
            end={item.key === 'overview'}
            className={() => `rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === item.key ? 'bg-brand-600 text-white' : 'bg-white text-stone-600 shadow-sm hover:bg-brand-50'
            }`}
          >
            {item.label}
          </NavLink>
        ))}
      </div>

      {tab === 'overview' ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overviewCards.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-stone-500">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>
            ))}
          </div>
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Service usage</h2>
            <ul className="mt-4 space-y-2 text-sm">{(report.popularServices || []).map((s) => <li key={s._id}>{s._id || 'other'} · {s.count} orders</li>)}</ul>
          </section>
        </>
      ) : null}

      {tab === 'finance' ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {financeCards.map(([k, v]) => (
            <div key={k} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-stone-500">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>
          ))}
        </div>
      ) : null}

      {tab === 'operations' ? (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {operationsCards.map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white p-5 shadow-sm"><p className="text-sm text-stone-500">{k}</p><p className="mt-2 text-2xl font-semibold">{v}</p></div>
            ))}
          </div>
          <section className="mt-8 rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="font-semibold">Popular services</h2>
            <ul className="mt-4 space-y-2 text-sm">{(report.popularServices || []).map((s) => <li key={s._id}>{s._id || 'other'} · {s.count} orders</li>)}</ul>
          </section>
        </>
      ) : null}
    </div>
  );
}
