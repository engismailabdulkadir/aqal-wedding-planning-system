import { FiSearch } from 'react-icons/fi';

const selectClass = 'rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100';

function GuestFilters({ search, category, side, onSearch, onCategory, onSide }) {
  return <div className="grid gap-3 lg:grid-cols-[1fr_220px_200px]"><label className="relative"><span className="sr-only">Search guests</span><FiSearch className="absolute left-4 top-3.5 text-stone-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} className="w-full rounded-xl border border-stone-200 py-3 pl-11 pr-4 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100" placeholder="Search guests by name, phone, or email…" /></label><select aria-label="Filter by category" value={category} onChange={(event) => onCategory(event.target.value)} className={selectClass}><option value="all">All Categories</option><option value="family">Family</option><option value="friend">Friend</option><option value="relative">Relative</option><option value="colleague">Colleague</option><option value="vip">VIP</option><option value="other">Other</option></select><select aria-label="Filter by side" value={side} onChange={(event) => onSide(event.target.value)} className={selectClass}><option value="all">All Sides</option><option value="partner1">Partner 1</option><option value="partner2">Partner 2</option><option value="shared">Shared</option></select></div>;
}
export default GuestFilters;
