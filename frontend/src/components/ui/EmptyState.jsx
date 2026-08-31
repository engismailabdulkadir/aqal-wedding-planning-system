import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

export default function EmptyState({ icon: Icon, title, description, action, to, onClick }) {
  return (
    <div className="rounded-2xl border border-dashed border-brand-200 bg-gradient-to-br from-app-surface to-brand-50/70 p-7 text-center sm:p-10">
      {Icon ? <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-app-surface text-xl text-brand-600 shadow-card"><Icon /></span> : null}
      <h2 className="mt-5 font-display text-2xl font-semibold text-app-text">{title}</h2>
      {description ? <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-app-muted">{description}</p> : null}
      {action && to ? (
        <Link to={to} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          {action}<FiArrowRight />
        </Link>
      ) : null}
      {action && onClick ? (
        <button type="button" onClick={onClick} className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700">
          {action}
        </button>
      ) : null}
    </div>
  );
}
