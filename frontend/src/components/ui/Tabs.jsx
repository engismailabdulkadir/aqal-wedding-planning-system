export default function Tabs({ items, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const key = item.value || item;
        const label = item.label || item;
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${active ? 'bg-brand-600 text-white shadow-sm' : 'border border-app-border bg-app-surface text-app-muted hover:bg-brand-50 hover:text-brand-700'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
