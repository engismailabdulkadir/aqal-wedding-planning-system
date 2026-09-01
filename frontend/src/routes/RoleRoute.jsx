import ProtectedRoute from './ProtectedRoute.jsx';

/**
 * Route gaar u ah role.
 *
 * Tusaale:
 * <RoleRoute role="admin" />
 *
 * Waxaa loo isticmaalaa in page gaar ah
 * loogu oggolaado role gaar ah.
 */
function RoleRoute({ role }) {
  return <ProtectedRoute allowedRole={role} />;
}

export default RoleRoute;