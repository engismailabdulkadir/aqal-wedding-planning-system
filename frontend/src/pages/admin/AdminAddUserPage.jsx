import { Navigate } from 'react-router-dom';

/** Sidebar "Add User" opens the create modal on Manage Users. */
export default function AdminAddUserPage() {
  return <Navigate to="/admin/users/manage?add=1" replace />;
}
