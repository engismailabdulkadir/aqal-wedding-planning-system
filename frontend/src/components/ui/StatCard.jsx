export default function StatCard({ icon: Icon, label, value, helper, suffix }) {
  return (
    <article className="rounded-2xl border border-app-border bg-app-surface p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-app-muted">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-app-text">
            {value ?? '—'}
            {suffix ? <span className="text-lg text-app-muted">{suffix}</span> : null}
          </p>
          {helper ? <p className="mt-1 text-xs text-app-muted">{helper}</p> : null}
        </div>
        {Icon ? (
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-lg text-brand-600">
            <Icon />
          </span>
        ) : null}
      </div>
    </article>
  );
}
