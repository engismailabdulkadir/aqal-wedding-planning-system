import AppRoutes from './routes/AppRoutes.jsx';
import DocumentTitle from './components/layout/DocumentTitle.jsx';
import RouteErrorBoundary from './components/routing/RouteErrorBoundary.jsx';

function App() {
  return (
    <RouteErrorBoundary>
      <DocumentTitle />
      <AppRoutes />
    </RouteErrorBoundary>
  );
}

export default App;

