import { FiCheck } from 'react-icons/fi';

export default function ThemeOption({
  label,
  description,
  icon: Icon,
  active = false,
  onSelect,
}) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active
          ? 'bg-brand-50 text-brand-800'
          : 'text-app-text hover:bg-app-inset'
      }`}
    >
      <span className={`grid h-9 w-9 place-items-center rounded-full ${
        active ? 'bg-brand-100 text-brand-700' : 'bg-app-inset text-app-muted'
      }`}>
        <Icon className="text-lg" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {description ? <span className="mt-0.5 block text-xs text-app-muted">{description}</span> : null}
      </span>
      {active ? <FiCheck className="shrink-0 text-brand-600" aria-hidden /> : <span className="w-4" />}
    </button>
  );
}
