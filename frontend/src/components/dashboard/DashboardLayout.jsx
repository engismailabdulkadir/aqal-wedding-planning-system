import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { CartProvider } from '../../context/CartContext.jsx';
import RouteErrorBoundary from '../routing/RouteErrorBoundary.jsx';
import DashboardHeader from './DashboardHeader.jsx';
import Sidebar from './Sidebar.jsx';

function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <CartProvider>
      <div className="min-h-screen bg-app-bg">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-72">
        <DashboardHeader onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="p-4 sm:p-6 lg:p-8">
          <RouteErrorBoundary>
            {children ?? <Outlet />}
          </RouteErrorBoundary>
        </main>
      </div>
    </div>
    </CartProvider>
  );
}

export default DashboardLayout;
