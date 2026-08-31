export default function FormField({ label, children, hint }) {
  return (
    <label className="block text-sm font-medium text-app-text">
      {label}
      <span className="mt-1 block">{children}</span>
      {hint ? <span className="mt-1 block text-xs font-normal text-app-muted">{hint}</span> : null}
    </label>
  );
}

export const fieldClass = 'w-full rounded-xl border border-app-border bg-app-inset px-4 py-3 text-sm text-app-text outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100';
