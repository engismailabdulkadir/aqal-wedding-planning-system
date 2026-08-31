function BudgetSummaryCard({ icon: Icon, label, value, tone = 'brand', helper }) {
  const tones = { brand: 'bg-brand-50 text-brand-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600', red: 'bg-red-50 text-red-600' };
  return <article className="rounded-2xl border border-stone-100 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm text-stone-500">{label}</p><p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>{helper && <p className="mt-1 text-xs text-stone-400">{helper}</p>}</div><span className={`grid h-11 w-11 place-items-center rounded-xl text-lg ${tones[tone]}`}><Icon /></span></div></article>;
}
export default BudgetSummaryCard;
