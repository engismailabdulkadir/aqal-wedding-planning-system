import { FiSearch } from 'react-icons/fi';
import { fieldClass } from './FormField.jsx';

export default function SearchBar({ value, onChange, placeholder = 'Search', className = '' }) {
  return (
    <label className={`relative block ${className}`}>
      <FiSearch className="absolute left-3 top-3.5 text-app-muted" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${fieldClass} pl-10`} />
    </label>
  );
}

export function FilterBar({ children }) {
  return <div className="mt-7 grid gap-3 rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm md:grid-cols-4">{children}</div>;
}
