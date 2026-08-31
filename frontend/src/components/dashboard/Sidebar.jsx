import { useState } from 'react';
import CollapsibleSidebarNav from '../navigation/CollapsibleSidebarNav.jsx';
import SidebarBrand from '../navigation/SidebarBrand.jsx';
import { coupleNav } from '../navigation/navConfigs.js';

function Sidebar({ open, onClose }) {
  const [menuQuery, setMenuQuery] = useState('');

  return (
    <>
      {open && <button type="button" className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm lg:hidden" onClick={onClose} aria-label="Close sidebar overlay" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-x-hidden wp-sidebar-shell transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarBrand
          homeTo="/dashboard"
          searchValue={menuQuery}
          onSearchChange={setMenuQuery}
          onCloseMobile={onClose}
        />
        <CollapsibleSidebarNav
          items={coupleNav}
          workspaceLabel="Our Wedding"
          filterQuery={menuQuery}
          onNavigate={onClose}
        />
      </aside>
    </>
  );
}

export default Sidebar;
