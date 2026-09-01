import ProtectedRoute from './ProtectedRoute.jsx';

// Route gaar ah oo loogu talagalay Wedding Planner
function PlannerRoute() {
  return (
    <ProtectedRoute
      allowedRoles={[
        'wedding_planner',
        'planner',
      ]}
    />
  );
}

export default PlannerRoute;