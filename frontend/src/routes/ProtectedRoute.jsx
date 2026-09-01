import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';
import { userHasRole } from '../utils/roles.js';

// Route ilaalinaya pages-ka u baahan login iyo role gaar ah
function ProtectedRoute({ allowedRole, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();

  // Haddii hal role la bixiyay, array ka samee
  const roles =
    allowedRoles ||
    (allowedRole ? [allowedRole] : null);

  // Inta session-ka la xaqiijinayo loading muuji
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div
          className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600"
          aria-label="Loading session"
        />
      </div>
    );
  }

  // Haddii user-ku login ahayn, Login page u dir
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Haddii role-ku aanu oggolayn page-kan, Forbidden page muuji
  if (roles && !userHasRole(user.role, roles)) {
    return <ForbiddenPage />;
  }

  // Haddii wax walba sax yihiin, route-ka child-ka fur
  return <Outlet />;
}

export default ProtectedRoute;