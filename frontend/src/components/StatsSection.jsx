const stats = [
  { value: '500+', label: 'Weddings' }, { value: '200+', label: 'Vendors' },
  { value: '10K+', label: 'Guests Managed' }, { value: '98%', label: 'Satisfaction' },
];

function StatsSection() {
  return <section className="bg-brand-800 py-14 text-white"><div className="section-shell grid grid-cols-2 gap-y-10 divide-brand-600 sm:grid-cols-4 sm:divide-x">{stats.map(({ value, label }) => <div key={label} className="text-center"><p className="font-display text-4xl font-semibold sm:text-5xl">{value}</p><p className="mt-2 text-xs font-medium uppercase tracking-wider text-brand-200 sm:text-sm">{label}</p></div>)}</div></section>;
}

export default StatsSection;
