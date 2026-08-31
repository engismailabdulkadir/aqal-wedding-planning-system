import ProtectedRoute from './ProtectedRoute.jsx';

/** Role-specific route guard — use as a Route element with `role` prop. */
function RoleRoute({ role }) {
  return <ProtectedRoute allowedRole={role} />;
}

export default RoleRoute;
