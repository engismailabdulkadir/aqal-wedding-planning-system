import { useAuth } from '../../hooks/useAuth.js';
import DashboardLayout from '../dashboard/DashboardLayout.jsx';
import AppLayout from '../layout/AppLayout.jsx';

export default function CatalogLayout() {
  const { user, loading, isAuthenticated } = useAuth();
  if (loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-100 border-t-brand-600" aria-label="Loading session" />
      </div>
    );
  }
  if (isAuthenticated && user?.role === 'customer') return <DashboardLayout />;
  return <AppLayout />;
}
