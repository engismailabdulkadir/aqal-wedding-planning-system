export default function DataCard({ title, children, action, className = '' }) {
  return (
    <section className={`rounded-2xl border border-app-border bg-app-surface p-6 shadow-sm ${className}`}>
      {(title || action) ? (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title ? <h2 className="text-lg font-semibold text-app-text">{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}
