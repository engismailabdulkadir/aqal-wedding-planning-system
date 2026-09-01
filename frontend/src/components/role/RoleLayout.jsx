import { useState } from 'react';
import { FiMenu } from 'react-icons/fi';
import { Outlet, useLocation } from 'react-router-dom';
import CollapsibleSidebarNav from '../navigation/CollapsibleSidebarNav.jsx';
import SidebarBrand from '../navigation/SidebarBrand.jsx';
import GlobalHeaderActions from '../layout/GlobalHeaderActions.jsx';
import {
  adminNav,
  plannerNav,
  vendorNav,
} from '../navigation/navConfigs.js';

// Navigation menus-ka roles-ka kala duwan
const menus = {
  admin: adminNav,
  planner: plannerNav,
  vendor: vendorNav,
};

// Magaca workspace-ka role kasta
const workspaceLabels = {
  admin: 'Admin workspace',
  planner: 'Planner workspace',
  vendor: 'Vendor workspace',
};

// Home/dashboard path-ka role kasta
const homePaths = {
  admin: '/admin/dashboard',
  planner: '/planner/dashboard',
  vendor: '/vendor/dashboard',
};

// URL path-ka ka samee page title
function titleFromPath(pathname, role) {
  // Qaybta ugu dambeysa ee URL-ka hel
  const chunk =
    pathname
      .split('/')
      .filter(Boolean)
      .pop() || 'dashboard';

  // Dashboard title
  if (
    chunk === role ||
    chunk === 'dashboard'
  ) {
    return 'Dashboard';
  }

  // Profile title
  if (
    chunk === 'profile' ||
    chunk === 'account'
  ) {
    return 'My Profile';
  }

  // Hyphen-ka space ugu beddel
  return chunk
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// Layout-ka Admin, Planner iyo Vendor
export default function RoleLayout({
  role,
}) {
  // Mobile sidebar open/close
  const [open, setOpen] = useState(false);

  // Sidebar search query
  const [menuQuery, setMenuQuery] =
    useState('');

  // Current route
  const location = useLocation();

  // Menu-ga role-ka hadda
  const items = menus[role];

  // Page title
  const pageTitle = titleFromPath(
    location.pathname,
    role
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-app-bg">

      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm lg:hidden"
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-x-hidden wp-sidebar-shell transition-transform duration-200 lg:translate-x-0 ${
          open
            ? 'translate-x-0'
            : '-translate-x-full'
        }`}
      >

        {/* Sidebar brand */}
        <SidebarBrand
          homeTo={homePaths[role]}
          searchValue={menuQuery}
          onSearchChange={setMenuQuery}
          onCloseMobile={() =>
            setOpen(false)
          }
        />

        {/* Sidebar navigation */}
        <CollapsibleSidebarNav
          items={items}
          workspaceLabel={
            workspaceLabels[role]
          }
          filterQuery={menuQuery}
          onNavigate={() =>
            setOpen(false)
          }
        />
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">

        {/* Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-app-border bg-app-header px-4 sm:px-7">

          <div className="flex min-w-0 items-center gap-3">

            {/* Mobile menu button */}
            <button
              type="button"
              onClick={() =>
                setOpen(true)
              }
              className="rounded-xl border border-app-border p-2.5 lg:hidden"
              aria-label="Open menu"
            >
              <FiMenu />
            </button>

            <div className="min-w-0">

              {/* Page title */}
              <h1 className="truncate text-lg font-semibold text-app-text">
                {pageTitle}
              </h1>

              {/* Workspace label */}
              <p className="hidden text-xs text-app-muted sm:block">
                {role === 'planner'
                  ? 'Wedding Planner'
                  : role}{' '}
                workspace
              </p>
            </div>
          </div>

          {/* Header actions */}
          <GlobalHeaderActions
            className="ml-auto"
          />
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}