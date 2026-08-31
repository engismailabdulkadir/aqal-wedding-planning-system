import ProtectedRoute from './ProtectedRoute.jsx';

function PlannerRoute() {
  return <ProtectedRoute allowedRoles={['wedding_planner', 'planner']} />;
}

export default PlannerRoute;
