import ProtectedRoute from './ProtectedRoute.jsx';

// Route loogu talagalay labada qof ee arooska:
// Groom, Bride iyo legacy customer
function CoupleRoute() {
  return (
    <ProtectedRoute
      allowedRoles={[
        'groom',
        'bride',
        'customer',
      ]}
    />
  );
}

export default CoupleRoute;