import { Link } from 'react-router-dom';

function NotFoundPage() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 text-center">
      <p className="font-semibold text-brand-600">404</p>
      <h1 className="mt-3 text-4xl font-bold text-stone-900">Page not found</h1>
      <p className="mt-4 text-stone-600">The page you’re looking for hasn’t been planned yet.</p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <Link className="font-semibold text-brand-700 hover:text-brand-900" to="/">Return home</Link>
        <Link className="rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white" to="/dashboard">Back to Dashboard</Link>
      </div>
    </section>
  );
}

export default NotFoundPage;

