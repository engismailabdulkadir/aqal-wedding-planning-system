import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import ForbiddenPage from '../pages/ForbiddenPage.jsx';
import { userHasRole } from '../utils/roles.js';

function ProtectedRoute({ allowedRole, allowedRoles }) {
  const { user, loading, isAuthenticated } = useAuth();
  const roles = allowedRoles || (allowedRole ? [allowedRole] : null);

  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" aria-label="Loading session" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && !userHasRole(user.role, roles)) return <ForbiddenPage />;
  return <Outlet />;
}

export default ProtectedRoute;
