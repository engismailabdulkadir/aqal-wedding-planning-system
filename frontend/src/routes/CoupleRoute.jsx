import ProtectedRoute from './ProtectedRoute.jsx';

function CoupleRoute() {
  return <ProtectedRoute allowedRoles={['groom', 'bride', 'customer']} />;
}

export default CoupleRoute;
