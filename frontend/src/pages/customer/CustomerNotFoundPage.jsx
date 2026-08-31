import { Link } from 'react-router-dom';

export default function CustomerNotFoundPage() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-stone-900">Page not found</h1>
      <p className="mt-3 text-stone-600">This customer page hasn’t been planned yet.</p>
      <Link to="/dashboard" className="mt-6 inline-flex rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">Back to Dashboard</Link>
    </div>
  );
}
