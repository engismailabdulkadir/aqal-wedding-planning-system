import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { useActiveWedding } from '../../hooks/useActiveWedding.js';
import { buildWeddingEditPath, parseReturnTo } from '../../utils/returnTo.js';
import { isCoupleRole } from '../../utils/roles.js';

function buildAuthLink(path, returnPath) {
  const safe = parseReturnTo(returnPath) || returnPath;
  if (!safe) return path;
  return `${path}?returnTo=${encodeURIComponent(safe)}`;
}

/**
 * Wraps couple-only booking actions (cart, selections, appointments).
 */
export default function BookingAccessGate({ children }) {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { activeWedding, activeWeddingId, weddings, loading: weddingLoading } = useActiveWedding();
  const location = useLocation();
  const returnPath = location.pathname;

  if (authLoading || weddingLoading) {
    return <p className="text-sm text-stone-500">Loading…</p>;
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm text-stone-600">Please register or log in to book this service.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to={buildAuthLink('/register', returnPath)}
            className="rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Register
          </Link>
          <Link
            to={buildAuthLink('/login', returnPath)}
            className="rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (!isCoupleRole(user?.role)) {
    return (
      <p className="text-sm text-amber-900">
        Only registered bride or groom accounts can book wedding services.
      </p>
    );
  }

  if (!weddings.length) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm text-stone-600">Create your wedding to start booking vendors.</p>
        <Link
          to={buildAuthLink('/weddings/new', returnPath)}
          className="mt-3 inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Create Wedding
        </Link>
      </div>
    );
  }

  if (!activeWedding?.weddingDate) {
    return (
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm text-stone-600">Set your wedding date before making bookings.</p>
        <Link
          to={buildWeddingEditPath(activeWeddingId, { returnTo: returnPath, focus: 'weddingDate' })}
          className="mt-3 inline-flex rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Set Wedding Date
        </Link>
      </div>
    );
  }

  return children;
}
